/* ---------------------------------------------------------------------------
 * error.js
 * -------------------------------------------------------------------------*/

/**
 * @namespace Error
 * @classdesc Used to help catch errors and put the errors in cells intead
 * of dumping the ugly Google Docs junk in the cell.
 * @author    Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.Error = (function() {

  var errorMessage_ = [],
      hasOccurred_ = false;

  return {
    internal: function(msg) {
      SeerJs.Error.set('Internal error: ' + msg);
      return msg;
    },

    set: function(msg) {
      hasOccurred_ = true;
      errorMessage_.push(msg);
      return msg;
    },

    hasOccurred: function() {
      return hasOccurred_;
    },

    get: function() {
      if (hasOccurred_) {
        return errorMessage_.join(', ');
      } else {
        return false;
      }
    },

    reset: function() {
      hasOccurred_ = false;
      errorMessage_ = [];
    }

  };

})();
