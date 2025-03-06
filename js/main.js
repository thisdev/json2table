// Helper function: Formats values for table display
function formatValue(value) {
    if (Array.isArray(value)) {
        return `<ul contenteditable="true" class="array-list">${value.map(v => `<li>${v}</li>`).join('')}</ul>`;
    }
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    return value;
}

// Helper function: Converts values back to their original type
function parseValue(value) {
    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    if (value.startsWith('<ul') && value.endsWith('</ul>')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(value, 'text/html');
        return Array.from(doc.querySelectorAll('.array-list li')).map(li => parseValue(li.textContent));
    }
    if (!isNaN(value) && value.trim() !== '') return Number(value);
    return value;
}

// Helper function: Sets nested values in an object
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

// Generates nested table HTML
function generateNestedTable(data, prefix = '') {
    let table = '<table><tr>';
    const keys = Object.keys(data);
    table += keys.map(key => `<th>${prefix}${key}</th>`).join('') + '</tr><tr>';
    keys.forEach(key => {
        const value = data[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            table += `<td><div class="nested">${generateNestedTable(value, `${key}.`)}</div></td>`;
        } else {
            table += `<td contenteditable="true">${formatValue(value)}</td>`;
        }
    });
    return table + '</tr></table>';
}

// Pagination and table rendering
function renderTable(data, page = 1, perPage = 50) {
    const tableContainer = document.getElementById('tableContainer');
    const pagination = document.getElementById('pagination');
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedData = data.slice(start, end);
    
    let html = '';
    paginatedData.forEach((item, idx) => {
        html += `<div class="table-wrapper">${generateNestedTable(item)}</div>`;
    });
    tableContainer.innerHTML = html;

    // Pagination controls
    pagination.innerHTML = '';
    if (data.length > perPage) {
        const totalPages = Math.ceil(data.length / perPage);
        pagination.innerHTML = `
            <button ${page === 1 ? 'disabled' : ''} onclick="renderTable(window.currentData, ${page - 1})">Prev</button>
            <span>Page ${page} of ${totalPages}</span>
            <button ${page === totalPages ? 'disabled' : ''} onclick="renderTable(window.currentData, ${page + 1})">Next</button>
        `;
    }
}

// Toggle save/export buttons and email field visibility
function toggleButtons(show) {
    const buttons = ['saveFormattedBtn', 'saveMinifiedBtn', 'exportCsvBtn'];
    buttons.forEach(id => document.getElementById(id).style.display = show ? 'inline-block' : 'none');
}

// Convert JSON to table
function convertToTable() {
    const jsonInput = document.getElementById('jsonInput');
    const errorDiv = document.getElementById('error');
    
    try {
        const data = JSON.parse(jsonInput.value);
        window.currentData = Array.isArray(data) ? data : [data];
        window.originalStructure = data;
        renderTable(window.currentData);
        errorDiv.textContent = '';
        toggleButtons(true);
    } catch (error) {
        errorDiv.textContent = `Error at position ${error.message.match(/\d+/) || 'unknown'}: ${error.message}`;
        document.getElementById('tableContainer').innerHTML = '';
        toggleButtons(false);
    }
}

// Save changes back to JSON
function saveChanges(formatted) {
    const tables = document.querySelectorAll('.table-wrapper table');
    if (!tables.length || !window.originalStructure) {
        document.getElementById('error').textContent = 'No table or original JSON available';
        return;
    }

    const updatedArray = Array.from(tables).map(table => parseNestedTable(table, ''));
    const result = Array.isArray(window.originalStructure) ? updatedArray : updatedArray[0];
    document.getElementById('jsonInput').value = JSON.stringify(result, null, formatted ? 2 : null);
}

// Parse nested tables recursively with full path
function parseNestedTable(table, prefix = '') {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.replace(prefix, ''));
    const cells = Array.from(table.querySelectorAll('td'));
    const obj = {};

    headers.forEach((header, index) => {
        const cell = cells[index];
        if (cell.querySelector('.nested')) {
            const nestedTable = cell.querySelector('table');
            const nestedValue = parseNestedTable(nestedTable, `${header}.`);
            setNestedValue(obj, header, nestedValue);
        } else {
            const value = parseValue(cell.innerHTML);
            setNestedValue(obj, header, value);
        }
    });

    return obj;
}

// Enhanced value parser for arrays and objects
function parseValue(value) {
    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
    if (value.startsWith('<ul') && value.endsWith('</ul>')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(value, 'text/html');
        return Array.from(doc.querySelectorAll('.array-list li')).map(li => parseValue(li.textContent));
    }
    if (!isNaN(value) && value.trim() !== '') return Number(value);
    return value;
}

// Set nested value with array support
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPart = parts[i + 1];
        if (!(part in current)) {
            current[part] = /^\d+$/.test(nextPart) ? [] : {};
        }
        current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (Array.isArray(current) && /^\d+$/.test(lastPart)) {
        current[parseInt(lastPart)] = value;
    } else {
        current[lastPart] = value;
    }
}

// Export to CSV with payment check
function exportToCSV() {
    const errorDiv = document.getElementById('error');
    const premiumSection = document.getElementById('premiumSection');
    const kofiLink = document.getElementById('kofiLink');
    const email = document.getElementById('userEmail').value;

    if (!window.currentData) {
        errorDiv.textContent = 'No data to export!';
        return;
    }

    premiumSection.style.display = 'block';

    if (!email) {
        errorDiv.textContent = 'Please enter your email to proceed!';
        kofiLink.style.display = 'none';
        return;
    }

    // Set Ko-fi link with email and return URL
    kofiLink.href = `https://ko-fi.com/s/453f86f84a?email=${encodeURIComponent(email)}&return_url=${encodeURIComponent(window.location.origin + '/success.php?email=' + encodeURIComponent(email))}`;
    kofiLink.style.display = 'inline';

    // Check payment status via fetch
    fetch(`/check_payment.php?email=${encodeURIComponent(email)}`)
        .then(response => response.json())
        .then(data => {
            if (data.paid) {
                // Flatten nested objects for CSV export
                const flatten = (obj, prefix = '') => {
                    const result = {};
                    for (const [key, value] of Object.entries(obj)) {
                        const newKey = prefix ? `${prefix}.${key}` : key;
                        if (value && typeof value === 'object' && !Array.isArray(value)) {
                            Object.assign(result, flatten(value, newKey));
                        } else {
                            result[newKey] = value;
                        }
                    }
                    return result;
                };
                const flatData = window.currentData.map(item => flatten(item));
                const columns = [...new Set(flatData.flatMap(Object.keys))];
                const csv = [columns.join(',')];
                flatData.forEach(obj => csv.push(columns.map(col => `"${(obj[col] || '').toString().replace(/"/g, '""')}"`).join(',')));
                
                // Create and download CSV file
                const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'table.csv';
                a.click();
                errorDiv.textContent = '';
                premiumSection.style.display = 'none';
            } else if (data.status === 'pending') {
                errorDiv.innerHTML = 'Payment pending. Please complete your purchase on Ko-fi and return here. <br>Issues? Email <a href="mailto:support@bitlager.de">support@bitlager.de</a>.';
            } else {
                errorDiv.textContent = 'Email not registered. Please complete payment via Ko-fi!';
            }
        })
        .catch(error => errorDiv.textContent = 'Error: ' + error.message);
}

// Filter table
function filterTable() {
    const filter = document.getElementById('filterInput').value.toLowerCase().trim();
    const cells = document.querySelectorAll('.table-wrapper td');
    
    if (filter === '') {
        cells.forEach(cell => {
            cell.classList.remove('filtered', 'highlight');
        });
        return;
    }

    cells.forEach(cell => {
        const text = cell.textContent.toLowerCase();
        if (text.includes(filter)) {
            cell.classList.remove('filtered');
            cell.classList.add('highlight');
        } else {
            cell.classList.add('filtered');
            cell.classList.remove('highlight');
        }
    });

    // Filter nested tables
    const nestedCells = document.querySelectorAll('.nested td');
    nestedCells.forEach(cell => {
        const text = cell.textContent.toLowerCase();
        if (text.includes(filter)) {
            cell.classList.remove('filtered');
            cell.classList.add('highlight');
            cell.closest('.table-wrapper').style.display = '';
        } else {
            cell.classList.add('filtered');
            cell.classList.remove('highlight');
        }
    });
}

// Toggle Theme
function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('light-mode')) {
        html.classList.remove('light-mode');
        html.classList.add('dark-mode');
        document.getElementById('toggleThemeBtn').textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        html.classList.remove('dark-mode');
        html.classList.add('light-mode');
        document.getElementById('toggleThemeBtn').textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Drag-and-Drop handling
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const jsonInput = document.getElementById('jsonInput');
    const errorDiv = document.getElementById('error');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (event) => {
                jsonInput.value = event.target.result;
                convertToTable();
            };
            reader.onerror = () => {
                errorDiv.textContent = 'Error reading file';
            };
            reader.readAsText(file);
        } else {
            errorDiv.textContent = 'Please drop a valid JSON file';
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('jsonInput');
    jsonInput.value = '';
    jsonInput.placeholder = `Place your JSON here or drag & drop a .json file...
    
Offline JSON2Table editor tool:
- handles JSON arrays, nested objects
- converts JSON to editable table 
- edit table and save as formatted or minified JSON`;

    toggleButtons(false);
    setupDragAndDrop();

    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark-mode');
        document.getElementById('toggleThemeBtn').textContent = '☀️';
    }

    jsonInput.addEventListener('input', () => {
        if (!jsonInput.value) {
            document.getElementById('tableContainer').innerHTML = '';
            document.getElementById('pagination').innerHTML = '';
            toggleButtons(false);
            document.getElementById('error').textContent = '';
            window.currentData = null;
        }
    });

    document.getElementById('convertBtn').addEventListener('click', convertToTable);
    document.getElementById('saveFormattedBtn').addEventListener('click', () => saveChanges(true));
    document.getElementById('saveMinifiedBtn').addEventListener('click', () => saveChanges(false));
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
    document.getElementById('toggleThemeBtn').addEventListener('click', toggleTheme);

    const filterInput = document.getElementById('filterInput');
    if (filterInput) {
        filterInput.addEventListener('input', filterTable);
    } else {
        console.error('Filter input element not found!');
    }

    // Reset BMC link and error on email input
    document.getElementById('userEmail').addEventListener('input', () => {
        document.getElementById('error').textContent = '';
        document.getElementById('bmcLink').style.display = 'none';
    });

    document.getElementById('sampleJsonBtn').addEventListener('click', () => {
        const sampleJson = [
            {
                "id": 1,
                "product": {
                    "name": "UltraBook Pro X1",
                    "brand": "TechTrend",
                    "category": "Electronics",
                    "specifications": {
                        "cpu": "Intel i7-12700H",
                        "ram": "16GB",
                        "storage": {
                            "type": "SSD",
                            "capacity": 512,
                            "unit": "GB"
                        },
                        "display": {
                            "size": 15.6,
                            "resolution": "2560x1440",
                            "type": "OLED"
                        }
                    }
                },
                "price": {
                    "amount": 1499.99,
                    "currency": "USD",
                    "discount": {
                        "active": true,
                        "percentage": 15,
                        "expires": "2025-12-31"
                    }
                },
                "stock": {
                    "available": true,
                    "quantity": 25,
                    "locations": [
                        {
                            "warehouse": "WH-01",
                            "city": "New York",
                            "stock": 10
                        },
                        {
                            "warehouse": "WH-02",
                            "city": "Los Angeles",
                            "stock": 15
                        }
                    ]
                },
                "reviews": [
                    {
                        "user": "john_doe",
                        "rating": 4.5,
                        "comment": "Great performance, but battery life could be better.",
                        "date": "2025-01-15"
                    },
                    {
                        "user": "jane_smith",
                        "rating": 5,
                        "comment": "Love the display quality!",
                        "date": "2025-02-01"
                    }
                ],
                "tags": ["laptop", "high-performance", "portable"],
                "active": true
            },
            {
                "id": 2,
                "product": {
                    "name": "SmartHome Hub",
                    "brand": "HomeSync",
                    "category": "Smart Devices",
                    "specifications": {
                        "connectivity": ["WiFi", "Bluetooth", "Zigbee"],
                        "power": "5V USB-C",
                        "compatibility": {
                            "platforms": ["Alexa", "Google Home"],
                            "devices": 50
                        }
                    }
                },
                "price": {
                    "amount": 129.50,
                    "currency": "EUR",
                    "discount": {
                        "active": false,
                        "percentage": 0,
                        "expires": null
                    }
                },
                "stock": {
                    "available": false,
                    "quantity": 0,
                    "locations": []
                },
                "reviews": [],
                "tags": ["smart-home", "iot", "automation"],
                "active": false
            }
        ];
        document.getElementById('jsonInput').value = JSON.stringify(sampleJson, null, 2);
    });
});

// Show Ko-fi link only when email is entered
document.getElementById('userEmail').addEventListener('input', () => {
    const email = document.getElementById('userEmail').value;
    document.getElementById('kofiLink').style.display = email ? 'inline' : 'none';
    document.getElementById('error').textContent = '';
});

// Auto-check payment status on page load if email is in URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
        document.getElementById('userEmail').value = email;
        exportToCSV(); // Trigger payment check automatically
    }
});