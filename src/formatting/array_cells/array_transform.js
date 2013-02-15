/* ---------------------------------------------------------------------------
 * array_transform.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     ArrayTransform
 @classdesc     Array Tools
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.ArrayTransform = (function() { 

  // Transposes hash tables
  function hashTableToCols_ (input, filter) {
    var retval = new Array, colIndex = new Array, newRow = new Array;
    retval.push(filter);
    for (row in input) {
      newRow = new Array;
      for (col in filter) { 
        newRow.push(input[row][filter[col]]);
      }
      retval.push(newRow);
    }  
    return retval;
  }

  // Transposes arrays that have created an array in rows
  function arrayToCols_ (input, filter) {
    var retval = new Array, colIndex = new Array, newRow = new Array;
    for (col in filter) { colIndex.push(input[0].indexOf(filter[col])); }
    for (row in input) {
      newRow = new Array;
      for (col in colIndex) { newRow.push(input[row][colIndex[col]]); }
      retval.push(newRow);
    }
    return retval;
  }

  return {
    /**
     * filters by column
     */
    filterColumns: function(input, filterCols) {
      var retval, filter;
      filter = (filterCols.length == 1) ? filterCols[0] : filterCols; // transpose
      if ((input[0].length != undefined) && (input[0].length > 0)){
        retval = arrayToCols_(input, filter);
      } else {
        retval = hashTableToCols_(input, filter);
      }
      return (filterCols.length == 1) ? 
          SeerJs.ArrayTransform.removeFirstRow(retval) : retval;
    },


    removeFirstRow: function(input) {
      var temp = input;
      temp.shift();
      return temp;
    },

    combineRange: function(inputRange, optByRows, optAsRow) {
      if (optByRows == undefined) { optByRows = false }
      if (optAsRow == undefined) { optAsRow = false }
      // Combine arrays
      var temp = [];
      if (optByRows == true) { // go left to right
        for (var r = 0; r < inputRange.length; r++) {
          for (var c = 0; c < inputRange[0].length; c++) {
            temp.push(inputRange[r][c]);
          }
        }
      } else { // goes up and down
        for (var c = 0; c < inputRange[0].length; c++) {
          for (var r = 0; r < inputRange.length; r++) {
            temp.push(inputRange[r][c]);
          }
        }
      }
      if (optAsRow == false) {
        // Transpose the resulting 1D array so it comes out as a column.
        var ret = [];
        for (var i = 0; i < temp.length; i++) {
          ret.push([]);
          ret[i].push(temp[i]);
        }
      } else {
        ret = temp;
      }
      return ret;
    }

  };

})();

/**
 * @function ArrayTransform.filterColumns
 * @since 1.3.51
 * 
 * @summary
 * Filters incoming data by specifying a header.  Usful if you only need
 * a few columns from one of the API functions.
 *
 * @param {array|range} input Input array or range of cells.
 * @param {array|range} filterCols Columns you want to filter by
 * 
 * @example
 * <caption>
 *   <h4>Filter data by columns. Useful if you only need a few columns from
 *   an API.<br/>
 *     <small>
 *       Just get URL, title, mozrank, and page authority, in that order
 *       from SEOmoz.
 *     </small>
 *   </h4>
 * </caption>
 * // Headers in the first row
 * // ------------------------
 *   A1: url
 *   B1: title
 *   C1: mozrank
 *   D1: page authority
 *   
 * // URLs down column A
 * // ------------------
 *   A2: www.seerinteractive.com
 *   A3: www.seomoz.org
 *   A4: www.distilled.net
 *
 * // filterColumns + getLinkscape + Magic
 * // --------------------------------------
 *   B2: =filterColumns( getLinkscape(A2:A4, false), B1:D1 )
 */
function filterColumns (input, filterCols) {
  return SeerJs.ArrayTransform.filterColumns(input, filterCols);
}

/**
 * @function ArrayTransform.removeFirstRow
 * @since 1.3.51
 * 
 * @summary
 * Removes the first row. Useful if you get something with a header row
 * but you don't need it.
 * 
 * @param {array|range} input Array to shift
 * 
 * @example
 * <caption>
 *   <h4>Remove header row from getLinkscape()<br/>
 *   </h4>
 * </caption>
 * =removeFirstRow( getLinkscape(A1) )
 */
function removeFirstRow (input) {
  return SeerJs.ArrayTransform.removeFirstRow(input);
}

/**
 * @function ArrayTransform.combineRange
 * @since 1.4
 * 
 * @summary
 * Combines a range of cells as either a column or a row. Useful if you
 * need to combine a block of cells into a single row or column.
 * 
 * @param  {array|range} inputRange Range of cells you want to combine
 * @param  {optByRows} optByRows (optional) Go left to right (default is up and down)
 * @param  {optAsRow} optAsRow (optional) Output as a row (default is a column)
 * 
 * @example
 * <caption>
 *   <h4>Turn a bunch of columns into a single column.
 *   </h4>
 * </caption>
 * 
 * // Let's say your block of data looks like this:
 * // +-----------------------------------------+
 * // |      |     A    |     B     |     C     |
 * // +-----------------------------------------+
 * // |   1  | philly     nyc         dallas
 * // |   2  | houston    san fran    miami
 * // |   3  | chicago    seattle     austin
 * // +------+
 *  
 * // Combine the block going up        // Combine the block going 
 * // and down as a column.             // left to right as a column. 
 * =combineRange(A1:C3)                 =combineRange(A1:C3, true)                  
 * //   philly                               philly      
 * //   houston                              nyc      
 * //   chicago                              dallas      
 * //   nyc                                  houston      
 * //   san fran                             san fran      
 * //   seattle                              miami      
 * //   dallas                               chicago    
 * //   miami                                seattle    
 * //   austin                               austin    
 * 
 * // Combine block going up and down as a row
 * =combineRange(A1:C3, false, true)
 * // => philly | houston | chicago | nyc | san fran | seattle | dallas | miami | austin
 * 
 * // Combine block going left to right as a row
 * =combineRange(A1:C3, true, true)]
 * // => philly | nyc | dallas | houston | san fran | miami | chicago | seattle | austin
 * 
 */
function combineRange (inputRange, optByRows, optAsRow) {
  return SeerJs.ArrayTransform.combineRange(inputRange, optByRows, optAsRow);
}
