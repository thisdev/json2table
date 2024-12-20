# JSON2Table

Convert JSON data to an editable table format, make your changes, and convert it back to JSON. A simple way to edit JSON data using a convenient table view.

## Demo

Try it out at [json2table.de](https://json2table.de)

![JSON2Table Demo](images/json2table-demo.png)

## Features

- Support for various JSON formats (simple objects, arrays, nested structures)
- Conversion of JSON into clear, editable tables
- Direct editing of all values in table cells
- Automatic data type detection during conversion back to JSON
- Save as formatted JSON (readable with indentation)
- Save as minified JSON (space-saving)
- Preservation of original JSON structure
- Offline functionality - no server connection required

## Usage

You can either:
- Use the online version at [json2table.de](https://json2table.de)
- Or run it locally:
  1. Clone the repository:
     ```bash
     git clone https://github.com/YourUsername/JSON2Table.git
     ```
  2. Open `index.html` in your web browser

No installation or setup required!

## Example

Input this JSON to test the functionality:
```json
{
  "name": "Max Mustermann",
  "alter": 30,
  "stadt": "Berlin",
  "hobbys": ["Lesen", "Sport", "Kochen"],
  "aktiv": true
}
```

## Contributing

Contributions are welcome! Feel free to:
- Submit suggestions via issues
- Create pull requests for improvements
- Share feedback

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---