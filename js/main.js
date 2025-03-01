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

// Toggle save/export buttons visibility
function toggleButtons(show) {
    const buttons = ['saveFormattedBtn', 'saveMinifiedBtn', 'exportCsvBtn'];
    buttons.forEach(id => {
        document.getElementById(id).style.display = show ? 'inline-block' : 'none';
    });
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

    const updatedArray = Array.from(tables).map(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
        const cells = Array.from(table.querySelectorAll('td'));
        const obj = {};
        let cellIndex = 0;
        headers.forEach(header => {
            const cell = cells[cellIndex];
            const value = cell.querySelector('.nested') ? parseNestedTable(cell.querySelector('table')) : parseValue(cell.innerHTML);
            setNestedValue(obj, header, value);
            cellIndex++;
        });
        return obj;
    });

    const result = Array.isArray(window.originalStructure) ? updatedArray : updatedArray[0];
    document.getElementById('jsonInput').value = JSON.stringify(result, null, formatted ? 2 : null);
}

// Helper function to parse nested tables
function parseNestedTable(table) {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.split('.').pop());
    const cells = Array.from(table.querySelectorAll('td'));
    const obj = {};
    let cellIndex = 0;
    headers.forEach(header => {
        const cell = cells[cellIndex];
        const value = cell.querySelector('.nested') ? parseNestedTable(cell.querySelector('table')) : parseValue(cell.innerHTML);
        obj[header] = value;
        cellIndex++;
    });
    return obj;
}

// Export to CSV
function exportToCSV() {
    const data = window.currentData;
    if (!data) return;

    const flatten = (obj, prefix = '') => {
        const result = {};
        Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                Object.assign(result, flatten(obj[key], fullKey));
            } else {
                result[fullKey] = JSON.stringify(obj[key]);
            }
        });
        return result;
    };

    const flatData = data.map(item => flatten(item));
    const columns = [...new Set(flatData.flatMap(Object.keys))];
    const csv = [columns.join(',')];
    flatData.forEach(obj => {
        csv.push(columns.map(col => obj[col] || '').join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table.csv';
    a.click();
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

    // Untertabellen ebenfalls filtern
    const nestedCells = document.querySelectorAll('.nested td');
    nestedCells.forEach(cell => {
        const text = cell.textContent.toLowerCase();
        if (text.includes(filter)) {
            cell.classList.remove('filtered');
            cell.classList.add('highlight');
            // Eltern-Tabelle sichtbar machen
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
- edit table and save as formatted or minified JSON

Example:
{"name":"Max Mustermann","alter":30,"stadt":"Berlin","hobbys":["Lesen","Sport","Kochen"],"aktiv":true}`;

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
        console.error('Filter-Input-Element nicht gefunden!');
    }
});