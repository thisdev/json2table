// Helper function: Flattens a nested object
function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(acc, flattenObject(obj[key], pre + key));
        } else {
            acc[pre + key] = obj[key];
        }
        return acc;
    }, {});
}

// Helper function: Formats values for table display
function formatValue(value) {
    if (Array.isArray(value)) return JSON.stringify(value);
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
        return value.slice(1, -1); // Remove quotes for strings
    }
    if (value.startsWith('[') && value.endsWith(']')) {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
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

// Main function: Generates HTML table
function generateTableHtml(columns, data) {
    let table = '<table><tr>';
    columns.forEach(column => {
        table += `<th>${column}</th>`;
    });
    table += '</tr>';

    data.forEach(obj => {
        table += '<tr>';
        columns.forEach(column => {
            const value = obj[column] !== undefined ? formatValue(obj[column]) : '';
            table += `<td contenteditable="true">${value}</td>`;
        });
        table += '</tr>';
    });

    return table + '</table>';
}

// Function to toggle save buttons visibility
function toggleSaveButtons(show) {
    const saveFormattedBtn = document.getElementById('saveFormattedBtn');
    const saveMinifiedBtn = document.getElementById('saveMinifiedBtn');
    
    saveFormattedBtn.style.display = show ? 'inline-block' : 'none';
    saveMinifiedBtn.style.display = show ? 'inline-block' : 'none';
}

// Main function: Converts JSON to table
function convertToTable() {
    const jsonInput = document.getElementById('jsonInput');
    const errorDiv = document.getElementById('error');
    const tableContainer = document.getElementById('tableContainer');

    try {
        const data = JSON.parse(jsonInput.value);
        window.originalStructure = data; // Store for later access

        // Create flattened version of the data
        const flatData = Array.isArray(data) ?
            data.map(item => flattenObject(item)) : [flattenObject(data)];

        // Collect all possible columns
        const columns = new Set();
        flatData.forEach(obj => {
            Object.keys(obj).forEach(key => columns.add(key));
        });

        tableContainer.innerHTML = generateTableHtml(Array.from(columns), flatData);
        errorDiv.textContent = '';
        
        // Show save buttons after successful conversion
        toggleSaveButtons(true);
    } catch (error) {
        errorDiv.textContent = 'Error: ' + error.message;
        tableContainer.innerHTML = '';
        // Hide save buttons if there's an error
        toggleSaveButtons(false);
    }
}

// Main function: Saves changes back to JSON
function saveChanges(formatted) {
    const table = document.querySelector('table');
    if (!table || !window.originalStructure) {
        document.getElementById('error').textContent = 'No table or original JSON available';
        return;
    }

    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);

    const updatedArray = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const obj = {};
        headers.forEach((header, index) => {
            const value = parseValue(cells[index].textContent);
            setNestedValue(obj, header, value);
        });
        return obj;
    });

    // Maintain original structure
    const result = Array.isArray(window.originalStructure) ? updatedArray : updatedArray[0];
    document.getElementById('jsonInput').value = JSON.stringify(result, null, formatted ? 2 : null);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    const jsonInput = document.getElementById('jsonInput');
    // Clear input field on page load
    jsonInput.value = '';
    jsonInput.placeholder = `Place your JSON here...
    
Offline JSON2Table editor tool:
- handles JSON arrays, nested objects
- converts JSON to editable table 
- edit table and save as formatted or minified JSON

Example:
{"name":"Max Mustermann","alter":30,"stadt":"Berlin","hobbys":["Lesen","Sport","Kochen"],"aktiv":true}`;

    // Hide save buttons initially
    toggleSaveButtons(false);

    // Reset everything when input is cleared
    jsonInput.addEventListener('input', function() {
        if (!this.value) {  // Direkter Check auf leeren String, ohne trim()
            document.getElementById('tableContainer').innerHTML = '';
            toggleSaveButtons(false);
            document.getElementById('error').textContent = '';
            window.originalStructure = null;  // Reset stored structure
        }
    });

    document.getElementById('convertBtn').addEventListener('click', convertToTable);
    document.getElementById('saveFormattedBtn').addEventListener('click', () => saveChanges(true));
    document.getElementById('saveMinifiedBtn').addEventListener('click', () => saveChanges(false));
});