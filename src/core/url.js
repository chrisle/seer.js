/* ---------------------------------------------------------------------------
 * url.js
 *
 * Helper methods for handling URLS.
 * -------------------------------------------------------------------------*/

SeerJs.Url = function(url) {

  var params_ = [];
  var url_;

  if (url != undefined) { url_ = url; }

  return {
    addParams: function(obj) {
      for (index in obj) {
        if (obj[index] != undefined && obj[index] != '') {
          params_.push([index, obj[index]]);
        }
      }
    },

    toString: function() {
      var pairs = [];
      var i = 0, len = params_.length;
      while (i < len) {
        pairs.push(params_[i][0] + '=' + params_[i][1]);
        i++;
      }
      if (url_ != undefined) {
        return url_ + '?' + pairs.join('&');
      } else {
        return pairs.join('&');
      }
    }
  }

}
