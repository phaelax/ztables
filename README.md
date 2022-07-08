# ztables
jquery plugin to enhance html tables

## Basic Usage:
```
var table = $('#mytable').ZTable();
```

**With parameters:**
```
var table = $('#mytable').ZTable({
		pagination: true,
		wrap: false,
		pageSize: 25,
		//render: {id:renderId, active:renderActive, gender:renderGender, test:renderRandom, rating:renderRating},
		controls:{
			paginate: true,
			status: true,
			copy: true,
			colVis: true
		}
});
```

## Table Controls
These are the available controls that can be displayed and are all on by default. Values are either true to show the control or false to hide them.

- **paginate**
  - The page number buttons shown in the lower right corner
- **status**
  - The lower left text indicating shown results
- **copy**
  - A copy button shown along the top control panel. The table will be copied to the clipboard in a CSV format.
- **colVis**
  - Dropdown for showing/hiding columns
- **pageSize**
  - Dropdown for selecting page size
- **filter**
  - Displays a search box
 
 
 ## Other Basic Parameters
 
 - **pagination**
   - Default is true. If false, the entire table is displayed
 - **pageSize**
   - Default is 10. Number of rows to display per page. If 10,25,50,100 is set, the pageSize dropdown will show the proper selection.
 - **wrap**
   - Default is true. When set to false, table cells have the 'nowrap' attribute applied.


## Custom Renderers
ZTables allows you to pass your data through a customer renderer before it is displayed. 

This example will pass the first column (0) through the *turngreen* function. 
```
function turngreen(value, colIndex, rowIndex, data){
  return '<span style="color:green">'+value+'</span>'; 
}

var table = $('#mytable').ZTable({
  render: {0:turngreen}
});
```

The render function has 4 parameters:
- **value**
  - The cell's raw value
- **colIndex**
  - The column index of this cell
- **rowIndex**
  - The row index containing this cell
- **data**
  - An object containing the values of all columns in that row, keys being the column IDs.

When building a ZTable from an existing html table of data, column IDs will simply be numbered starting with 0 if no ID value is set on the `TH` tags. You can specify IDs when building from a JSON file.


## Building From JSON
You can build your table data and column headers from JSON. Here's an example loading the table using an ajax call to get the json.

```
$.ajax({
  dataType: "json",
  url: "myData.json",
  success: function(data){
    table.buildFromJSON(data);
  }
});
```

The JSON format is as follows:
```
{
  "columns":[
    {"col1":"First Column"},
    {"col2":"Second Column"}
    {"col3":"Third Column"}
  ],
  "data":[
    {"col1":"some value", "col2":"more data", "col3":"a yellow bus"},
    {"col1":"some value", "col2":"less data", "col3":"a green bus"}
  ]
}
```

When mixing JSON and existing table data, column IDs must be the same. If none are specified in the `TH` tags, the json should define the columns 
numerically otherwise the existing data embedded within the HTML will not display. If names are specified in the JSON, the `TH` **id** attributes should match.
