(function ( $ ) {
	
	$.fn.ZTable = function(options) {
		
		this.addClass('ztable');
		
		var settings = $.extend(true,{
			pagination: true,
			pageSize: 10,
			filterHidden: false,
			wrap: true,
			render: {},
			controls: {
				paginate: true,
				pageSize: true,
				filter: true,
				status: true,
				colVis: true,
				copy: true
			},
			callbacks: {}
		}, options);
		
		
		
		var head = this.find('thead');
		var bod  = this.find('tbody');
		var pageNumber = 0;
		var pageCount = 0;
		var that = this;
		var dragSource = null;
		
		var __table = {columns: new Array(), rows: new Array(), columnIDs: new Array()};  // The table data
		var __filteredTable = new Array();  // Array of filtered table rows
		
		var status = $('<div class="ztable_status">');
		
		if (settings.controls.status) {
			var tableInfo = $('<span>').html('Showing 0 to 0 of 0 entries');
			status.append(tableInfo);
		}else{
			status.append('<span>');
		}
		
		//  Insert status panel after this table
		that.after(status);
		
		
		//  Panel of controls above the table
		if (settings.controls.pageSize || settings.controls.filter || settings.controls.copy){
			
			var zpanel = $('<div class="zpanel">');
			
			
			if (settings.controls.copy){
				zpanel.append($('<button>Copy</button>').css('order','1').click(function(){
					var el = $('<textarea>');
					el.attr('readonly', '');
					var toCopy = '';
					
					for(i=0;i<__table.columns.length;i++){
						toCopy += __table.columns[i].name + ',';
					}
					toCopy += '\n';
					
					for(r=0;r<__table.rows.length;r++){
						for(c=0;c<__table.columns.length;c++){
							toCopy += '"' + __table.rows[r][__table.columns[c].id] + '",';
						}
						toCopy += '\n';
					}
					
					el.val(toCopy);
					$(this).after(el);
					el.select();
					document.execCommand('copy');
					el.remove();
					
				}));
				
			}
			
			
			// Add the filter/search field
			if (settings.controls.filter){
				zpanel.append($('<input type="text" placeholder="search" style="order:42;margin-left:auto"/>').on("input", function(e){
					that.applyFilter(this.value);
				}));
			}
			
			// Page size selector
			if(settings.controls.pageSize){
				var d = $('<div style="order:2">');
				var s = $('<select name="pageSizeSelector">').change(function(e){
					that.setPageSize($(this).children(':selected').val());
				});
				
				let s10 = (settings.pageSize == 10)? "selected" : "";
				let s25 = (settings.pageSize == 25)? "selected" : "";
				let s50 = (settings.pageSize == 50)? "selected" : "";
				let s100 = (settings.pageSize == 100)? "selected" : "";
				
				s.append('<option value="10" '+s10+'>10</option>');
				s.append('<option value="25" '+s25+'>25</option>');
				s.append('<option value="50" '+s50+'>50</option>');
				s.append('<option value="100" '+s100+'>100</option>');

				d.append('<label for="pageSizeSelector" class="pageSizeSelector">Page Size &nbsp;</label>');
				d.append(s);

				
				zpanel.append(d);
				
				zpanel.find('#pageSizeSelector').change(function(e){
					g = $('#pageSizeSelector :selected').val();
					ztable.setPageSize(g);
				});
			
			}
			
			// Insert controls above this table
			this.before(zpanel);
		}
		
		
		
		
		/*
		 * Add the click event functionality to column headers to trigger sorting
		 */	
		function addSortToColumn(col){
			col.click(function(e){
				head.children(0).children().children().removeClass('order-select');  // Reset all the column order arrows
				colId = $(e.target).attr('data-id');  // Get column ID
				__table.columns[colId].sort = 1 - __table.columns[colId].sort;  // Determine sort order
				$(e.target).children(":nth-child("+(2-__table.columns[colId].sort)+")").addClass('order-select');  // Add class to show sort order
				that.sort($(e.target).attr('id'), __table.columns[colId].sort);  // Sort the data
			});
		}
		
		
		
		
		this.addColumn = function(id, displayName){
			let pos = __table.columns.length;
			__table.columns.push({id:id, name:displayName, pos:pos, sort:0, show:true});
			
			buildHeaders();
			
		}
		
		
		
		
		/**
		 * Filters the tables matching any row data that contains the filter string. (Case-insensitive)
		 *
		 *  @param {string} filter 
		 */
		this.applyFilter = function(filter){
			
			if ((typeof filter != 'undefined') && (filter != '')) {
				filter = filter.toLocaleLowerCase();
				__filteredTable = __table.rows.filter(function(row){
					for(key in row){
						if (row[key] != null){
							
							let col = __table.columns[getColPosById(key)];
							
							if (typeof col !== 'undefined' && (settings.filterHidden || col.show)){ 
								if (row[key].toString().toLocaleLowerCase().indexOf(filter) > -1) return true;
							}
						}
					}
					return false;
				});
			}else{
				__filteredTable = __table.rows;
			}

			// Displayed row count changes when filtered, recalculate pagination
			if (settings.pagination)  buildPagination();
			
			// Filter updated, reset to first page
			that.setPage(0);
			
		}
		


		/**
		 * 
		 */	
		this.getSettings = function(){
			return settings;
		}
		
		
		/**
		 * 
		 */	
		this.refresh = function(){
			this.setPage(pageNumber);
		}



		/**
		 * Inserts a new row into the table data given an array of values.
		 * Array elements should be in the order of the original columns (if any have been reordered)
		 * @param {array} data array of data for a single row to be added.
		 */	
		this.addRow = function(data){
			
			if (data instanceof Array){
				var row = {};
				data.forEach(function(item, index){
					var id = getColumnId(index);
					if (row != null) row[id] = item;
				});
				__table.rows.push(row);
			}else{
				__table.rows.push(data);
			}
			
		}



		this.deleteRow = function(index){
			return __filteredTable.splice(index, 1);
		}
		
		
		/**
		 *
		 * @return {object} Returns table row and column data
		 */	
		this.getTableData = function(){
			return __table;
		}
		
		
		
		/*
		 * Gets the ID associated with this column index
		 */	
		function getColumnId(index){
			for(i=0;i<__table.columns.length;i++){
				if (__table.columns[i].pos == index)
					return __table.columns[i].id;
			}
			return null;
		}
		
		
		
		function sanitize(str){
				var temp = document.createElement('div');
				temp.textContent = str;
				return temp.innerHTML;
		}
		
		
		/*
		 * Runs the cell's value through any assigned renderers
		 */	
		function renderCell(value, colIndex, rowIndex, rowData){
			cid = __table.columns[colIndex].id
			wrap = (settings.wrap)?'':' nowrap';
			if (typeof settings.render[cid] !== typeof undefined){
				return $('<td'+wrap+'>').html(settings.render[cid](sanitize(value), colIndex, rowIndex, rowData));
			}else{
				return $('<td'+wrap+'>').html(sanitize(value));
			}
		}
		

		
		/**
		 * @return {integer} Total number of pages based on page size
		 */		
		this.getPageCount = function(){
			return pageCount;
		}
		
		
		
		/**
		 * @return {integer} The current page number
		 */		
		this.getPage = function(){
			return pageNumber;
		}
		
		
		
		
		
		/**
		 * When pagination is true, updates the table to display the selected page.
		 * When pagination is false, rebuilds the table from the row data (in the event sorting)
		 *
		 * @param {integer} pgNum The page number
		 */		
		this.setPage = function(pgNum){
			
			let oldPageNumber = pageNumber;
			
			if (settings.pagination){
				if (settings.controls.paginate){
					pageNumber = parseInt(pgNum);
				
				
					
					// Set boundaries
					if (pageNumber < 0){
						pageNumber = 0;
						return;
					}
					
					if (pageNumber >= pageCount && pageCount > 0){
						pageNumber = pageCount-1;
						return;
					}
					
					
					// Update display of pagination buttons
					if (pageCount > 7){
						if (pageNumber > 2){ 
							if (pageNumber < pageCount-3){
								$(status.children('.paginate').children()[2]).attr('disabled', true).attr('data-id','').html('...');
								$(status.children('.paginate').children()[3]).attr('data-id', pageNumber-1).html(pgNum);
								$(status.children('.paginate').children()[4]).attr('data-id', pgNum).html(pageNumber+1);
								$(status.children('.paginate').children()[5]).attr('data-id', pageNumber+1).html(pageNumber+2);
							}
						}else{
							for(i=1;i<5;i++){
								$(status.children('.paginate').children()[i+1]).attr('disabled', false).attr('data-id',i).html(i+1);
							}
						}
						
						if (pageCount > 7){
							if (pageNumber < (pageCount-4)){
								$(status.children('.paginate').children()[6]).attr('disabled', true).attr('data-id','').html('...'); //.removeClass('btn-active')
							}else{
								$(status.children('.paginate').children()[2]).attr('disabled', true).attr('data-id','').html('...');
								
								for(i=0;i<4;i++){
									pg = (pageCount-5) + i
									$(status.children('.paginate').children()[i+3]).attr('disabled', false).attr('data-id', pg).html(pg+1);
								}
							}
						}
					}
					
				
					status.children('.paginate').children().removeClass('btn-active');  // remove active class from other buttons
					status.children('.paginate').children('[data-id="'+pgNum+'"]').addClass('btn-active');  // Make this page button appear active
					
					//  If first page selected, disable the Prev button
					if (pageNumber == 0){
						$(status.children('.paginate').children()[0]).attr('disabled', true);
					}else{
						$(status.children('.paginate').children()[0]).attr('disabled', false);
					}
					
					//  If last page selected, disable the Next button
					if (pageNumber == pageCount-1 || pageCount == 0){
						//(status.children('.paginate').children()[8]).attr('disabled', true);
						$(status.children('.paginate').children().last()).attr('disabled', true);
					}else{
						//$(status.children('.paginate').children()[8]).attr('disabled', false);
						$(status.children('.paginate').children().last()).attr('disabled', false);
					}
					
				}
				
				
				// Calculate range of rows to be displayed for current page
				var start = pgNum * settings.pageSize;
				var end = start + settings.pageSize;
				
				// Get those rows from the table data
				var filteredRows = __filteredTable.slice(start, end);
				
				// Update status message
				var extra = '';
				if( __table.rows.length - __filteredTable.length > 0){
					extra = ' (filtered from '+__table.rows.length+' total entries)';	
				}
				if (settings.controls.status)
					tableInfo.html('Showing '+(start+1)+' to '+Math.min(end, __filteredTable.length)+' of '+__filteredTable.length+' entries' + extra);
			}else{ // Show all
				var filteredRows = __filteredTable; 
				if (settings.controls.status)
					tableInfo.html('Showing '+__filteredTable.length+' entries');
			}
			
			bod.empty();  // Empty existing table
			
			
			
			
			filteredRows.forEach(function(rowData, rowIndex){ 
			
				var tr = $('<tr>');
				
				__table.columns.forEach(function(col, colIndex){
					if (col.show){
						let ri = pageNumber*settings.pageSize + rowIndex;
						tr.append(renderCell(rowData[col.id], colIndex, ri, rowData));
					}
					else
						tr.append($('<td>'));
				});
				bod.append(tr);
			
			});
			
			
			if ("pageChange" in settings.callbacks && oldPageNumber != pageNumber){
				settings.callbacks.pageChange(pageNumber+1, pageCount, oldPageNumber+1);
			}
			
			/*
			//  Render all the visible rows
			filteredRows.forEach(function(row, rowIndex){ 
				bod.append($('<tr>').append(Object.keys(row).map(function(key, colIndex){
					
					if (__table.columns[colIndex].show)
						return renderCell(row[__table.columns[colIndex].id], colIndex, rowIndex, row);
					else
						return;
			})))});
			*/
			
			return this;
		}

		
		


		
		/**
		 * Sort the table
		 *
		 * @param {integer} col The column index to sort by (column order does not change their index value)
		 * $param {integer} order 0 for ascending, 1 for descending
		 */
		this.sort = function(col, order){
			__filteredTable = [...__table.rows];
			__filteredTable.sort(function(a, b){
				if (a[col] > b[col]) return 1;
				if (a[col] < b[col]) return -1;
				return 0;
			});
			
			// descending order
			if (order == 0) __filteredTable.reverse();
			that.setPage(0);
			return this;
		}




		/*
		 * Gets the position in the DOM of this column.
		 * Used for the drag events
		 */
		function getColPosById(id){
			for(i=0; i<__table.columns.length; i++){
				if (__table.columns[i].id == id){
					return i;
				}
			}
			return null;
		}
		
		
		
		
		
		/*
		 * Handles column dragging
		 *
		 */
		function zdrag(e){
			//console.log(e);
			e.preventDefault();
			
			
			
			// Remember the source from first triggering event
			if (dragSource == null){
				dragSource = $(e.target);
			}
			
			
			//var c = that.offset();
			// Current header under the drag even
			var source = $(e.target);
			
			
			// Where this column is dragged
			target = $(e.target);
			
			// Column header contains SPAN elements for the sorting arrows
			// We want the user to still be able to sort columns even if 
			// the mouse is over these arrows.
			if (e.target.tagName == 'SPAN'){
				target = $(e.target.parentNode);
			}
			
			// Source column to move, and target of where to move it in front of
			targetCol = getColPosById(target.attr('id')); 
			sourceCol = getColPosById(dragSource.attr('id'));
			
			
			// Get all table headers
			var headers = head.children('tr').children('th');
			
			
			var found = false;   //  Found header to target
			var cellCol = null;  //  Remember the column where the insert will take place
			var first = false;   //  Special condition for moving a column into first position
			
			
			//  Look through all column headers
			for(i=0;i<headers.length;i++){
				var col = $(headers[i]);
				
				// How far the mouse cursor is from the beginning of this column
				var x = e.originalEvent.clientX - col.offset().left;
				
				
				if (i == sourceCol){
					col.addClass("reorderMarker");  // Visual que in column header of insertion point
					found = true;                   // Found a column
					cellCol = i;                    // Remember this insertion point
				}
				else{
					col.removeClass("reorderMarker");
				}
				
				
				// Special condition for inserting at beginning of table.
				// Rather than trigger an insertion point in front of the first column
				// (because the table object itself has no room to read the drag events)
				// we mark this column if the mouse is less than half way from the beginning
				if (x < col.width()/2 && i == 0){
					first = true;
					col.addClass("reorderMarker");
					cellCol = 0
				}
			}
			
			
			// Insertion point found, update the table cells to visualize this
			if (cellCol != null)
				markCells(sourceCol);			
			
			
			
			// Column is moved in front of specified column index, 
			// so to move into first position target must be -1
			if (first)
				targetCol = -1;
			
			
			// Move the column 
			that.moveColumn(sourceCol, targetCol);
			
		}
		
		
		
		
		
		
		
		
		
		/*
		 * Updates all the table cells to visualize the column insertion point
		 *
		 */
		function markCells(colPos){
			cells = bod.children('tr');
			
			cells.each(function(index){
				
				$(this).children().each(function(i){
					if (i == colPos){
						$(this).addClass('reorderMarker');
					}else{
						$(this).removeClass('reorderMarker');
					}
				});
				
			});
		}
		
		
		

		/*
		 * Restores visual integrity after a drag n drop action completes
		 *
		 */
		function zdrop(e){
			e.preventDefault();

			// Remove class from column headers
			var headers = head.children('tr').children('th');
			for(i=0;i<headers.length;i++){
				$(headers[i]).removeClass("reorderMarker");
			}
			
			// Remove class from TDs
			markCells(-1);
			
			dragSource = null;
		}



		
		
		/**
		 * Moves a column to a new position in the table
		 *
		 * @param {integer} source column index to move
		 * @param {integer}  dest   column index of where to re-insert the source
		 */
		this.moveColumn = function(source, dest){
			
			var headers = head.children('tr').children('th').toArray();

			
			if (dest < source) dest++;
			if (dest == source) return;
			
			// Reorder the column headers
			headers.splice(dest, 0, headers.splice(source, 1)[0]);
			// Reorder the column header data  (technically bad practice as these must be kept in parallel)
			__table.columns.splice(dest, 0, __table.columns.splice(source, 1)[0]);
			
			// Get column header row, empty it, and rebuild
			var tr = head.children('tr');
			tr.empty();
			
			headers.forEach(function(col, idx){
				var th = $(headers[idx]);
				tr.append(th);
			});
			
			// This triggers the cell data to be redrawn
			that.setPage(pageNumber);
		}





		
		/*
		 * Builds the element that contains the pagination buttons
		 *
		 */	
		function buildPagination(){
			pageCount = Math.ceil(__filteredTable.length / settings.pageSize);  // Calculate how many pages this table has based on page size and total row count
			
			if (settings.controls.paginate){
				p = $('<div class="paginate">');  // Div to contain the pagination buttons
				p.append($('<button>Prev</button>').click(function(){that.setPage(pageNumber-1);}));
				
				if (pageCount < 8){
					for(i=0;i<pageCount;i++){
						b = $('<button data-id="'+i+'">'+(i+1)+'</button>');  // Create a pagination button
						b.click(function(){  // pagination  button clicked
							that.setPage($(this).attr('data-id'));  // Set page number
						});
						p.append(b);  // Add button to paginate div
					}
				}else{
					for(var i=0;i<6;i++){
						p.append($('<button data-id="'+i+'">'+(i+1)+'</button>').click(function(){that.setPage($(this).attr('data-id'));}));
					}
					p.append($('<button data-id="'+(pageCount-1)+'">'+pageCount+'</button>').click(function(){that.setPage(pageCount-1);}));
				}
				p.append($('<button>Next</button>').click(function(){that.setPage(pageNumber+1);}));
				
				status.children('.paginate').remove();  // If pagination already exists, get rid of it
				status.append(p);  // Add paginate div as a sibling immediately following this table
			}
		}
		
		
		
		
		
		/**
		 * If pagination is false, this does nothing.
		 * 
		 * @param {integer} x Number of rows to display on a single page
		 */	
		this.setPageSize = function(x){
			if (settings.pagination){
				settings.pageSize = parseInt(x);
				buildPagination();
				that.setPage(0);
			}
		}




		/*
		 *  When new data has been added, these
		 * 
		 */	
		function initializeView(){
			if (settings.controls.colVis)
				createColumnButtons();
			
			// Builds the initial filtered table
			that.applyFilter();
			
			// Create the pagination buttons
			if (settings.pagination)  buildPagination();
			
			// Set default page
			that.setPage(0);
		}
		
		
		
		
		/*
		 * Builds the table header from the __table.column objects array
		 *
		 */
		function buildHeaders(){
			 head.children('tr').remove();
			 
			var header = $('<tr>');

			// Column drag events
			header.on('drop', zdrop);
			header.on('dragover', zdrag);
			header.on('dragstart', function(e){  // Necessary for Firefox
				e.dataTransfer = e.originalEvent.dataTransfer;
				e.dataTransfer.setData('text/html', null);
			});
			
			
			
			// Add columns to table
			head.append(header.append(__table.columns.map(function(e, i){
				if (e.show){
					var x = $('<th nowrap " id="'+e.id+'" data-id="'+i+'">').html(e.name); // column heading
					x.append('<span>&uarr;</span>'); // Up arrow
					x.append('<span>&darr;</span>'); // down arrow
					x.attr('draggable', 'true');
					return x;
				}else{
					return false;	
				}
			})).click(function(e){
				if ($(e.target).is('th')){
					head.children(0).children().children().removeClass('order-select');  // Reset all the column order arrows
					
					let colId = $(e.target).attr('data-id');  // Get column ID
					
					__table.columns[colId].sort = 1 - __table.columns[colId].sort;  // Determine sort order
					$(e.target).children(":nth-child("+(2-__table.columns[colId].sort)+")").addClass('order-select');  // Add class to show sort order
					that.sort($(e.target).attr('id'), __table.columns[colId].sort);  // Sort the data
					
					let colName = $(e.target).attr('id');
					let colPos = getColPosById(colName); // position in the DOM (as the user sees it)
					let sortOrder = (__table.columns[colId].sort)?"ASC":"DESC"
					
					
					settings.callbacks.headerClick(colId, colName, colPos, sortOrder);
					
					
					
					/*
					if (e.target.tagName != "TH"){
						let row = e.target.parentNode.rowIndex;
						let cellIndex = e.target.cellIndex;
						let rowIndex = pageNumber*settings.pageSize + (row-1);
						let colName = __table.columns[cellIndex].id
						
						settings.callbacks.cellClick(cellIndex, colName, rowIndex, __filteredTable[rowIndex]);
					}
					*/
					
				}
			}));
		}
		
		
		
		
		/**
		 * Toggles a column's visibility
		 *
		 * @param {int} colId A column's iD
		 * @param {bool} state true to show column, false to hide
		 */
		this.setColumnVisible = function(colId, state){
			__table.columns[getColPosById(colId)].show = state;
			buildHeaders();
			that.setPage(pageNumber);
		}
		
	
	
	
		/*
		 * Builds the column visibility buttons and menu
		 */
		function createColumnButtons(){
			var dd = $('.zt_menu').css('order', 0);
			
			// If colvis menu already exists, delete and recreate it
			if (dd.length > 0){
				dd.remove();
			}
			
			dd = $('<div class="zt_menu">');
			var db = $('<div class="zt_menu_content">');
			
			// Dropdown menu
			dd.append($('<button>').html('Columns').click(function(e){
				db.slideToggle(100);
			}));
			
			// Create the column visibility toggle buttons
			for(i=0;i<__table.columns.length;i++){
				var l = $('<label for="c'+i+'">').html(__table.columns[i].name);
				var c = $('<input type="checkbox" name="c'+i+'" id="c'+i+'" value="'+__table.columns[i].id+'" checked/>').change(function(e){
					that.setColumnVisible($(e.target).val(), $(e.target).prop('checked'));
				});
				
				db.append(c);
				db.append(l);
			}
			
			
			
			// Add to zpanel
			dd.append(db);
			zpanel.append(dd);
		}
		
		
		
				
		/**
		 *
		 * @param {string} json JSON object containg row and/or column data
		 */	
		this.buildFromJSON = function(json){
			
			if (typeof json != 'object'){
				var obj = JSON.parse(json);
			}else{
				var obj = json;
			}
			
			// Build the column objects
			if (obj.columns){
				__table.columns = obj.columns.map(function(e, i){
					// Column data contains ID names
					if (typeof(e) === "object"){
						id = Object.keys(e)[0];
						name = e[id];
					}else{ // Column data is a simple array of names
						id = i;
						name = e;
					}
					
					return {id:id, name:name, pos:i, sort:0, show:true};
				});
			
				
				buildHeaders();
			}
				
			var base = {};
			$.each(__table.columns, function(coli, cold){
				base[cold.id] = '';
			});
			
						
			// Build the row objects
			if (obj.data){
				var newRows = obj.data.map(function(row, i){
					// Row data is a simple array
					if (Array.isArray(row)){  
						rowData = row.map(function(v){
							return {value:v};
						});
					}else{   // Row data is mapped to column IDs
						//var rowData = new Array();
						var rowData = JSON.parse(JSON.stringify(base));
						//console.log(row);
						rowData = $.extend(rowData, row);
						
						/*
						$.each(__table.columns, function(coli, cold){
							var v = row[cold.id];
							if (typeof v === typeof undefined)  v = '';
							
							rowData[cold.id] = v
						});
						*/
					}
					
					return rowData;
				});
				
				__table.rows = __table.rows.concat(newRows);
			}
			
			
			initializeView();
			
			
			return this;
		}
		
		
		
		
	
		
		
		
		/*
		 * Get the pre-existing columns in the html
		 */
		$.each(head.children().first().children(), function(i, e){
			var ec = $(e);
			var id = ec.attr('id');
			if (typeof id === typeof undefined || id === false)
				id = i;
			
			__table.columns.push({id:id, name:ec.html(), pos:i, sort:0, show:true});
			
		});
		
		buildHeaders();
		
				

		/*
		 * Get pre-existing rows
		 */
		$.each(bod.children(), function(rowNum, rdata){
			var newRow = {};
						
			$.each($(rdata).children(), function(colNum, celldata){
				newRow[getColumnId(colNum)] = $(celldata).html();
			});
			__table.rows.push(newRow);
		});
		
		
		// Sets the initial view of the table.
		initializeView();
		
		
		
		
		if ("rowClick" in settings.callbacks){
		
			this.on('click', 'tr', function(e){
				let row = e.target.parentNode.rowIndex;
				let rowIndex = pageNumber*settings.pageSize + (row-1);
				
				settings.callbacks.rowClick(rowIndex, __filteredTable[rowIndex]);

			});
		}
		
		
		if ("cellClick" in settings.callbacks){
		
			this.on('click', 'tr', function(e){
				if (e.target.tagName != "TH"){
					let row = e.target.parentNode.rowIndex;
					let cellIndex = e.target.cellIndex;
					let rowIndex = pageNumber*settings.pageSize + (row-1);
					let colName = __table.columns[cellIndex].id
					
					settings.callbacks.cellClick(cellIndex, colName, rowIndex, __filteredTable[rowIndex]);
				}
			});
		}
		
		
		
		
			
			
		/*
		 * Create the pagination buttons
		 */
		if (settings.pagination)  buildPagination();
		
		that.setPage(0);

		
		return this;
	};
	
	
	
}( jQuery ));
