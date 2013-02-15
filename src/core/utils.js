/* ---------------------------------------------------------------------------
 * utils.js
 * -------------------------------------------------------------------------*/

SeerJs.Utils = (function() {

  return {

    /**
     * Returns a query string from an object
     */
    toQueryString: function(obj) {
      var params = [];
      for (index in obj) {
        if (obj[index] != undefined) {
          params.push(index + "=" + obj[index]); 
        }
      }
      return params.join("&");      
    },

    /**
     * Returns true if obj is a date
     */
    isDate: function(obj) {
      var temp = new Date(obj);
      return (temp.toString() == 'NaN' || temp.toString() == 'Invalid Date') 
          ? false
          : true;
    }
  };

})();
