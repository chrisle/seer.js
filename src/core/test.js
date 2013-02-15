/* ---------------------------------------------------------------------------
 * test.js
 *
 * Helper methods to help facilitate testing of code using Node.js on the
 * command line.  Not to be placed in the real Google Doc code.
 *
 * -------------------------------------------------------------------------*/

SeerJs.Test = (function() {

  var testFunctions_ = [];

  return {
    add: function(title, block) {
      testFunctions_.push([title, block]);
    },

    run: function() {
      var i = 0, len = testFunctions_.length;
      while (i < len) {
        console.log('Testing ' + testFunctions_[i][0] + ' ...');
        testFunctions_[i][1]();
        i++;
      }
      console.log('Ran ' + i + ' tests.');
    }

  };

})();
