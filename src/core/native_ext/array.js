/* ---------------------------------------------------------------------------
 * array.js
 * -------------------------------------------------------------------------*/

/**
 * Removes an element from an array
 * @param  {array} member Element to remove
 * @return {array} An array
 */
Array.prototype.remove = function(member) {
  var index = this.indexOf(member);
  if (index > -1) {
    this.splice(index, 1);
  }
  return this;
}

/**
 * Performs a block of code over the whole aray
 * @param  {function} block Block of code to run
 */
Array.prototype.each = function(block) {
  var len = this.length;
  for (var i = 0; i < len; i++) { block(this[i]); }
}

// Creates groups of arrays of a specified size
SeerJs.groupBy = function(array, size) {
  if (array.length < size) return [array];
  var temp = array;
  var first = true;
  var retval = [];
  while (temp.length > size) {
    var temp2 = temp.splice(size);
    if (first) {
      retval.push(temp);
      first = false;
    }
    retval.push(temp2);
    temp = temp2;
  }
  return retval;
}

// Convert Array into a hash (with no values)
// ie: ['ny', 'phl', 'atl'] => {'ny':'', 'phl':'', 'atl':''}
Array.prototype.toObj = function() {
  var obj = {};
  for (var i = 0; i < this.length; i++) { obj[this[i]] = '' }
  return obj;
}

/**
 * Transpose an array from rows to columns.
 * @return {array}
 */
Array.prototype.transpose = function() {
  var i = 0, len = this.length, ret = [];
  while(i < len) {
    ret.push([this[i]]);
    i++;
  }
  return ret;
}

Array.prototype.toArray = function() {
  return this;
}

/**
 * Performs a block of code over every element in an array
 * @param  {function} block Anonymous function to pass to each element.  Each
 *                          will pass the element as the argument.
 * @example
 * var myArray = [1,2,3,4,5];
 * var sum;
 * myArray.each(function(element) {
 *   sum += element;
 * });
 * console.log(sum);
 */
Array.prototype.each = function(block) {
  var i = 0, len = this.length;
  while (i < len) {
    block(this[i]);
    i++;
  }
}

Array.prototype.collect = function(block) {
  var i = 0, len = this.length, retval = [], value;
  while (i < len) {
    value = block(this[i]);
    if (value != undefined) { retval.push(value); }
    i++;
  }
  return retval;
}

Array.prototype.googleFormat = function() {
  var r = 0, c = 0, rLen = this.length, cLen = this[0].length, retval = [],
      row = [];
  for (c in this[0]) {
    row.push(c);
  }
  retval.push(row);
  while (r < rLen) {
    row = [];
    for (c in this[r]) {
      row.push(this[r][c]);
    }
    r++;
    retval.push(row);
  }
  return retval;
}

// http://tech.karbassi.com/2009/12/17/pure-javascript-flatten-array/
Array.prototype.flatten = function flatten(){
   var flat = [];
   for (var i = 0, l = this.length; i < l; i++){
       var type = Object.prototype.toString.call(this[i]).split(' ').pop().split(']').shift().toLowerCase();
       if (type) { flat = flat.concat(/^(array|collection|arguments|object)$/.test(type) ? flatten.call(this[i]) : this[i]); }
   }
   return flat;
};
