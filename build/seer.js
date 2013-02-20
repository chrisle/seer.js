/* ---------------------------------------------------------------------------
 * seer.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     SeerJs
 @classdesc     Seer.js
 @author        Chris Le <chrisl at seerinteractive.com>
 */

var SeerJs = SeerJs || {};
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
/* ---------------------------------------------------------------------------
 * http.js
 * -------------------------------------------------------------------------*/

/**
 * @namespace HTTP
 * @classdesc Internally used class that handles all the HTTP interations
 *            across the whole library.
 * @author Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.Http = (function() {

  var uri_,
      uriMD5_           = '',
      header_           = {},
      advancedArgs_     = {},
      header            = {},
      response_         = '',
      fatal_            = false,
      NOT_SET           = -1,
      DISABLED          = 0,
      ENABLED           = 1;

  var oAuthCfg_;

  // Errors
  var ERROR_BAD_ARG     = 'Missing parameters';
  var ERROR_NO_DATA     = 'No data was returned';

  // HTTP headers
  var PRAGMA            = 'Pragma';
  var CACHE_CONTROL     = 'Cache-Control';
  var NO_CACHE          = 'no-cache';
  var USER_AGENT        = 'User-Agent';
  var COOKIE            = 'Cookie';
  var AUTHORIZATION     = 'Authorization';

  /**
   * Sets the URL and the query string
   * @param {[type]} url            [description]
   * @param {[type]} optQueryParams [description]
   */
  function setUrl(uri, optQueryParams) {
    if (optQueryParams == undefined) {
      uri_ = uri;
    } else {
      uri_ = uri + '?' + SeerJs.Utils.toQueryString(optQueryParams);
    }
    //uriMD5_ = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, uri_);
    return uri_;
  }

  /**
   * Returns the current URL string
   * @return {string}
   */
  function getUrl() {
    return uri_;
  }

  /**
   * Returns the cookie string
   * @return {string}
   */
  function getCookies() {
    return header_[COOKIE];
  }

  /**
   * Sets multiple cookies from a hash
   * @param {hash} hash Cookies to set
   */
  function setCookies(hash) {
    for (key in hash) {
      setCookie(key, hash[key]);
    }
  }

  /**
   * Set a single cookie. Calling this method a second time will append the
   * cookie to the existing set of cookies.
   * @param {string} cookie Key to set
   * @param {mixed} value  Value to set
   */
  function setCookie(cookie, value) {
    if (header_[COOKIE] == undefined) { resetCookies() }
    header_[COOKIE] = header_[COOKIE] + '&' + cookie.trim().urlencode() + '=' +
        value.trim().urlencode();
  }

  /**
   * Clears all the cookies
   */
  function resetCookies() {
    header_[COOKIE] = '';
  }

  /**
   * Disables caching
   */
  function disableCache() {
    header_[PRAGMA] = NO_CACHE;
    header_[CACHE_CONTROL] = NO_CACHE;
  }

  /**
   * Enables caching
   */
  function enableCache() {
    header_[PRAGMA] = undefined;
    header_[CACHE_CONTROL] = undefined;
  }

  /**
   * Returns true if caching is enabled, false if caching is disabled
   * @return {boolean}
   */
  function isCacheEnabled() {
    if (header_[PRAGMA] == undefined && header_[CACHE_CONTROL] == undefined) {
      return true;
    }
    return false;
  }

  /**
   * Returns false if caching is enabled, true if caching is disabled
   * @return {Boolean}
   */
  function isCacheDisabled() {
    return !isCacheEnabled();
  }

  /**
   * Returns the headers
   * @return {hash}
   */
  function getHeaders() {
    return header_;
  }

  /**
   * Clears the headers
   */
  function resetHeaders() {
    header_ = {};
  }

  /**
   * Adds a method verb to the header.
   * @param {string} method 'get', 'post'. (default is get)
   */
  function setRequestMethod(method) {
    if (method == undefined) { method = 'get' }
    switch (method) {
      case 'get':   advancedArgs_['method'] = 'get'; break;
      case 'post':  advancedArgs_['method'] = 'post'; break;
      default:      advancedArgs_['method'] = 'get'; break;
    }
  }

  /**
   * Adds a payload to the body of the header
   * @param {string} payload Payload to include in the body
   */
  function setPayload(payload) {
    advancedArgs_['payload'] = payload;
  }

  /**
   * Sets the content type
   * @param {string} format 'json', 'xml', 'html', 'bodytxt'.  'html' will
   *                        return all the HTML.  'bodytxt' will return the
   *                        content inside the body tag without HTML.
   */
  function setContentType(format) {
    var mimeType;
    switch (format) {
      case 'json':    mimeType = 'application/json; charset=utf-8'; break;
      case 'xml':     mimeType = 'application/xml; charset=utf-8'; break;
      case 'html':    mimeType = 'text/html'; break;
      case 'bodytxt': mimeType = 'text/html'; break;
      default:        mimeType = 'application/xhtml+xml'; break;
    }
    advancedArgs_['contentType'] = mimeType;
  }

  /**
   * Returns the last error message if an error occurred
   * @return {string}
   */
  function getError() {
    if (fatal_) {
      return response_;
    } else {
      return '(' + response_.getResponseCode().toString() + ') ' +
          response_.getContentText();
    }
  }

  /**
   * If advanced args exists returns them, else returns false
   * @return {Boolean}
   */
  function getAdvancedArgs() {
    if (advancedArgs_ != {}) {
      return advancedArgs_;
    } else {
      return false;
    }
  }

  /**
   * Fetches URL. On error, returns false. Use errorStr() to retrieve the error.
   * @param  {string} uri URI to get
   * @param  {hash} optQueryParams Hash of query perameters
   * @return {boolean}
   */
  function fetch() {
    if (getAdvancedArgs() == false) {
      response_ = UrlFetchApp.fetch(uri_);
    } else {
      response_ = UrlFetchApp.fetch(uri_, getAdvancedArgs());
    }
    if (response_.getResponseCode() == 200) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Parse the response
   *
   * Formats:
   * - json       Parses as JSON. Returns as jsonParse object
   * - xml        Parses as XML. Returns XMLElement object
   * - html       Parses as HTML. Return as a string.
   * - function   Sends the parsing to a function block.
   *
   * @param  {string} format Expected format to parse
   * @param  {string} uri URI
   * @param  {hash} optQueryParams Hash of query parameters
   * @return {mixed}
   *
   * @example
   * respondAs('json')      // Parse http response as json
   * respondAs('xml')       // Parse http response as xml
   * respondAs('html')      // Parse http response as html string
   *
   * // Returns the result and replace 'hello' with 'world.'
   * respondAs('function', function(str) {
   *     return tr.replace(/hello/, 'world');
   * });
   *
   */
  function parseResponseAs(format, optBlock) {
    if (format == undefined) { method = 'html' }
    if (!fatal_) {
      var content = response_.getContentText();
      switch (format) {
        case 'json':
          var retval = Utilities.jsonParse(content);
          break;
        case 'xml':
          var retval = Xml.parse(content, true);
          break;
        case 'html':
          var retval = content;
          break;
        case 'function':
          var retval = optBlock(content);
          break;
        default:
          var retval = content;
          break;
      }
    } else {
      retval = getError();
    }
    if (retval === null || retval === undefined) {
      return ERROR_NO_DATA + ' (' + format + ')';
    }
    return retval;
  }

  /**
   * Creates an OAuthConfig object.
   *
   * @param {hash} cfg Hash of the configuration values (service,
   *                   accessTokenUrl, requestTokenUrl, authorizationUrl,
   *                   consumerKey, consumerSecret)
   */
  function setOauthCfg(cfg) {
    var oAuth;
    oAuth = UrlFetchApp.addOAuthService(cfg['service']);
    oAuth.setAccessTokenUrl(cfg['accessTokenUrl']);
    oAuth.setRequestTokenUrl(cfg['requestTokenUrl'] + '?scope=' + cfg['scope']);
    oAuth.setAuthorizationUrl(cfg['authorizationUrl']);
    oAuth.setConsumerKey(cfg['key']);
    oAuth.setConsumerSecret(cfg['secret']);
    advancedArgs_['oAuthServiceName'] = cfg['service'];
    advancedArgs_['oAuthUseToken'] = cfg['authUseToken']
  }

  /**
   * Generates authentication header for UrlFetchApp
   */
  function setBasicAuth(username, password) {
    var credentials = Utilities.base64Encode(username + ":" + password);
    header_[AUTHORIZATION] = "Basic " + credentials;
    return credentials;
  }

  //--------------------------------------------------------------------------

  return {

    getCookies: getCookies,
    setCookie: setCookie,
    setCookies: setCookies,
    resetCookies: resetCookies,

    enableCache: enableCache,
    disableCache: disableCache,
    isCacheEnabled: isCacheEnabled,
    isCacheDisabled: isCacheDisabled,

    getHeaders: getHeaders,
    resetHeaders: resetHeaders,

    getAdvancedArgs: getAdvancedArgs,
    setContentType: setContentType,
    setRequestMethod: setRequestMethod,
    setPayload: setPayload,

    setOauthCfg: setOauthCfg,
    setBasicAuth: setBasicAuth,

    /**
     * GETs URL with query parameters and parses JSON
     * @param {string} uri The URI you want to get
     * @param {hash} optParams (optional) Hash of parameters to pass
     * @param {hash} optOauthCfg (optional) Hash of OAuth configuration
     * @return A Utilities.jsonParse object
     * @since 1.5
     *
     */
    getJson: function (uri, optParams) {
      if (uri == undefined) { return ERROR_BAD_ARG }
      setUrl(uri, optParams);
      fetch();
      return parseResponseAs('json');
    },

    /**
     * POSTs URL with query parameters and payload and parses XML
     * @param {string} uri The URI you want to get
     * @param {hash} payload Payload to place in the body
     * @param {hash} optParams (optional) Hash of parameters to pass
     * @return A Utilities.jsonParse object
     * @since 1.5
     *
     */
    postJson: function (uri, payload, optParams) {
      setUrl(uri, optParams);
      setContentType('json');
      setRequestMethod('post');
      setPayload(payload);
      fetch();
      return parseResponseAs('json');
    },

    /**
     * Fetches URL with query parameters and parses XML
     * @param {string} uri The URI you want to get
     * @param {hash} optParams (optional) Hash of parameters to pass
     * @return A XMLElement object
     * @since 1.5
     *
     */
    getXml: function (uri, optParams) {
      setUrl(uri, optParams);
      fetch();
      return parseResponseAs('xml');
    },

    /**
     * Fetches URL with query parameters and payload and parses XML
     * @param {string} uri The URI you want to get
     * @param {hash} optParams (optional) Hash of parameters to pass
     * @return A XMLElement object
     * @since 1.5
     *
     */
    postXml: function (uri, payload, optParams) {
      setUrl(uri, optParams);
      setContentType('xml');
      setPayload(payload);
      fetch();
      return parseResponseAs('xml');
    },

    /**
     * Get all headers
     * Undocumented feature?
     * see: http://code.google.com/p/google-apps-script-issues/issues/detail?id=559
     */
    responseHeaders: function (url) {
      return response_.getHeaders();
    },

    /**
     * Returns the response's HTML
     */
    fetch: function (url) {
      setUrl(url);
      fetch();
      return parseResponseAs('html');
    },

    /**
     * Returns as specified content type
     * valid types are: json, xml, html
     */
    fetchAs: function(url, contentType) {
      setUrl(url);
      fetch();
      return parseResponseAs(contentType);
    },

    /**
     * Returns content in a block
     * @example
     *
     * // Return the content with without new lines
     * SeerJs.Http.fetchBlock('http://www.domain.com', function(content) {
     *   return content.replace(/\n|\r/g, '');
     * });
     *
     */
    fetchBlock: function(url, block) {
      setUrl(url);
      fetch();
      return parseResponseAs('function', block);
    }
  };

})();
/* ---------------------------------------------------------------------------
 * settings.js
 * -------------------------------------------------------------------------*/

/**
 * @namespace Settings
 * @classdesc Used for getting settings from the "Settings" worksheet
 * @author    Chris Le <chrisl at seerinteractive.com>
 */
SeerJs.Settings = (function() {

  function getSettingsSheet_() {
    SETTINGS_SHEET = "Settings";
    var thisDoc = SpreadsheetApp.getActiveSpreadsheet();
    var settingsSheet = thisDoc.getSheetByName(SETTINGS_SHEET);
    if (settingsSheet == null) {
      SeerJs.Error.set('Settings sheet not found. Created one for you.');
      thisDoc.insertSheet(SETTINGS_SHEET);
    }
    return settingsSheet;
  }

  return {
    /**
     * Returns setting names need to be in column A and the setting value needs to
     * be in column B.
     *
     * @param {string} settingName Name of the setting you want to return
     * @since 1.0
     * @return The setting or false if not found.
     */
    get: function(settingName) {
      var settings = getSettingsSheet_().getRange("A:B").getValues();
      for (var i = 0; i < settings.length; i++) {
        var setting = settings[i][0];
        if (settings[i][0].toUpperCase() == settingName.toUpperCase()) {
          return settings[i][1];
        }
      }
      SeerJs.Error.set('Could not find the setting "' + settingName + '"');
      return false;
    }

  };

})();


function getSetting(settingName) { return SeerJs.Settings.get(settingName); }

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
/* ---------------------------------------------------------------------------
 * utils.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Utils
 @classdesc     Utilities
 @author        Chris Le <chrisl at seerinteractive.com>
 */

/**
 * @function Utils.isColumn
 *
 * @summary
 * Returns true if the array is actually in columns
 *
 * @example
 * // myArray is A1:A3
 * isColumn(myArray); // => true
 * // myArray is A1:C1
 * isColumn(myArray); // => false
 * // myArray is A1
 * isColumn(myArray); // => false
 */
function isColumn (array) {
  if (isArray(array)) {
    if (isArray(array[0])) {
      return true;
    }
  }
  return false;
}

/**
 * @function Utils.isArray
 *
 * @summary
 * Returns true if <code>obj</code> is an array.
 *
 * @param {obj} obj Some object
 * @return Returns true if the object is an array
 * @since 1.0
 *
 * @example
 * isArray([1, 2, 3]); // => true
 * isArray("hello world"); // => false
 */
function isArray(obj) {
  if (obj.constructor.toString().indexOf("Array") == -1) {
    return false;
  } else {
    return true;
  }
}

/**
 * @function Utils.strToArray
 *
 * @summary
 * Converts one string into an array if it's a string
 *
 * @param {obj} obj Object to convert to array
 * @return Array
 * @since 1.0
 *
 * @example
 * <caption>
 *   <h4>From a string<br/>
 *     <small>Returns a single dimentional array if given a string</small>
 *   </h4>
 * </caption>
 * strToArray("hello world"); // => ["hello world"]
 *
 * @example
 * <caption>
 *   <h4>From a array<br/>
 *     <small>Does nothing if it's already an array</small>
 *   </h4>
 * </caption>
 * strToArray(["an array"]); // => ["an array"]
 *
 */
function strToArray(obj) {
  if (typeof obj == "string") {
    return [obj];
  } else {
    return obj;
  }
}

/**
 * @function Utils.jsonifyCol
 *
 * @summary
 * Convert an array into a JSON string
 *
 * @param {array} inArray Range of cells
 *
 * @return JSON string of the first column in an array
 * @since 1.3
 *
 * @example
 * <caption>
 *   <h4>Array to JSON<br/>
 *     <small>Returns a JSON string of the array that was passed in.</small>
 *   </h4>
 * </caption>
 * var myArray = [[1, 2], [3, 4]];
 * jsonifyCol(myArray); // => '[1, 3]'
 * jsonifyCol("string"); // => '["string"]';
 */
function jsonifyCol(inArray) {
  inArray = strToArray(inArray);
  var a = new Array;
  var l = inArray.length;
  for (var i = 0; i < l; i++) { a.push(inArray[i][0]); }
  return Utilities.jsonStringify(a);
}

/**
 * @function Utils.getMonday
 *
 * @summary
 * Returns the first day of the week.  Useful for formatting headers.
 *
 * @param  {date} d Any date you want to find the start of the week for
 * @return Date that is Monday (the start of the week)
 * @since 1.0
 *
 * @example
 * <caption>
 *   <h4>Returns the beginning of the week<br/>
 *     <small>Returns the beginning of the week</small>
 *   </h4>
 * </caption>
 * Cells:
 *    A1: 11/18/2011
 * =getMonday(A1)
 * // Nov 18th is a Friday.  This will return 11/14/2011 which is Monday.
 *
 */
function getMonday(d) {
  var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

/**
 * @function Utils.isInFuture
 *
 * @summary Determines if some date is in the future.
 *
 * @param {date} date The starting date
 * @since 1.0
 * @return True if the date is in the future, false if it's not.
 *
 * @example
 * <caption>
 *   <h4>Check if date is in the future<br/>
 *     <small>Returns true if the date is > today</small>
 *   </h4>
 * </caption>
 *   A1: 11/01/2020
 * =isInFuture(A1) // true
 */
function isInFuture(futureDate) {
  var currentDate = new Date();
  if (currentDate > futureDate) {
    return false;
  }
  return true;
}
// function isInFuture(date) { return attemptingTimeTravel(date); }

/**
 * @function Utils.dateToYMD
 *
 * @summary
 * Returns a date as a string in YYYY-MM-DD format. <p>
 *
 * Given a date from a spreadsheet cell, returns the date in international date
 * format (aka unix format). Used for APIs that require dates in unix format. <p>
 *
 * @param {date} d Date from the spreadsheet
 * @return String of the date in YYYY-MM-DD format
 * @since 1.0
 *
 * @example
 * <caption>
 *   <h4>Converts date to YYYY-MM-DD<br/>
 *     <small>Converts a date to unix time format (YYYY-MM-DD)</small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 11/01/2011
 * =dateToYMD(A1)
 * // Returns 2011-11-01
 *
 */
function dateToYMD(d) {
  var year, month, day;
  year = String(d.getFullYear());
  month = String(d.getMonth() + 1);
  if (month.length == 1) {
    month = "0" + month;
  }
  day = String(d.getDate());
  if (day.length == 1) {
    day = "0" + day;
  }
  return year + "-" + month + "-" + day;
}

/**
 * @function Utils.ratioUp
 *
 * @summary
 * Returns a ratio of two numbers and rounds it up to decimal places as a
 * percentage.
 *
 * @function Utils.ratioUp
 *
 * @param {number} numerator Numerator
 * @param {number} denominator Denominator
 * @param {integer} decimalPlaces Number of decimal places
 * @since 1.0
 *
 * @example
 * <caption>
 *   <h4>Returns the ratio of two numbers as a percentage<br/>
 *     <small>Returns the beginning of the week</small>
 *   </h4>
 * </caption>
 * =ratioUp(8, 43, 2)
 * // Returns 0.19
 */
function ratioUp(numerator, denominator, decimalPlaces) {
  decimalPlaces = (!decimalPlaces ? 2 : decimalPlaces);
  var ratio = (numerator / denominator)*100;
  return Math.round(ratio * Math.pow(10, decimalPlaces)) /
      Math.pow(10, decimalPlaces);
}

/**
 * @function Utils.percentDiff
 *
 * @summary
 * Returns the percentage difference between two numbers.
 *
 * @example
 * <caption>
 *   <h4>Positive change gives you a positive number <br/>
 *     <small>Returns the percentage difference between two numbers</small>
 *   </h4>
 * </caption>
 * //
 * // A1: Yesterday's Visits
 * // A2: 100
 * // B1: Today's Visits
 * // B2: 200
 * // C1: Percentage difference:
 * // C2:
 *    =percentDiff(A2, B2) // 100%
 *
 * @example
 * <caption>
 *   <h4>Negative change gives you a negative number <br/>
 *     <small>Returns the percentage difference between two numbers</small>
 *   </h4>
 * </caption>
 * // A1: Yesterday's Visits
 * // A2: 100
 * // B1: Today's Visits
 * // B2: 75
 * // C1: Percentage difference:
 * // C2:
 *    =percentDiff(A2, B2) // -25%
 *
 * @param  {number} oldNumber Old number
 * @param  {number} newNumber New number
 * @return {number} Percentage difference from the old number to the new one.
 */
function percentDiff(oldNumber, newNumber) {
  return newNumber/oldNumber - 1;
}

/**
 * Returns true if the object is numeric.
 * @param {object} obj Object you want to check
 * @return True if obj is numeric, false if it's not.
 */
function isNumeric(obj) {
  return typeof(input) == 'number';
}

/**
 * @function Utils.rangeToUrlString
 *
 * @summary
 * Returns a comma separated string from a range of cells.  Each one will
 * be encoded so it can safely be used in a URL.
 *
 * @param {string} range A range of cells
 * @return Query string
 * @since 1.0
 *
 * @example
 * <caption>
 *   <h4>Convert to URL string<br/>
 *     <small>Turns an array or range into a comma delimited query string</small>
 *   </h4>
 * </caption>
 * Cells:
 *    A1: domain.com
 *    A2: domain.com/blog
 * =rangeToUrlString(A1:A2)
 * // => "domain.com,domain.com%2Fblog"
 *
 */
function rangeToUrlString(range) {
  if (!isArray(range)) {
    return encodeURIComponent(range);
  } else {
    var encodedUrls = [];
    for (var i = 0; i < range.length; i++) {
      encodedUrls.push(encodeURIComponent(range[i]));
    }
    return encodedUrls.join(',');
  }
}

/**
 * @function Utils.hashToParam
 *
 * @summary
 * Converts a hash to a query parameter
 *
 * @param {hash} hashes Hash
 * @since 1.0
 *
 * @example
 * <caption>
 *   <h4>Negative change gives you a negative number <br/>
 *     <small>Returns the percentage difference between two numbers</small>
 *   </h4>
 * </caption>
 * var queryString = hashToParam({
 *    "key"     : "1234abcd5678",
 *    "param"   : "value",
 *    "param2"  : "value2"
 * }); // => "key=1234abcd5678&param=value&param2=value2"
 */
function hashToParam (hashes) {
  var params = [];
  for (hash in hashes) {
    params.push(hash + "=" + hashes[hash]);
  }
  return params.join("&");
}

/**
 * @function Utils.stripUrlScheme
 *
 * @summary
 * Removes HTTP or HTTPS from the beginning of one or more URLs
 *
 * @param {string} url URL
 * @return URL string without the protocol
 * @since 1.0
 *
 * @example
 * <caption>
 *   <h4>From a range of URLs<br/>
 *     <small>Removes HTTP/HTTP from a range of URLs</small>
 *   </h4>
 * </caption>
 * A1: http://www.domain.com
 * A2: https://www.anotherdomain.com
 * B1: =stripUrlScheme(A1:A2)
 *
 */
function stripUrlScheme (urlRange) {
  urlRange = strToArray(urlRange);
  var len = urlRange.length, i = 0, retval = [];
  while(i < len) {
    retval.push(urlRange[i].replace(/http(s)?:\/\//gi, ""));
    i++;
  }
  return retval;
}

/**
 * @function Utils.getDomainName
 *
 * @summary
 * Extracts the domain from one or many URLs
 *
 * @param {string} urlRange URL
 *
 * @example
 * <caption>
 *   <h4>Get the domain name<br/>
 *     <small>Extracts the domain name from any URL</small>
 *   </h4>
 * </caption>
 * // Returns "domain.com"
 * =getDomainName("http://www.domain.com/blog")
 *
 * @example
 * <caption>
 *   <h4>Get the domain name from a range<br/>
 *     <small>Extracts the domain names from a range of cells</small>
 *   </h4>
 * </caption>
 * =getDomainName(A1:A10)
 * @return Domain name as a string.
 * @since 1.0
 */
function getDomainName (urlRange) {
  urlRange = strToArray(urlRange);
  var regex, returnValue = [];
  for (var i = 0; i < urlRange.length; i++) {
    url = urlRange[i];
    regex = new RegExp(/((www)\.)?.*(\w+)\.([\w\.]{2,6})/);
    returnValue.push([regex.exec(url)[0]
                     .replace(/^http(s)?:\/\//i, "")
                     .replace(/^www\./i, "")
                     .replace(/\/.*$/, "")]);
  }
  return returnValue;
}

/**
 * @function Utils.parseUrl
 *
 * @desc
 *   Separates a URL into seperate pieces (such as the domain name, the path,
 *   or the query string)
 *   <h3>Columns returned</h3>
 *   <ul>
 *     <li>url: <code>http://www.ora.com:80/goodparts?q#fragment</code></li>
 *     <li>scheme: <code>http</code></li>
 *     <li>slash: <code>//</code></li>
 *     <li>host: <code>www.ora.com</code></li>
 *     <li>port: <code>80</code></li>
 *     <li>path: <code>goodparts</code></li>
 *     <li>query: <code>q</code></li>
 *     <li>hash: <code>fragment</code></li>
 *   </ul>
 *   Credit: <a href="http://www.coderholic.com/javascript-the-good-parts/">
 *   JavaScript: The Good Parts</a>
 *
 * @param {string} URL Url to parse
 *
 * @example
 * =parseUrl("http://www.ora.com:80/goodparts?q#fragment");
 *
 */
function parseUrl (url) {
  var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
  var result = parse_url.exec(url);
  var names = ['url', 'scheme', 'slash', 'host', 'port', 'path', 'query', 'hash'];
  var i;
  var retval = new Array;
  for (i = 0; i < names.length; i += 1) {
    retval[names[i]] = result[i];
  }
  return retval;
}

/**
 * @function Utils.jsonStringify
 *
 * @summary
 * Converts an object to a JSON string
 *
 * @desc
 * Credit: {@link https://gist.github.com/754454 }
 *
 * @param {object} obj Object you want to make in to a JSON string
 * @return JSON string
 */
function jsonStringify (obj) {
  var t = typeof (obj);
  if (t != "object" || obj === null) {
    if (t == "string") obj = '"' + obj + '"';
    return String(obj);
  } else {
    var n, v, json = [], arr = (obj && obj.constructor == Array);
    for (n in obj) {
      v = obj[n];
      t = typeof(v);
      if (obj.hasOwnProperty(n)) {
        if (t == "string") {
          v = '"' + v + '"';
        } else if (t == "object" && v !== null) {
          v = jQuery.stringify(v);
        }
        json.push((arr ? "" : '"' + n + '":') + String(v));
      }
    }
    return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
  }
}


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
/* ---------------------------------------------------------------------------
 * string.js
 * -------------------------------------------------------------------------*/

/**
 * Trims whitespace from the beginning and end of a string
 */
String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g, '');
}

/**
 * Removes newlines from a string
 */
String.prototype.stripNewline = function() {
  return this.replace(/\n|\r/g, '');
}

/**
 * Replaces two or more whitespaces with one whitespace
 */
String.prototype.stripMultiSpace = function() { 
  return this.replace(/\s{2,}/g, '');
}

/**
 * Converts a string into a one dimentional array
 */
String.prototype.toArray = function() {
  return [this];
}

/**
 * Returns the string surrounded in single quotes.
 */
String.prototype.inQuotes = function() {
  return "'" + this + "'";
}

/**
 * Lets left n characters from a string
 */
String.prototype.left = function(n) {
  if (n <= 0)
    return "";
  else if (n > String(this).length)
    return this;
  else
    return String(this).substring(0,n);
}

/**
 * Lets right n characters from a string
 */
String.prototype.right = function(n) {
  if (n <= 0)
    return "";
  else if (n > String(this).length)
    return this;
  else {
    var iLen = String(this).length;
    return String(this).substring(iLen, iLen - n);
  }
}

//----------------------------------------------------------------------------
// URLs

/**
 * True if the string has a path
 */
String.prototype.hasPathInURL = function() {
  if (this.indexOf('http') != -1) {
    return (this.split('/').length > 4) ? true : false;
  } else {
    return (this.split('/').length > 2) ? true : false;
  }
}

/**
 * Returns just the domain name of a URL
 */
String.prototype.getDomainName = function() {
  regex = new RegExp(/((www)\.)?.*(\w+)\.([\w\.]{2,6})/);
  return regex.exec(this)[0]
           .replace(/^http(s)?:\/\//i, "")
           .replace(/^www\./i, "")
           .replace(/\/.*$/, "");
}

/**
 * URL encodes a string
 * (Old PHP habit, sorry)
 */
String.prototype.urlencode = function() { 
  return encodeURIComponent(this);
}

//----------------------------------------------------------------------------
// HTML

/**
 * Removes one tag or all tags
 * (Taken from Prototype.js)
 * @param  {string} str String to perform tag removal to
 * @param  {tag} tag HTML tag to remove.  Undefined will remove all tags
 * @return {string} String with tags removed
 */
String.prototype.removeTags = function(tag) {
  if (tag === undefined) {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  } else {
    var reBegin = new RegExp('(<(' + tag + '[^>]+)>)', 'ig');
    var reEnd = new RegExp('(<(\/' + tag + '[^>]?)>)', 'ig');
    return this.replace(reBegin, '').replace(reEnd, '');        
  }  
}

/**
 * Unescapes HTML strings
 */
String.prototype.unescapeHTML = function() {
  // Taken from Prototype
  return this
      .replace(/&lt;/g,'<')
      .replace(/&gt;/g,'>')
      .replace(/&amp;/g,'&')
      .replace(/&#39;/g,"'");
} 

/**
 * Returns just the text inside the body tag
 * @param  {string} str Input string
 * @return {string} The text inside the body tag
 */
String.prototype.contentInBodyTag = function() {
  return this
      .replace(/\n|\r/g, '')
      .match(/\<body.*/)[0]
      .replace(/\</gi, ' <')
      .replace(/\<.*?\>/gi, '');
}

/**
 * Extracts the string between the first instance of (start) and the first
 * instace of (end)
 */
String.prototype.extractBetween = function(start, end) {
  var retval = [];
  var temp = this.split(start);
  var i = 0;
  var len = temp.length;
  if (len > 0) {
    while (i < len) {
      var endIndex = temp[i].indexOf(end);
      if (endIndex > 0) { 
        var content = temp[i].substr(0, endIndex);
        if (content != '...') { retval.push(content); }
      }            
      i++;
    }
    return (retval.length == 1) ? retval[0].toString() : retval;
  } else {
    return false;
  }
}

/**
 * Strips all the whitespaces from a string
 */
String.prototype.stripAllSpaces = function() {
  return this.replace(/ /g, '');
}

//----------------------------------------------------------------------------
// Google Analytics

/**
 * Escapes characters for use with Google Analytics.
 */
String.prototype.encodeGa = function() {

  var el = this.split('ga:');
  var i = 0; len = el.length;
  while (i < len) {
    el[i] = el[i]
      .trim()
      .replace(/=/g, '%3D')           // escape equals sign
      .replace(/>/g, '%3E')           // escape equals sign
      .replace(/</g, '%3C')           // escape equals sign
      .replace(/,\s{1,}/g, ',')       // remove white space after ,
      .replace(/;\s{1,}/g, ';')       // remove white space after ;
      .replace(/\s/, '%20')           // convert remaining spaces to %20
      ;
    i++;
  }
  return el.join('ga:');

}

/* ---------------------------------------------------------------------------
 * ga_tools.js
 * -------------------------------------------------------------------------*/

SeerJs.GoogleAnalyticsTools = { 

  /**
   * Create event tracking code in JavaScript
   * @param  {[type]} category       [description]
   * @param  {[type]} action         [description]
   * @param  {[type]} label          [description]
   * @param  {[type]} value          [description]
   * @param  {[type]} implicitCount  [description]
   * @param  {[type]} optGaArrayName [description]
   * @return {[type]}
   */
  trackEvent: function(category, action, optLabel, optValue, implicitCount, optGaArrayName) {
    
    // Assign default values
    optGaArrayName = optGaArrayName || '_gaq';
    label = optLabel || undefined;
    value = parseInt(optValue) || undefined;

    // Check for require fields
    if (category === undefined) { SeerJs.Error.set('Category is required.'); }
    if (action === undefined) { SeerJs.Error.set('Action is required.'); }
    if (SeerJs.Error.hasOccurred()) { return SeerJs.Error.get(); }
    
    // Generate the event tracking event
    var pushArray = [
      '_trackEvent'.inQuotes(),
      category.inQuotes(),
      action.inQuotes()
    ];
    if (label != undefined) { pushArray.push(label.inQuotes()); }
    if (value != undefined) { pushArray.push(value); }

    // return a push
    return optGaArrayName + '.push([' + pushArray.join(',') + ']);';
  },

  outboundEventTracking: function(outboundLink, anchorText, category, 
                                  optNewWindow, optGaArrayName) {
    
    var target = (optNewWindow) ? ' target="_blank" ' : '';
    var ahref = '<a href="' + outboundLink + '" onClick="' 
        + trackEvent(category, 'outboundClick', outboundLink)
        + target + '>' + anchorText + '</a>';
    var getGaMetric = 'getGaMetric(clientId, "totalEvents", startDate, endDate, ,'
        + '"ga:eventCategory==' + category + ','
        + '"ga:eventAction==outboundClick,'
        + '"ga:eventLabel==' + outboundLink + '")';
    return [ahref, getGaMetric];
    
  }

};

function createEventTrackingCode(category, action, label, value, implicitCount, 
                           optGaArrayName) {
  return SeerJs.GoogleAnalyticsTools.trackEvent(category, action, label, value,
      implicitCount, optGaArrayName);
}

/* ---------------------------------------------------------------------------
 * google_scraper.js
 * -------------------------------------------------------------------------*/
/**
 @namespace     GoogleScraper
 @classdesc     Google Scraper
 @author        Chris Le <chrisl at seerinteractive.com>
 @exposeModule  SeerJs.GoogleScrape
 @exposeAs      GoogleScrape
 */

SeerJs.GoogleScraper = (function() {

  var errorOccurred;

  /**
   * Gets stuff inside two tags
   * @param  {string} haystack String to look into
   * @param  {string} start Starting tag
   * @param  {string} end Ending tag
   * @return {string} Stuff inside the two tags
   */
  function getInside(haystack, start, end) {
    var startIndex = haystack.indexOf(start) + start.length;
    var endIndex = haystack.indexOf(end);
    return haystack.substr(startIndex, endIndex - startIndex);
  }

  /**
   * Fetch keywords from Google.  Returns error message if an error occurs.
   * @param {string} kw Keyword
   * @param {array} optResults (Optional) Number of results to return (defaults to 10)
   * @param {string} optTld (Optional) Top level domain (eg: ".co.uk". Defaults to ".com")
   * @param {string} optStart (Optional) Sets the starting offset for results (defaults to 0)
   */
  function fetch(kw, optResults, optTld, optStart) {
    errorOccurred = false;
    optResults = optResults || 10;
    optStart = optStart || 0;
    optTld = optTld || '.com';
    try {
      var url = 'http://www.google' + optTld + '/search?q=' + kw + '&start=' + optStart + '&num=' + optResults;
      return UrlFetchApp.fetch(url).getContentText()
    } catch(e) {
      errorOccurred = true;
      return e;
    }
  }

  /**
   * Extracts the URL from an organic result. Returns false if nothing is found.
   * @param {string} result XML string of the result
   */
  function extractUrl(result) {
    var url;
    if (result.match(/\/url\?q=/)) {
      url = getInside(result, "?q=", "&amp");
      return (url != '') ? url : false
    }
    return false;
  }

  /**
   * Extracts the organic results from the page and puts them into an array.
   * One per element.  Each element is an XMLElement.
   */
  function extractOrganic(html) {
    html = html.replace(/\n|\r/g, '');
    var allOrganic = html.match(/<li class=\"g\">(.*)<\/li>/gi).toString(),
        results = allOrganic.split("<li class=\"g\">"),
        organicData = [],
        i = 0,
        len = results.length,
        url;
    while(i < len) {
      url = extractUrl(results[i]);
      if (url && url.indexOf('http') == 0) {
        organicData.push(url);
      }
      i++;
    }
    return organicData;
  }

  /**
   * Transpose an array from row to cols
   */
  function transpose(ary) {
    var i = 0, len = ary.length, ret = [];
    while(i < len) {
      ret.push([ary[i]]);
      i++;
    }
    return ret;
  }

  //--------------------------------------------------------------------------

  return {
    /**
     * Returns Google SERPs for a given keyword
     * @param  {string} kw Keyword
     */
    get: function(kw, optResults, tld, optStart) {
      var result = fetch(kw, optResults, tld, optStart);
      if (errorOccurred) { return result; }
      return transpose(extractOrganic(result));
    }
  }

})();

//--------------------------------------------------------------------------
// Expose functions to Google Docs

/**
 * @summary
 * Returns Google SERPs URLs for a given keyword.  Does not return universal
 * search
 *
 * @function GoogleScraper.googleScraper
 * @since  1.5
 * @param  {string} keyword Keyword
 * @param {string} optTld (Optional) Top level domain (eg: ".co.uk". Defaults to ".com")
 * @param {string} optStart (Optional) Sets the starting offset for results (defaults to 0)
 */
function googleScraper(keyword, optResults, optTld, optStart) {
  return SeerJs.GoogleScraper.get(keyword, optResults, optTld, optStart);
}

//-------------------------------------------------------------------------
// SerpParser 
// 
// Given HTML from a Google page it will return 

SeerJs.GoogleSerpParser = function(html, options) {
  init();

  function init() {
    var temp = html;
    html = temp.replace(/\n|\r/g, '');
  }

  function extractTags(haystack, start, end) {
    var retval = [];
    var temp = haystack.split(start);
    var i = 0;
    var len = temp.length;
    if (len > 0) {
      while (i < len) {
        var endIndex = temp[i].indexOf(end);
        if (endIndex > 0) { 
          // console.log(endIndex);
          var content = temp[i].substr(0, endIndex);
          // console.log('pushing --- ' + content)
          if (content != '...') { retval.push(content); }
        }            
        i++;
      }
      return (retval.length == 1) ? retval[0].toString() : retval;
    } else {
      return false;
    }
  }

  function eachTag(section, tag, block) {
    var temp = section.split(tag), i = 0, len = temp.length;
    if (len > 0) {
      while (i < len) {
        block(temp[i]);
        i++;
      }
    }
  }

  function organicSection() {
    var z = html;
    return html.match(
        /<div id=\"res\"><div id=\"ires\"><ol>(.*)<\/ol><\/div><\/div>/
        )[1].toString();
  }

  function extractOrganicResult(serp) {
    var temp;
    temp = {
      'title'   : extractTags(serp, '<h3 class="r">', '</h3>').removeTags().unescapeHTML(),
      'url'     : extractTags(serp, '/url?q=', '&amp;sa'),
      'desc'    : extractTags(serp, '<div class="s">', '<div>').removeTags().unescapeHTML(),
      'cite'    : extractTags(serp, '<cite>', '</cite>').toString().removeTags().unescapeHTML(),
      'bolded'  : extractTags(serp, '<b>', '</b>').toString(),
      'cache'   : 'http:' + extractTags(serp, '"flc"> - <a href=\"', '\">Cached</a>')
    };
    temp = handleUniversalResult(serp, temp);
    return temp;
  }

  function handleUniversalResult(serp, result) {
    if (options['showUniversal']) {
      if (result['url'].length === 0) {
        result['url'] = 'http://www.google.com/' + extractTags(serp, '<a href=\"\/', '\">')[1];
      }        
    }
    return result;
  }

  return {

    all: function() {
      var results = [], result;
      eachTag(organicSection(), '<li class=\"g\">', function(serp) {
        if (serp.length ) {
          var result = extractOrganicResult(serp);
          if (result['url'].length > 0) { results.push(result); }
        }
      });
      return results;
    }

  };
};
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
/* ---------------------------------------------------------------------------
 * OnPage.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     OnPage
 @classdesc     On-page Analysis Tools
 @exposeModule  SeerJs.OnPage
 @exposeAs      OnPage
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.OnPage = (function() { 

  return {
    /**
     * Gets the HTML content from a URL and puts the whole thing in a cell.
     * @param  {string} url URL to get content from
     * @return {string} HTML content
     * @since 1.5
     * @function OnPage.getOnPageContent
     * 
     * @example
     * Cells:
     *   A1: http://www.seerinteractive.com
     * =getHttpContent(A1)
     * 
     * // Directly using a parameter instead of cell
     * =getHttpContent("http://www.seerinteractive.com")
     * 
     */
    content: function (url) {
      return SeerJs.Http.fetch(url).trim();
    },

    /**
     * @summary
     * Gets the content's text without HTML that is inside the body tag.
     * 
     * 
     * @param  {string} url URL to get text from
     * @return {string} Text thats in the body tag
     * @since  1.4
     * @function OnPage.getOnPageBodyText
     * 
     * @example
     * Cells:
     *   A1: http://www.seerinteractive.com
     * =getOnPageBodyText(A1)
     * 
     * // Directly using a parameter instead of cell
     * =getOnPageBodyText("http://www.seerinteractive.com")
     * 
     */
    bodyText: function (url) {
      return SeerJs.Http.fetch(url).contentInBodyTag();
    },

    /**
     * @summary
     * Counts the number of words that are inside the HTML body
     * 
     * @param  {string} url URL that you want to get a word count from
     * @return {integer} Number of words in the body
     * @since 1.4
     * @function OnPage.getOnPageBodyWordCount
     * 
     * @example
     * Cells:
     * A1: http://www.seerinteractive.com
     * =getOnPageBodyWordCount(A1)
     * 
     * // Without using a cell
     * =getOnPageBodyWordCount("http://www.seerinteractive.com")
     * 
     */ 
    bodyWordCount: function (url) {
      var plainText = SeerJs.Http.fetch(url).contentInBodyTag();
      if (!SeerJs.Error.hasOccurred()) {
        var words = plainText.split(/[\s\t\n\r]+/g);
        return words.length;
      } else {
        return SeerJs.Error.get();
      }
    },

    /**
     * Detect a URL inside an arbitrary string
     * see: http://daringfireball.net/2010/07/improved_regex_for_matching_urls
     * 
     */
    detectUrl: function(str) {
        // (?i)\b((?:[a-z][\w-]+:(?:/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))
        // (?i)\b((?:https?://|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))
    }

  };

})();

function getOnPageContent(url) { return (SeerJs.Error.hasOccurred()) ? SeerJs.Error.get() : SeerJs.OnPage.content(url); }

function getOnPageBodyText(url) { return (SeerJs.Error.hasOccurred()) ? SeerJs.Error.get() : SeerJs.OnPage.bodyText(url); }

function getOnPageBodyWordCount(url) { return (SeerJs.Error.hasOccurred()) ? SeerJs.Error.get() : SeerJs.OnPage.bodyWordCount(url); }


/*
ideas:

seo - onpage
LinkCount
HtmlTitle
HtmlMetaDescription
HtmlMetaKeywords
HtmlMeta
HtmlFirst
HtmlH1
HtmlH2
HtmlH3
HtmlCanonical
W3CValidate
PageCodeToTextRatio
PageSize
PageTextSize
PageCodeSize
HttpStatus
HttpHeader
ResponseTime
PageEncoding
IsFoundOnPage

content
FindDuplicatedContent
CountWords
LCS
SpinText

backlinks
CheckBacklink
GooglePageRank
GoogleResultCount
GoogleIndexCount
GoogleLinkCount
AlexaReach
AlexaPopularity
AlexaLinkCount
BleckoLinkingDomains
BleckoInboundLinks

network
WhoIs
WhoIsDomainCreated
WhoIsDomainUpdated
WhoIsDomainExpires
IsDomainRegistered
InternetArchiveFirstSeen
DomainAge
ResolveIp

string
Format
StringJoin
RegexpIsMatch
RegexpFind
RegexpReplace
UrlEncode
UrlDecode
UrlProperty

social
FacebookLikes
GooglePlusCount
TwitterCount

*/
/* ---------------------------------------------------------------------------
 * redirection.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Redirection
 @classdesc     Redirection Tools
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.Redirection = (function() { 

  return {
    /**
     * Generates an .htaccess 301 redirect directive
     */
    htaccessRedirect: function (oldUrl, newUrl) {
      var path = parseUrl(oldUrl)["path"] || '/';
      return "Redirect 301 " + path + " " + newUrl;
    }

  };

})();

/**
 * @function Redirection.createHtaccessRedirect
 * @since 1.3
 * 
 * @summary
 * Generates .htaccess code to 301 redirect an old link to a new one.
 * 
 * @desc 
 * Inspired by {@link http://www.thegooglecache.com/rants-and-raves/new-pagerank-recovery-tool/}
 * 
 * @param {string} oldUrl The old URL you want to 301 redirect
 * @param {string} newUrl The new URL
 * 
 * @example
 * A1: http://www.domain.com/old-page
 * B1: http://www.domain.com/new-page
 * C1: =createHtaccessRedirect(A1, B1)
 * 
 */
function createHtaccessRedirect(oldUrl, newUrl) { 
  return (SeerJs.Error.hasOccurred()) 
      ? SeerJs.Error.get() 
      : SeerJs.Redirection.htaccessRedirect(oldUrl, newUrl);
}

/* ---------------------------------------------------------------------------
 * hashes.js
 * -------------------------------------------------------------------------*/
/**
 @namespace     Hashes
 @classdesc     Hash Calculations
 @author        Chris Le <chrisl at seerinteractive.com>
 @exposeModule  SeerJs.Hashes
 @exposeAs      Hashes
 */

/**
 * @summary
 * Returns a base64 encoded MD5 hash of a string
 *
 * @function Hashes.computeMD5
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeMD5(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA1 hash of a string
 *
 * @function Hashes.computeSHA1
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA1(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA256 hash of a string
 *
 * @function Hashes.computeSHA256
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA256(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA384 hash of a string
 *
 * @function Hashes.computeSHA384
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA384(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_384, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA512 hash of a string
 *
 * @function Hashes.computeSHA512
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA512(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, str);
  return Utilities.base64Encode(digest);
}
/* ---------------------------------------------------------------------------
 * google_analytics.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     GoogleAnalytics
 @classdesc     Google Analytics API
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.GaApi = (function() { 

  GOOGLE_ANALYTICS_TOKEN = getSetting("Google Analytics Token");
  GOOGLE_ANALYTICS_USERNAME = getSetting("Google Analytics Username");
  GOOGLE_ANALYTICS_PASSWORD = getSetting("Google Analytics Password");

  function getGAauthenticationToken_(email, password) {
  /**
   * Fetches GA authentication token, which can then be used to fetch data with 
   * the getGAdata_ function
   *
   * @param   email     Email address used to login to Google Analytics
   * @param   password  Password used to login to Google Analytics
   * @return  Authentication token
   * @since 1.0
   * @author  Mikael Thuneberg
   */
    try {
      if (typeof email == "undefined") {
        return "Email address missing";
      }
      if (typeof password == "undefined") {
        return "Password missing";
      }
      if (email.length == 0) {
        return "Email address missing";
      }
      if (password.length == 0) {
        return "Password missing";
      }
      password = encodeURIComponent(password);
      var responseStr
      var response = UrlFetchApp.fetch(
          "https://www.google.com/accounts/ClientLogin", {
            method: "post",      
            payload: "accountType=GOOGLE&Email=" + email + "&Passwd=" + password +
              "&service=analytics&Source=SEER_Interactive_1.0" +
              "functions-1.0"
      });
      responseStr = response.getContentText();
      responseStr = responseStr.slice(responseStr.search("Auth=") + 5, 
          responseStr.length);
      return responseStr;
    } catch (e) {
      if (e.message.indexOf("CaptchaRequired") != -1) {
        return "Complete CAPTCHA at http://www.google.com/accounts/" + 
            e.message.slice(e.message.indexOf("CaptchaUrl=") + 11, 
            e.message.indexOf("Error=") - 1);
      } else {
        return "Authentication failed (" + e.message + ")";
      }
    }
  }

  function getGAaccountData_(authToken, dataType, includeHeaders, maxRows, 
                            startFromRow) {

    if (typeof authToken == "undefined") {
        return "Authentication token missing";
      }
      dataType = (typeof dataType == "undefined") ? "profiles" : dataType;
      maxRows = (typeof maxRows == "undefined") ? 200 : maxRows;
      maxRows = (typeof maxRows == "string") ? 200 : maxRows;
      startFromRow = (typeof startFromRow == "undefined") ? 1 : startFromRow;
      startFromRow = (typeof startFromRow == "string") ? 1 : startFromRow;
      if (authToken.length == 0) {
        return "Authentication token missing";
      }
      if (dataType.length == 0) {
        dataType = "profiles";
      }
      if (authToken.indexOf("Authentication failed") != -1) {
        return "Authentication failed";
      }
    try {
        authToken = authToken.replace(/\n/g, "");
        dataType = dataType.toLowerCase();
        var URL = "https://www.google.com/analytics/feeds/accounts/default?max-results=" + 
            maxRows + "&start-index=" + startFromRow;
        var responseStr;
        var response = UrlFetchApp.fetch(URL, {
            method: "get",
            headers: {
              "Authorization": "GoogleLogin auth=" + authToken,
              "GData-Version": "2"
            }
        });
        responseStr = response.getContentText();
        var XMLdoc = Xml.parse(responseStr);
        var lapset2;
        var TempArray = [];
        var RowArray = [];
        var HeaderArray = [];
        if (includeHeaders == true) {
          var rivi = 1;
          if (dataType == "segments") {
            HeaderArray[0] = "Segment ID";
            HeaderArray[1] = "Segment Name";
            HeaderArray[2] = "Segment Definition";
          } else {
            HeaderArray[0] = "Account Name";
            HeaderArray[1] = "Profile Title";
            HeaderArray[2] = "Profile Number";
          }
          TempArray[0] = HeaderArray;
        } else {
          var rivi = 0;
        }
        var sar = 0;
        var lapset;
        var dataFound = false;
        if (dataType == "segments") {
          lapset = XMLdoc.getElement().getElements();
          for (i = 0; i < lapset.length; i++) {
            if (lapset[i].getName().getLocalName() == "segment") {
              sar = 0;
              RowArray[0] = lapset[i].getAttribute("id").getValue();
              RowArray[1] = lapset[i].getAttribute("name").getValue();
              lapset2 = lapset[i].getElements();
              for (j = 0; j < lapset2.length; j++) {
                if (lapset2[j].getName().getLocalName() == "definition") {
                  RowArray[2] = lapset2[j].getText();
                }
              }
              TempArray[rivi] = RowArray;
              RowArray = [];
              dataFound = true;
              rivi++;
              if (rivi == maxRows) {
                return TempArray;
              }
            } else {
              if (lapset[i].getName().getLocalName() == "entry") {
                break;
              }
            }
          }
        } else { // datatype = profiles 
          lapset = XMLdoc.getElement().getElements("entry");
          for (i = 0; i < lapset.length; i++) {
            sar = 0;
            lapset2 = lapset[i].getElements();
            for (j = 0; j < lapset2.length; j++) {
              if (lapset2[j].getName().getLocalName() == "title") {
                RowArray[1] = " " + lapset2[j].getText();
                dataFound = true;
              } else {
                if (lapset2[j].getName().getLocalName() == "property") {
                  if (lapset2[j].getAttribute("name").getValue() == "ga:accountName") {
                    RowArray[0] = lapset2[j].getAttribute("value").getValue();
                  }
                  if (lapset2[j].getAttribute("name").getValue() == "ga:profileId") {
                    RowArray[2] = lapset2[j].getAttribute("value").getValue();
                    break;
                  }
                }
              }
            }
            TempArray[rivi] = RowArray;
            RowArray = [];
            dataFound = true;
            rivi++;
            if (rivi == maxRows) {
              return TempArray;
            }
          }
        }
        if (dataFound == false) {
          return "No data found";
        }
        return TempArray;
    } catch (e) {
        return "Fetching account data failed (" + e.message + ")";
      }
  }

  function getGAdata_(authToken, profileNumber, metrics, startDate, endDate,
                     filters, dimensions, segment, sort, includeHeaders, maxRows, 
                     startFromRow) {
  /**
   * Fetches data from the GA profile specified
   *
   * Fetches data from the GA profile specified using the authentication token
   * generated by the getGAauthenticationToken_ function For instructions on the
   * parameters, see {@link http://bit.ly/bUYMDs}
   *
   * @param   authToken
   * @param   profileNumber
   * @param   metrics
   * @param   startDate
   * @param   endDate
   * @param   filters
   * @param   dimensions
   * @param   segment
   * @param   sort
   * @param   includeHeaders
   * @param   maxRows
   * @param   startFromRow
   * @return  desc
   * @author  Mikael Thuneberg (AutomateAnalytics.com)
   */
    try {
      startDate.getYear();
    } catch (e) {
      return "Invalid start date";
    }
    try {
      endDate.getYear();
    } catch (e) {
      return "Invalid end date";
    }
    try {
      if (typeof authToken == "undefined") {
        return "Authentication token missing";
      }
      if (typeof profileNumber == "undefined") {
        return "Profile number missing";
      }
      if (typeof metrics == "undefined") {
        return "Specify at least one metric";
      }
      if (profileNumber != parseInt(profileNumber)) {
        return "Invalid profile number";
      }
      filters = (typeof filters == "undefined") ? "" : filters;
      dimensions = (typeof dimensions == "undefined") ? "" : dimensions;
      segment = (typeof segment == "undefined") ? "" : segment;
      maxRows = (typeof maxRows == "undefined") ? 100 : maxRows;
      maxRows = (typeof maxRows == "string") ? 100 : maxRows;
      startFromRow = (typeof startFromRow == "undefined") ? 1 : startFromRow;
      startFromRow = (typeof startFromRow == "string") ? 1 : startFromRow;
      if (authToken.length == 0) {
        return "Authentication token missing";
      }
      if (profileNumber.length == 0) {
        return "Profile number missing";
      }
      if (metrics.length == 0) {
        return "Specify at least one metric";
      }
      if (authToken.indexOf("Authentication failed") != -1) {
        return "Authentication failed";
      }
      authToken = authToken.replace(/\n/g, "");
      var startDateString
      var endDateString
      var dMonth
      var dDay
      if (startDate.getMonth() + 1 < 10) {
        dMonth = "0" + (startDate.getMonth() + 1);
      } else {
        dMonth = startDate.getMonth() + 1;
      }
      if (startDate.getDate() < 10) {
        dDay = "0" + startDate.getDate();
      } else {
        dDay = startDate.getDate();
      }
      startDateString = startDate.getYear() + "-" + dMonth + "-" + dDay
      if (endDate.getMonth() + 1 < 10) {
        dMonth = "0" + (endDate.getMonth() + 1);
      } else {
        dMonth = endDate.getMonth() + 1;
      }
      if (endDate.getDate() < 10) {
        dDay = "0" + endDate.getDate();
      } else {
        dDay = endDate.getDate();
      }
      endDateString = endDate.getYear() + "-" + dMonth + "-" + dDay
      if (startDateString > endDateString) {
        return "Start date should be before end date";
      }
      var URL = "https://www.google.com/analytics/feeds/data?ids=ga:" + 
          profileNumber + "&start-date=" + startDateString + "&end-date=" + 
          endDateString + "&max-results=" + maxRows + "&start-index=" + 
          startFromRow;
      if (metrics.slice(0, 3) != "ga:") {
        metrics = "ga:" + metrics;
      }
      metrics = metrics.replace(/&/g, "&ga:");
      metrics = metrics.replace(/ga:ga:/g, "ga:");
      metrics = metrics.replace(/&/g, "%2C");
      URL = URL + "&metrics=" + metrics
      if (dimensions.length > 0) {
        if (dimensions.slice(0, 3) != "ga:") {
          dimensions = "ga:" + dimensions;
        }
        dimensions = dimensions.replace(/&/g, "&ga:");
        dimensions = dimensions.replace(/ga:ga:/g, "ga:");
        dimensions = dimensions.replace(/&/g, "%2C");
        URL = URL + "&dimensions=" + dimensions;
      }
      if (filters.length > 0) {
        if (filters.slice(0, 3) != "ga:") {
          filters = "ga:" + filters;
        }
        filters = filters.replace(/,/g, ",ga:");
        filters = filters.replace(/;/g, ";ga:");
        filters = filters.replace(/ga:ga:/g, "ga:");
        filters = encodeURIComponent(filters);
        URL = URL + "&filters=" + filters;
      }
      if (typeof(segment) == "number") {
        segment = "gaid::" + segment;
      }
      if (segment.length > 0) {
        if (segment.indexOf("gaid::") == -1 && segment.indexOf("dynamic::") == -1) {
          if (segment.slice(0, 3) != "ga:") {
            segment = "ga:" + segment;
          }
          segment = "dynamic::" + segment;
        }
        segment = encodeURIComponent(segment);
        URL = URL + "&segment=" + segment;
      }
      if (sort.length > 0) {
        URL = URL + "&sort=" + sort;
      }
    }
    catch (e) {
      //return "Fetching data failed (" + e.message + ")";
      return getInternalReason_(e.message);
    }
    try {
      var randnumber = Math.random()*5000;
      Utilities.sleep(randnumber);
      var response = UrlFetchApp.fetch(URL, {
          method: "get",
          headers: {
            "Authorization": "GoogleLogin auth=" + authToken,
            "GData-Version": "2"
          }
      });
    } catch (e) {
      if (e.message.indexOf("Timeout") != -1) {
        response = UrlFetchApp.fetch(URL, {
            method: "get",
            headers: {
              "Authorization": "GoogleLogin auth=" + authToken,
              "GData-Version": "2"
            }
        });
      } else {
        //return "Fetching data failed (" + e.message + ")";
      return getInternalReason_(e.message);
      }
    }
    try {
      var responseStr = response.getContentText();
      var XMLdoc = Xml.parse(responseStr);
      var lapset = XMLdoc.getElement().getElements("entry");
      var lapset2;
      var TempArray = [];
      var RowArray = [];
      var HeaderArray = [];
      if (includeHeaders == true) {
        var rivi = 1;
      } else {
        var rivi = 0;
      }
      var sar = 0;
      var dataFound = false;
      for (i = 0; i < lapset.length; i++) {
        sar = 0;
        lapset2 = lapset[i].getElements();
        for (j = 0; j < lapset2.length; j++) {
          if (lapset2[j].getName().getLocalName() == "dimension") {
            RowArray[sar] = lapset2[j].getAttribute("value").getValue();
            if (rivi == 1) {
              HeaderArray[sar] = lapset2[j].getAttribute("name").getValue();
            }
            sar++;
          }
          if (lapset2[j].getName().getLocalName() == "metric") {
            RowArray[sar] = Number(lapset2[j].getAttribute("value").getValue());
            if (rivi == 1) {
              HeaderArray[sar] = lapset2[j].getAttribute("name").getValue();
            }
            sar++;
          }
        }
        TempArray[rivi] = RowArray;
        RowArray = [];
        dataFound = true;
        rivi++;
      }
      if (dataFound == false) {
        return "No data found";
      }
      if (includeHeaders == true) {
        TempArray[0] = HeaderArray;
      }
      return TempArray;
    } catch (e) {
      //return "Fetching data failed (" + e.message + ")";
      return getInternalReason_(e.message);
    }
  }

  function getInternalReason_(response) {
    /**
     * Returns the internal reason for an error. If none found it returns the raw 
     * error response.
     */
    var failureReason = response.match(
        /<internalReason\b[^>]*>(.*?)<\/internalReason>/);
    if (failureReason == null) {
      return response;
    } else {
      return failureReason[1];  
    }
  }

  function gaToken_() {
    if (!GOOGLE_ANALYTICS_TOKEN.length) {
      GOOGLE_ANALYTICS_TOKEN = getGAauthenticationToken_(
          GOOGLE_ANALYTICS_USERNAME, GOOGLE_ANALYTICS_PASSWORD);
    }
    return GOOGLE_ANALYTICS_TOKEN;
  }

  //--------------------------------------------------------------------------

  return {
    metric: function(profileId, metrics, startDate, endDate, optFilter, 
                     optDimensions, optSegment, optSort, optIncludeHeaders, 
                     optMax, optEnableSleep) {
      if (isInFuture(startDate)) { return "(Future date)"; }
      if (optFilter == undefined) { optFilter = ""; }
      if (optDimensions == undefined) { optDimensions = ""; }
      if (optSegment == undefined) { optSegment = ""; }
      if (optSort == undefined) { optSort = ""; }
      if (optIncludeHeaders == undefined) { optIncludeHeaders = ""; }
      if (optMax == undefined) { optMax = ""; }
      if (optEnableSleep == undefined) { optEnableSleep = true; }

      if (optEnableSleep) { Utilities.sleep(Math.random()*5000); }

      return getGAdata_(gaToken_(), profileId, "ga:" + metrics, startDate, 
          endDate, optFilter, optDimensions, optSegment, optSort, 
          optIncludeHeaders, optMax);
    },
    
    keywordCount: function(profileId, startDate, endDate) {
      var keywords = getGaMetric(profileId, "visits", startDate, endDate, "", 
          "ga:keyword", "", "-ga:visits", false, 200000);
      return keywords.length;
    }    

  };

})();

/**
 * @function GoogleAnalytics.getGaMetric
 * @since 1.0
 *
 * @summary
 *   Gets analytics data from Google Analytics to create custom
 *   reports for multiple clients and profiles.
 * 
 * @desc
 *   <p>Gets analytics data by metrics and dimensions within a date range.</p>
 *   <p>It will return an error if the date is in the future or if the start
 *   date is after the begining date.</p>
 *   <hr/>
 *   <div class="alert alert-success">
 *     <strong>Tip:</strong> A complete list of metrics and dimensions is available on
 *     the <a href="http://code.google.com/apis/analytics/docs/gdata/dimsmets/dimsmets.html" target="_blank">Google Analytics API</a> website.
 *   </div> 
 *
 * @param {Number} profileId
 *        The ID number for the profile
 *        
 * @param {String} metric 
 *        Google Analytics metric you want to get data for. <br/>
 *        <span class="label label-info">Note</span>
 *        You must add <code>ga:</code> if you're using multiple metrics in 
 *        on the same function.  It's not required if you only use one metric.
 *        <div class="well">
 *          <h6>Common metrics</h6>
 *          <dl>
 *            <dt>ga:visits              </dt><dd>Total number of visitors to your website for the requested time period.</dd>
 *            <dt>ga:bounces             </dt><dd>The total number of single-page (or event) sessions to your website.</dd>
 *            <dt>ga:goal(n)completions  </dt><dd>The total number of completions for the requested goal number.</dd>
 *            <dt>ga:totalEvents         </dt><dd>The total number of events for the profile, across all categories</dd>
 *            <dt>ga:pageLoadTime        </dt><dd>Total Page Load Time is the amount of time (in milliseconds).</dd>
 *            <dt>ga:transactions        </dt><dd>The total number of transactions.</dd>
 *          </dl>
 *        </div>
 *
 * @param {Date} startDate
 *        Starting date
 *        
 * @param {Date} endDate
 *        Ending date<br/>
 *        <span class="label label-important">Limitation</span>
 *        Long date ranges may timeout with high traffic profiles.  Try a
 *        shorter date range.<br/>
 *        <span class="label label-warning">Warning</span>
 *        Long date ranges may result in sampled numbers.
 *        
 * @param {Filter} optFilter           
 *        <em class="muted">(Optional)</em> Filter data from your results. 
 *        <h6>Available operators</h6> 
 *        <ul class="unstyled">
 *          <li><code>==</code> Equals</li>
 *          <li><code>!=</code> Does not equal</li>
 *          <li><code>>&nbsp;</code>  Greater than</li>
 *          <li><code><&nbsp;</code>  Less than</li>
 *          <li><code>>=</code> Greater than or equal to</li>
 *          <li><code><=</code> Less than or equal to</li>
 *        </ul>
 *        <h6></h6> 
 *        <ul class="unstyled">
 *          <li><code>;</code> And </li>
 *          <li><code>,</code> Or</li>
 *        </ul>
 *        See at the <a href="#multiple_filters">examples below</a> or go to the 
 *        <a href="http://code.google.com/apis/analytics/docs/gdata/v2/gdataReferenceDataFeed.html#filters">
 *        filters section</a> on the Google Analytics' API website for more
 *        details.
 *        
 * @param {String} optDimensions       
 *        <em class="muted">(Optional)</em> Dimentions.
 *        <h6>Available operators</h6> 
 *        <ul class="unstyled">
 *          <li><code>==</code> Exact match</li>
 *          <li><code>!=</code> Does not match</li>
 *          <li><code>=@</code> Contains substring</li>
 *          <li><code>!@</code> Does not contain substring</li>
 *          <li><code>=~</code> Matches regular expression</li>
 *          <li><code>!~</code> Does not match regular expression</li>
 *        </ul>
 *        <div class="well">
 *          <h6>Common dimensions</h6>
 *          <dl>
 *            <dt>ga:visitorType     </dt> <dd>A boolean indicating if a visitor is new or returning. Possible values: New Visitor, Returning Visitor..</dd>
 *            <dt>ga:referralPath    </dt> <dd>The path of the referring URL.</dd>
 *            <dt>ga:source          </dt> <dd>The domain of the referring URL, or "google" with AdWords autotagging.</dd>
 *            <dt>ga:medium          </dt> <dd>May be "organic", "referral" or "ppc" if used with AdWords autotagging.</dd>
 *            <dt>ga:keyword         </dt> <dd>The keyword used to reach the website.</dd>
 *            <dt>ga:city            </dt> <dd>The cities of website visitors.</dd>
 *            <dt>ga:region          </dt> <dd>The state of website visitors.</dd>
 *          </dl>
 *        </div>
 *        See <a href="http://code.google.com/apis/analytics/docs/gdata/v2/gdataReferenceDataFeed.html#dimensions">
 *        dimensions</a> on the Google Analytics' API website for more details.
 *        
 * @param {Number} optSegment          
 *        <em class="muted">(Optional)</em> Segment ID
 *        
 * @param {String} optSort             
 *        <em class="muted">(Optional)</em> Sort
 *        
 * @param {Boolean} optIncludeHeaders   
 *        <em class="muted">(Optional)</em> Include headers (true or false)
 *        
 * @param {Number}  optMax              
 *        <em class="muted">(Optional)</em> Maximum rows
 *        
 * @param {Number}  optEnableSleep      
 *        <em class="muted">(Optional)</em> Slow down API calls (default is true)
 *
 * @example
 * <caption>
 *   <h4>The basics:<br/>
 *     <small>Number of visitors between Nov 11, 2011 and Nov 20, 2011</small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits
 *   A3: 11/01/2011
 *   A4: 11/20/2011
 * =getGaMetric(A1, A2, A3, A4)
 * 
 * @example
 * <caption>
 *   <h4>One filter:<br/>
 *     <small>Number of organic visitors between Nov 11, 2011 and Nov 20, 2011.</small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits
 *   A3: 11/01/2011
 *   A4: 11/02/2011
 *   A5: ga:medium==organic
 * =getGaMetric(A1, A2, A3, A4, A5)
 * 
 * @example
 * <caption>
 *   <a name="multiple_filters"></a>
 *   <h4>Filter A (and) Filter B:<br/>
 *     <small>
 *       Get the number of visitors between Nov 11, 2011 and Nov 20, 2011
 *       that is both organic traffic and came in using the keyword 
 *       "seo company"
 *     </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits
 *   A3: 11/01/2011
 *   A4: 11/02/2011
 *   A5: ga:medium==organic;ga:keyword==seo company
 * =getGaMetric(A1, A2, A3, A4, A5)
 * 
 * @example
 * <caption>
 *   <h4>Filter A (or) Filter B:<br/>
 *     <small>
 *       Get the number of visitors between Nov 11, 2011 and Nov 20, 2011
 *       that came in using the keyword "seo company" or "philadelphia seo"
 *     </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits
 *   A3: 11/01/2011
 *   A4: 11/02/2011
 *   A5: ga:keyword==seo company,ga:keyword==philadelphia seo
 * =getGaMetric(A1, A2, A3, A4, A5)
 * 
 * @example
 * <caption>
 *   <h4>Visits by month (dimensions)<br/>
 *     <small> Get visits in the date range broken down by month. </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits
 *   A3: 01/01/2011
 *   A4: 06/30/2011
 *   A5: ga:month
 * =getGaMetric(A1, A2, A3, A4, , A5, , , true)
 * // Will return 6 rows, one per month, January to June.
 * 
 * @example
 * <caption>
 *   <h4>Visits by week (dimensions)<br/>
 *     <small> Get visits in the date range broken down by week. </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits
 *   A3: 01/01/2011
 *   A4: 12/31/2011
 *   A5: ga:week
 * =getGaMetric(A1, A2, A3, A4, , A5, , , true)
 * // Will return 52 rows numbered 1 to 52 for each week in 2011
 * 
 * // Tip: If you want to convert the week number to a date, add this:
 *   D1: =getMonday(A3)
 *   D2: =D1+7
 *   D3: =D2+7
 *   D4: =D3+7
 *   D5: .... and so on.
 * 
 * @example
 * <caption>
 *   <h4>Visits by city (dimensions)<br/>
 *     <small> Get visits in the date range broken down by city. </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits
 *   A3: 01/01/2011
 *   A4: 06/30/2011
 *   A5: ga:city
 * =getGaMetric(A1, A2, A3, A4, , A5, , , true)
 * 
 * @example
 * <caption>
 *   <h4>Many metrics & many dimensions combo: <br/>
 *     <small>
 *       Creates two columns visits and transactions, broken down into rows
 *       by month and year
 *     </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: ga:visits,ga:transactions 
 *   A3: 01/01/2011
 *   A4: 12/30/2012
 *   A5: ga:month,ga:year
 * =getGaMetric(A1, A2, A3, A4, , A5, , , true)
 * 
 * @example
 * <caption>
 *   <h4>Referring links: <br/>
 *     <small>
 *       Get referral URLs that came to the site between two dates. <br/><br/>
 *       Note: Visits is added because a metric is required.  Google Docs will 
 *       create three columns: the domain, the path, and the number of visits.
 *     </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: visits 
 *   A3: 01/01/2011
 *   A4: 03/30/2011
 *   A5: ga:source,ga:referralPath
 * =getGaMetric(A1, A2, A3, A4, , A5, , , true)
 * 
 * @example
 * <caption>
 *   <h4>Crazy town: <br/>
 *     <small>
 *       Get columns for visits and bounces that came from organic traffic, 
 *       using the keyword "seo company".  Break it out by month, and the
 *       visitor's city, for the first quarter of 2011.  Oh, and also include 
 *       column headers.  Zing!
 *     </small>
 *   </h4>
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: ga:visits,ga:bounces 
 *   A3: 01/01/2011
 *   A4: 03/30/2011
 *   A5: ga:medium==organic;ga:keyword=seo company
 *   A6: ga:month,ga:city
 * =getGaMetric(A1, A2, A3, A4, A5, A6, , , true)
 * 
 */
function getGaMetric(profileId, metrics, startDate, endDate, optFilter, 
                     optDimensions, optSegment, optSort, optIncludeHeaders, 
                     optMax) { 
  return (SeerJs.Error.hasOccurred()) 
      ? SeerJs.Error.get() 
      : SeerJs.GaApi.metric(profileId, metrics, startDate, endDate, 
                            optFilter, optDimensions, optSegment, optSort, 
                            optIncludeHeaders, optMax); 
}

/**
 * @function GoogleAnalytics.getGaKeywordCount
 * @since 1.0
 * 
 * @summary
 * Gets the number of keywords driving traffic to a profile between two 
 * dates. <p class="muted"><strong>*</strong> May be inconsistant with the
 * website</p>
 * 
 * @desc
 * This function gets the number of keywords that are driving traffic to a
 * specific profile between two dates.
 * 
 * It works by collecting all the keywords that drove traffic between the 
 * start date and end date and returning the total number of keywords.
 *
 * <div class="alert">
 *   <b>Inconsistancy:</b> Google doesn't provide a keyword count in the API so
 *   this count may not match up to the website.</b>
 * </div>
 * 
 * <div class="alert alert-error">
 *   <b>Limitation:</b> Does not work on high traffic accounts.
 * </div>
 * 
 * @param {Number} profileId Profile ID from the Profile ID sheet
 * @param {Date} startDate Starting date
 * @param {Date} endDate Ending date
 * 
 * @example
 * <caption>
 *   
 * </caption>
 * Cells:
 *   A1: 12345678
 *   A2: 11/01/2011
 *   A3: 11/02/2011
 * =getGaKeywordCount(A1, A2, A3)
 * 
 */
function getGaKeywordCount(profileId, startDate, endDate) { 
  return (SeerJs.Error.hasOccurred()) 
      ? SeerJs.Error.get() 
      : SeerJs.GaApi.keywordCount(profileId, startDate, endDate); 
}

/* ---------------------------------------------------------------------------
 * google_auth.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     GoogleAuth
 @classdesc     Google Authentication Module
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.GaAuth = (function() {

  /**
   * @function SeerJs.getGoogleServiceAuthToken_
   * @since 1.3
   * 
   * @summary
   *   Fetches GA authentication token, which can then be used to fetch data with 
   *   the getGAdata_ function
   *
   * @param email 
   * @param password
   * @param service "analytics", "adwords" defaults to analytics
   * @return Authentication token string
   */
  function serviceAuthToken(email, password, optService) {
    if (optService == undefined) optService = "analytics"
    try {
      password = encodeURIComponent(password);
      var response = UrlFetchApp.fetch(
          "https://www.google.com/accounts/ClientLogin", {
            method: "post",      
            payload: hashToParam({
              "accountType" : "GOOGLE",
              "Email"       : email,
              "Passwd"      : password,
              "service"     : optService,
              "source"      : getSetting("Reported user agent")
            })
          }).getContentText();
      return response.slice(response.search("Auth=") + 5, response.length);
    } catch (e) {
      if (e.message.indexOf("CaptchaRequired") != -1) {
        return "Complete CAPTCHA at http://www.google.com/accounts/" + 
            e.message.slice(e.message.indexOf("CaptchaUrl=") + 11, 
            e.message.indexOf("Error=") - 1);
      } else {
        return "Authentication failed (" + e.message + ")";
      }
    }
  }
  
  return {
    serviceAuthToken: serviceAuthToken
  };

})();

function getGoogleServiceAuthToken_(email, password, optService) {
  return SeerJs.GaAuth.serviceAuthToken(email, password, optService);
}
/* ---------------------------------------------------------------------------
 * klout.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Klout
 @classdesc     Klout API
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.KloutApi = (function() { 
 
  KLOUT_API_KEY = getSetting("Klout API Key");

  function kloutFetch_ (users) {
    // fetches xml
    return SeerJs.Http.getXml("http://api.klout.com/1/users/show.xml", {
      "key": KLOUT_API_KEY,
      "users": users
    });  
  }

  function kloutPushRows_ (retval, response) {
    // Creates a row in the array
    retval.push(["twitter_id", "kscore", "slope", "description", "kclass_id", 
                 "kclass", "kclass_description", "network_score", 
                 "amplification_score", "true_reach", "delta_1day", 
                 "delta_5day"]);
    var usersInResponse = response.users.user.length;
    if (usersInResponse > 1) {
      for (var i = 0; i < usersInResponse; i++) {
        retval.push(kloutPushCols_(retval, response.users.user[i]));
      }
    } else {
      retval.push(kloutPushCols_(retval, response.users.user));
    }
    return retval;
  }

  function kloutPushCols_ (retval, user) {
    // pushes data to one row
    return ([user.twitter_id.getText(),
             user.score.kscore.getText(),
             user.score.slope.getText(),
             user.score.description.getText(),
             user.score.kclass_id.getText(),
             user.score.kclass.getText(),
             user.score.kclass_description.getText(),
             user.score.network_score.getText(),
             user.score.amplification_score.getText(),
             user.score.true_reach.getText(),
             user.score.delta_1day.getText(),
             user.score.delta_5day.getText()]);
  }

  return {

    score: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["kscore"]]);
    },

    trueReach: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["true_reach"]], false); 
    },

    delta1: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["delta_1day"]], false); 
    },

    delta5: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["delta_5day"]] , false); 
    },

    all: function(usersRange) {
      usersRange = strToArray(usersRange);
      var users = SeerJs.groupBy(usersRange, 5);
      var retval= [];
      for (var i = 0; i < users.length; i++) {
        var str = users[i].join(',');
        retval = kloutPushRows_(retval, kloutFetch_(str));
      }
      return retval;
    }
    
  };
})();

/**
 * @summary
 *   Gets just the Klout score for one or many Twitter users.
 * 
 * @desc
 *   If all you need is the Klout score this function provides a shortcut
 *   to getKloutAll that will only return the Klout score.
 *   
 * @param {Array | Range} usersRange 
 *        Range of cells of user's Twitter names<br/>
 *        <span class="label label-info">Note</span>
 *        Twitter names needs to be be without the @ symbol.
 *        
 * @since 1.2
 * @function Klout.getKloutScore
 * 
 * @example
 * <caption>
 *   <h4>Klout score for one person</h4>
 * </caption>
 * =getKloutScore("djchrisle")
 * 
 * @example
 * <caption>
 *   <h4>Klout score for many people</h4>
 * </caption>
 * Cells:
 *   A2: djchrisle
 *   A3: wilreynolds
 *   A4: seerinteractive
 * =getKloutScore(A2:A4)
 * 
 */
function getKloutScore(usersRange) { 
  return (SeerJs.Error.hasOccurred()) 
      ? SeerJs.Error.get() 
      : SeerJs.KloutApi.score(usersRange); 
}

/**
 * @function Klout.getKloutAll
 * @since 1.2
 * 
 * @summary
 *   Gets all data from Klout, including Klout score, for one or many Twitter users.
 * 
 * @desc 
 *   This function will return all the data made available by the Klout API.
 *   
 *   <div class="alert alert-success">
 *     <strong>Tip:</strong> Select Twitter accounts in multiples of 5.  Klout
 *     processes them five at a time.
 *   </div>
 *   <div class="alert alert-error">
 *     <strong>Limitation:</strong> Google Docs might timeout if you select
 *     too many Twitter users. Try a smaller number of users.
 *   </div>
 * 
 * @param {Array | Range} usersRange 
 *        Range of cells of user's Twitter names<br/>
 *        <span class="label label-info">Note</span>
 *        Twitter names needs to be be without the @ symbol.
 *
 * @returns twitter_id:           Twitter ID
 * @returns kscore:               Klout score
 * @returns slope:                Scope
 * @returns description:          Description of the score
 * @returns kclass_id:            Klout classification ID
 * @returns kclass:               Klout classification
 * @returns kclass_description:   Klout classification description
 * @returns network_score:        Network score
 * @returns amplification_score:  Amplification score
 * @returns true_reach:           True reach score
 * @returns delta_1day:           Change in Klout score over 1 day
 * @returns delta_5day:           Change in Klout score over 5 days

 * 
 * @example
 * <caption>
 *   <h4>Klout data for one person</h4>
 * </caption>
 * =getKloutAll("djchrisle")
 * 
 * @example
 * <caption>
 *   <h4>Klout data for many people</h4>
 * </caption>
 * Cells:
 *   A2: djchrisle
 *   A3: wilreynolds
 *   A4: seerinteractive
 * =getKlout(A2:A4)
 * 
 */
function getKloutAll(usersRange) { 
  return (SeerJs.Error.hasOccurred()) 
      ? SeerJs.Error.get() 
      : SeerJs.KloutApi.all(usersRange); 
}

/* ---------------------------------------------------------------------------
 * majestic.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Majestic
 @classdesc     Majestic API
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.MajesticApi = (function() {

  var DEV_API = "http://developer.majesticseo.com/api_command";
  var PROD_API = "http://enterprise.majesticseo.com/api_command";
  var BACKLINK_HARD_LIMIT = getSetting("Majestic backlinks limit");
  var API_KEY  = getSetting("Majestic API key");
  var DEV_ENABLED = getSetting("Majestic enable development mode");

  /**
   * Returns the first table of majestic's data
   */
  function getFirstTable_(backlinkArray) {
    var retval = [];
    for (var i = 0; i < BACKLINK_HARD_LIMIT; i++) {
      retval.push(backlinkArray[i]);
    }
    return retval;
  }

  /**
   * Returns the second table of majestic's data
   */
  function getSecondTable_(backlinkArray) {
    var retval = [];
    for (var i = BACKLINK_HARD_LIMIT + 1; i < backlinkArray.length; i++) {
      retval.push(backlinkArray[i]);
    }
    return retval;
  }

  /**
   * Fetch and parse result from API
   */
  function getFromMajesticApi_(cmd, params) {
    var response = fetchMajesticXml_(cmd, params);
    if (response.Result.code == "OK") {
      return parseXml_(response);
    } else {
      SeerJs.Error.set('Error getting Majestic API: ' + response.Result.errormessage);
      return false;
    }
  }

  /**
   * Gets XML from Majestic API
   */
  function fetchMajesticXml_(cmd, params) {
    var base = (DEV_ENABLED) ? DEV_API : PROD_API;
    var args = {
      'app_api_key' : API_KEY,
      'cmd'         : cmd,
      'params'      : params
    }
    return SeerJs.Http.getXml(base + '?' + hashToParam(args));
  }

  /**
   * Parses the header from the XML element. Returns array of columns
   */
  function parseXml_(xmlDoc) {
    var retVal = [];
    var dataTable = xmlDoc.Result.DataTables.DataTable;
    if (dataTable.headers != undefined) {
      retVal = parseDataTable_(retVal, dataTable);
    } else {
      var i = 0; var len = dataTable.length;
      while(i < len) {
        retVal = parseDataTable_(retVal, dataTable[i]);
        i++;
      }
    }
    return retVal;
  }

  /**
   * Parse the data table from XML element and appends to the end of the rows
   */
  function parseDataTable_(retVal, dataTable) {
    retVal.push(dataTable.headers.split("|"));
    if (parseInt(dataTable.rowscount) > 0) {
      if (parseInt(dataTable.rowscount) == 1) {
        retVal.push(convertDataTypes_(dataTable.Row.getText().split("|")));
      } else {
        var rows = dataTable.Row;
        for (var i=0; i<rows.length; i++) {
          retVal.push(convertDataTypes_(rows[i].getText().split("|")));
        }
      }
    }
    return retVal;
  }

  /**
   * Converts literal strings to integers in an array
   */
  function convertDataTypes_(ary) {
    var c = 0, cLen = ary.length, out = [];
    while (c < cLen) {
      out[c] = (isNaN(ary[c])) ? ary[c] : parseInt(ary[c]);
      c++;
    }
    return out;
  }

  return {

    backLinks: function(url, optSource, optLimit) {
      optLimit = optLimit || BACKLINK_HARD_LIMIT;
      var response =  getFromMajesticApi_("GetTopBackLinks", hashToParam({
          "URL"                         : url,
          "datasource"                  : optSource,
          "MaxSourceURLs"               : optLimit,
          "ShowDomainInfo"              : 1,
          "GetUrlData"                  : 1,
          "GetSubDomainData"            : 0,
          "GetRootDomainData"           : 0,
          "MaxSourceURLsPerRefDomain"   : -1
      }));
      return (response) ? getFirstTable_(response) : SeerJs.Error.get();
    },


    domainInfo: function(url, source, optLimit) {
      optLimit = optLimit || BACKLINK_HARD_LIMIT;
      return getSecondTable_(
          getFromMajesticApi_("GetTopBackLinks", hashToParam({
            "URL"                         : url,
            "datasource"                  : source,
            "MaxSourceURLs"               : optLimit,
            "ShowDomainInfo"              : 1,
            "GetUrlData"                  : 1,
            "GetSubDomainData"            : 0,
            "GetRootDomainData"           : 0,
            "MaxSourceURLsPerRefDomain"   : -1
          }))
      );
    },


    subdomainData: function(url, source, optLimit) {
      optLimit = optLimit || BACKLINK_HARD_LIMIT;
      return getSecondTable_(
          getFromMajesticApi_("GetTopBackLinks", hashToParam({
          "URL"                         : url,
          "datasource"                  : source,
          "MaxSourceURLs"               : optLimit,
          "ShowDomainInfo"              : 0,
          "GetUrlData"                  : 1,
          "GetSubDomainData"            : 1,
          "GetRootDomainData"           : 0,
          "MaxSourceURLsPerRefDomain"   : -1
      })));
    },

    rootDomain: function(url, source, optLimit) {
      optLimit = optLimit || BACKLINK_HARD_LIMIT;
      return getSecondTable_(
          getFromMajesticApi_("GetTopBackLinks", hashToParam({
          "URL"                         : url,
          "datasource"                  : source,
          "MaxSourceURLs"               : optLimit,
          "ShowDomainInfo"              : 0,
          "GetUrlData"                  : 1,
          "GetSubDomainData"            : 0,
          "GetRootDomainData"           : 1,
          "MaxSourceURLsPerRefDomain"   : -1
      })));
    },


    indexItemInfo: function(urls) {
      var retVal = [],
          itemsArray = urls.toArray(),
          items = "&items=" + itemsArray.length;
      for (var i = 0; i < itemsArray.length; i++) {
        items = items + "&item" + i + "=" + itemsArray[i];
      }
      var result = getFromMajesticApi_("GetIndexItemInfo", items);
      return SeerJs.Error.get() || result;
    },

    getMajesticTopBackLinks: function(url, datasource, maxSourceUrls,
        showDomainInfo, getUrlData, getSubDomainData, getRootDomain,
        maxSourceURLsPerRefDomain) {
      return getFromMajesticApi_("GetTopBackLinks", hashToParam({
          "URL"                         : url,
          "datasource"                  : datasource,
          "MaxSourceURLs"               : maxSourceUrls,
          "ShowDomainInfo"              : showDomainInfo,
          "GetUrlData"                  : getUrlData,
          "GetSubDomainData"            : getSubDomainData,
          "GetRootDomainData"           : getRootDomain,
          "MaxSourceURLsPerRefDomain"   : maxSourceURLsPerRefDomain
      }));
    },

    subscriptionInfo: function() {
      return getFromMajesticApi_("GetSubscriptionInfo");
    },


    maxBacklinksShown: function() {
      var xmlDoc = fetchMajesticXml_("GetSubscriptionInfo");
      return parseInt(xmlDoc.Result.GlobalVars.standardreportbacklinksshown);
    }

    /**
     * <b>Not implimented yet.</b><p> <p>
     *
     * This function is ideal for indepth analysis of index items that returns the
     * following data:<p> <p>
     *
     * <li>Top backlinks</li>
     * <li>Aggregated anchor text</li>
     * <li>Referring (linking in) domains</li>
     * <li>Backlink discovery rates by month (as used by our charts)</li>
     * <li>Other data</li><p> <p>
     *
     * This function accepts filtering rules that help focus only on backlinks of
     * interest. It is also possible with this function to retrieve very large
     * number of backlinks. On Majestic SEO's website it is used to generate
     * Advanced Reports.
     */
    // getMajesticAnalyseIndexItem: function() {
    //   return "(not implimented)";
    // },

    /**
     * <b>Not implimented yet.</b>
     *
     * This function operates on domain level, and returns information about
     * the relationships between domains ( root domains pointing to a root
     * domain - it does not resolve the URLs or subdomains of the backlinks
     * ). It can be used to achieve the following: <p>
     *
     * Get list of root domains with backlink counts pointing to a given root
     * domain <p>
     *
     * Find root domains which point to all, or a subset of specified root
     * domains. <p>
     *
     * On our website GetLinkedDomains is used to get list of matching
     * domains in Clique Hunter tool:
     * http://www.majesticseo.com/reports/cliquehunter <p>
     *
     * It is recommended that any result data to calls to this call is
     * cached, and that calls to this function are minimised. A single call
     * should made to this function to retrieve all data necessary and it
     * should then be cached locally to serve subsequent user queries (if
     * any) from that local cache. <p>
     *
     */
    // getMajesticHostedDomains: function() {
    //   return "(not implimented)";
    // },

    /**
     * <b>Not implimented yet.</b>
     *
     * This function is designed to return one or more URLs from root domain
     * or subdomain. This function is also the only guaranteed way to check
     * if a URL is present in index because GetIndexItemInfo only works with
     * a limited number of URLs with high enough number of backlinks or
     * referring domains.<p> <p>
     *
     */
    // getMajesticTopPages: function() {
    //   return "(not implimented)";
    // }

  };
})();

/**
 * @function Majestic.getMajesticBackLinks
 * @since 1.0
 *
 * @summary
 *   Gets a list of backlinks from Majestic SEO
 *
 * @desc
 *   Gets a list of backlinks from Majestic SEO. The maximum number of URLs
 *   it pulls is set in the Settings sheet.
 *
 * @param {string} url
 *        URL to get backlinks for
 *
 * @param {string} optSource
 *        (optional) Data source to get information from (can be "fresh" or
 *        "historic") Default is "fresh"
 *
 * @param {integer} optLimit
 *        (optional) Override the maximum number of URLs to pull.
 *
 * @returns Domain                : Root domain of the backlink
 * @returns AlexaRank             : Alexa Rank of the root domain (only valid for top 1 mln domains), see more for details {@link http://www.alexa.com/help/traffic-learn-more}
 * @returns RefDomains            : Number of referring domains pointing to that root domain
 * @returns ExtBackLinks          : Number of external backlinks pointing to the root domain
 * @returns IndexedURLs           : Number of unique URLs in index (includes crawled and uncrawled)
 * @returns CrawledURLs           : Number of unique URLs that were crawled
 * @returns FirstCrawled          : Date when domain was first crawled
 * @returns LastSuccessfulCrawl   : Date when domain was last successfully crawled
 * @returns IP                    : IPv4 Address of the domain (note  for hosts with multiple IPs only one IP will be taken)
 * @returns SubNet                : Calculated from IP
 * @returns CountryCode           : Geo-located country of hosting based on IP address
 * @returns TLD                   : Top level domain of the root domain
 * @returns DomainID              : The domainID numbers will correspond with the ID numbers found from =getMajesticDomainInfo
 *
 * @example
 * <caption>
 *   <h4>Get backlinks for a URL:<br/>
 *     <small>Return the backlinks from Majestic for www.seerinteractive.com/blog</small>
 *   </h4>
 * </caption>
 * =getMajesticBacklinks("www.seerinteractive.com/blog")
 *
 */
function getMajesticBackLinks(url, optSource, optLimit) {
  return (SeerJs.Error.hasOccurred())
      ? SeerJs.Error.get()
      : SeerJs.MajesticApi.backLinks(url, optSource, optLimit);
}

/**
 * @summary
 * Get information on referring domain's backlinks from Majestic SEO.
 * For example, if a backlink was "http://www.domain.com/blog.html" then the
 * information you will get is just for "domain.com"
 *
 * @param {string} url     URL to get
 * @param {string} source  Data source to get information from (fresh or historic)
 * @param {integer} optLimit (optional) Number of URLs (defaults to the settings sheet)
 * @return Returns domains as an array
 * @since 1.0
 * @name Majestic.getMajesticDomainInfo
 *
 * @example
 * <caption>
 *   <h4>Get domain info for backlinks for a URL:<br/>
 *     <small>Return the domain info for backlinks from Majestic for www.seerinteractive.com</small>
 *   </h4>
 * </caption>
 * =getMajesticDomainInfo("www.seerinteractive.com", "fresh")
 */
function getMajesticDomainInfo(url, source, optLimit) {
  return (SeerJs.Error.hasOccurred())
      ? SeerJs.Error.get()
      : SeerJs.MajesticApi.domainInfo(url, source, optLimit);
}

/**
 * @summary
 * Get information on referring subdomain's backlinks from Majestic SEO.
 * For example, if a backlink was "http://www.domain.com/blog.html" then the
 * information you will get is just for "www.domain.com"
 *
 * @param {string} url     URL to get
 * @param {string} source  Data source to get information from (fresh or historic)
 * @param {integer} optLimit (optional) Number of URLs (defaults to the settings sheet)
 * @return Returns domains as an array
 * @since 1.0
 * @function Majestic.getMajesticSubdomainData
 *
 * @example
 * <caption>
 *   <h4>Get subdomain data for a URL:<br/>
 *     <small>Return the subdomain information from Majestic</small>
 *   </h4>
 * </caption>
 * =getMajesticSubDomainData("www.seerinteractive.com", "fresh")
 */
function getMajesticSubdomainData(url, source, optLimit) {
  return (SeerJs.Error.hasOccurred())
  ? SeerJs.Error.get()
  : SeerJs.MajesticApi.subdomainData(url, source, optLimit);
}

/**
 * @summary
 * Get information on with the root domain extracted from the backlinks from
 * Majestic SEO.
 *
 * @param {string} url     URL to get
 * @param {string} source  Data source to get information from (fresh or historic)
 * @return Returns domains as an array
 * @since 1.0
 * @name Majestic.getMajesticRootDomain
 *
 * @example
 * <caption>
 *   <h4>Get root domain data for a URL:<br/>
 *     <small>Return the root domain information from Majestic</small>
 *   </h4>
 * </caption>
 * =getMajesticRootDomain("www.seerinteractive.com", "fresh")
 */
function getMajesticRootDomain(url, source, optLimit) {
  return (SeerJs.Error.hasOccurred())
  ? SeerJs.Error.get()
  : SeerJs.MajesticApi.rootDomain(url, source, optLimit);
}

/**
 * @summary
 * Retuns index information about a URL
 *
 * @desc
 * <p>This function returns key information about "index items." If you give
 * it a root domain name (eg: "seerinteractive.com") then you will
 * get index information for all URLs belonging to that root domain.</p>
 *
 * <p>If you give it a subdomain (eg: "www.seerinteractive.com") then you
 * will get index information that belong to just that subdomain.</p>
 *
 * <p>If you give it an exact URL
 * (eg: "http://www.seerinteractive.com/blog") then you will get index
 * information for only that URL.</p>
 *
 * @param {array or string} urls URL as an array
 * @since 1.0
 * @function Majestic.getMajesticindexItemInfo
 *
 * @example
 * <caption>
 *   <h4>Get Majestic index items:<br/>
 *     <small>Return majestic index items for a range of URLs</small>
 *   </h4>
 * </caption>
 * * Cells:
 *    A1: www.seerinteractive.com
 *    A2: www.nasty-competitor.com/blog
 *    A3: www.another-guy.com
 * =getMajesticIndexItemInfo(A1:C3)
 *
 */
function getMajesticIndexItemInfo(urls) {
  return (SeerJs.Error.hasOccurred())
  ? SeerJs.Error.get()
  : SeerJs.MajesticApi.indexItemInfo(urls);
}

/**
 * @summary
 * Returns backlinks for a URL
 *
 * @desc
 * This will return backlinks (up to a limit of the subscription level) for
 * any URL, domain or subdomain.
 *
 * @param {string} url                    See: {@link http://bit.ly/tb91ri}
 * @param {string} datasource             See: {@link http://bit.ly/tb91ri}
 * @param {int} maxSourceUrls             Defaults to the hard limit setting
 *                                        or the max backlinks your account will
 *                                        show whichever is lower. Use 0 to
 *                                        force the maximum backlinks.
 * @param {boolean} showDomainInfo        See: {@link http://bit.ly/tb91ri}
 * @param {boolean} getUrlData            See: {@link http://bit.ly/tb91ri}
 * @param {boolean} getSubDomainData      See: {@link http://bit.ly/tb91ri}
 * @param {boolean} getRootDomain         See: {@link http://bit.ly/tb91ri}
 * @param {int} maxSourceURLsPerRefDomain See: {@link http://bit.ly/tb91ri}
 * @since 1.0
 * @function Majestic.getMajesticindexItemInfo
 *
 * @example
 * <caption>
 *   <h4>Get top backlinks for a URL:<br/>
 *     <small>Get the top results up to the BACKLINK_HARD_LIMIT setting</small>
 *   </h4>
 * </caption>
 * =getMajesticTopBackLinks("http://www.seerinteractive.com")
 *
 * @example
 * <caption>
 *   <h4>Get the top 100 results:<br/>
 *     <small>Get the top 100 backlink results</small>
 *   </h4>
 * </caption>
 * =getMajesticTopBackLinks("http://www.seerinteractive.com", 100)
 *
 * @example
 * <caption>
 *   <h4>Get all the backlinks for a URL:<br/>
 *     <small>Get the the maximum resuts. !!WARNING!! Most likely will make Google Docs hang!!</small>
 *   </h4>
 * </caption>
 * =getMajesticTopBackLinks("http://www.seerinteractive.com", 0)
 *
 */
function getMajesticGetMajesticTopBackLinks(url, datasource, maxSourceUrls,
    showDomainInfo, getUrlData, getSubDomainData, getRootDomain,
    maxSourceURLsPerRefDomain) {
  return (SeerJs.Error.hasOccurred())
  ? SeerJs.Error.get()
  : SeerJs.MajesticApi.getMajesticTopBackLinks(url, datasource, maxSourceUrls,
        showDomainInfo, getUrlData, getSubDomainData, getRootDomain,
        maxSourceURLsPerRefDomain);
}

/**
 * @summary
 * Returns information on existing subscriptions with current resource usage
 * values provided.
 *
 * @since 1.0
 * @function Majestic.getMajesticSubscriptionInfo
 *
 * @example
 * =getMajesticSubscriptionInfo()
 */
function getMajesticSubscriptionInfo() {
  return (SeerJs.Error.hasOccurred())
  ? SeerJs.Error.get()
  : SeerJs.MajesticApi.subscriptionInfo();
}

/**
 * @summary
 * Shortcut that gets the max number of backlinks this API key can show
 *
 * @since 1.0
 * @function Majestic.getMajesticMaxBacklinksShown
 *
 * @example
 * // Check the current limit of the the maximum number of backlinks we're allowed to get.
 * =getMajesticMaxBacklinksShown()
 */
function getMajesticMaxBacklinksShown() {
  return (SeerJs.Error.hasOccurred())
  ? SeerJs.Error.get()
  : SeerJs.MajesticApi.maxBacklinksShown();
}
/* ---------------------------------------------------------------------------
 * raven.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Raven
 @classdesc     Raven API
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.RavenApi = (function() { 

  RAVEN_SECRET_KEY = getSetting("Raven secret key");

  function ravenArgsOk_(dataPoint) {
    var validArgs = ["rank", "url", "status", "date"];
    for (chk in validArgs) {
      if (validArgs[chk] == dataPoint) return true;
    }
    return false;
  }

  return {
    
    /**
     * @summary
     * Gets one metric (such as ranking) for a single keyword from a specific 
     * engine, on a specific day.
     * 
     * @desc
     * <div class="row">
     *   <div class="span3">
     *     <h3>Search engines</h3>
     *     <table class="table table-striped table-bordered table-condensed">
     *       <thead><tr><th>Column</th><th>Description</th></tr></thead>
     *       <tbody>
     *         <tr><td><code>google </code></td></tr>
     *         <tr><td><code>yahoo </code></td></tr>
     *         <tr><td><code>msn  (aka bing)</code></td></tr>
     *         <tr><td><code>google-uk </code></td></tr>
     *         <tr><td><code>google-au </code></td></tr>
     *         <tr><td><code>google-ca </code></td></tr>
     *         <tr><td><code>google-dk </code></td></tr>
     *         <tr><td><code>google-de </code></td></tr>
     *         <tr><td><code>google-no </code></td></tr>
     *         <tr><td><code>google-se </code></td></tr>
     *         <tr><td><code>google-pl </code></td></tr>
     *         <tr><td><code>google-fi </code></td></tr>
     *         <tr><td><code>google-fr </code></td></tr>
     *         <tr><td><code>google-es </code></td></tr>
     *         <tr><td><code>google-nl </code></td></tr>
     *         <tr><td><code>yahoo-ca </code></td></tr>
     *         <tr><td><code>yahoo-uk </code></td></tr>
     *         <tr><td><code>yahoo-au </code></td></tr>
     *       </tbody>
     *     </table>
     *   </div>
     *   <div class="span3">
     *     <h3>Data points</h3>
     *     <table class="table table-striped table-bordered table-condensed">
     *       <thead><tr><th>Column</th><th>Description</th></tr></thead>
     *       <tbody>
     *         <tr><td><code>keyword</td></tr>
     *         <tr><td><code>engine</td></tr>
     *         <tr><td><code>rank</td></tr>
     *         <tr><td><code>status</td></tr>
     *         <tr><td><code>date</td></tr>
     *         <tr><td><code>url</td></tr>
     *       </tbody>
     *     </table>
     *   </div>
     * </div>
     * 
     * <b>Engines are:</b>
     * </br>
     * <b>Data points can be:</b>
     *
     * @param {string}  domain  The raven domain name
     * @param {string}  keyword  The raven domain name
     * @param {string}  engine  The raven domain name
     * @param {string}  date  The raven domain name
     * @param {string}  dataPoint  The raven domain name
     * @since 1.0
     * @function Raven.getRavenRank
     * 
     * @example
     * Cells:
     *    A1: seerinteractive.com
     *    A2: seo company
     *    A3: google
     *    A4: 11/01/2011
     *    A5: rank
     * =getRavenRank(A1, A2, A3, A4, A5)
     * // Returns the Google ranking for the keyword 
     * // "seo company" on 11/01/11
     *
     */
    rank: function (domain, keyword, engine, date, dataPoint) {
      if (isInFuture(date)) return "Date is in the future";
      if (!ravenArgsOk_(dataPoint)) return "Invalid data point";
      if (typeof optCols == "string") optCols = [optCols];
      var response = SeerJs.Http.getJson("https://api.raventools.com/api", {
        "key"           : RAVEN_SECRET_KEY,
        "method"        : "rank",
        "keyword"       : keyword,
        "domain"        : domain,
        "start_date"    : dateToYMD(date),
        "end_date"      : dateToYMD(date),
        "engine"        : engine,
        "format"        : "json"
      });
      var retval= [];
      if (dataPoint.toLowerCase() == "rank") {
        if (response[engine][0]["status"] == "no data") return "No data";
        return parseInt(response[engine][0]["rank"]);
      } else {
        return response[engine][0][dataPoint];
      }
    },

    /**
     * @summary
     * Gets the rankings for all your keywords for one domain on a specific date.<p>
     *
     * @desc
     * The rankings be returned in the following columns:</br>
     * <li>keyword</li>
     * <li>engine</li>
     * <li>rank</li>
     * <li>status</li>
     * <li>date</li>
     * <li>url</li>
     *
     * @param {string}  domainName  The raven domain name
     * @param {date}    date        The date you want rankings from
     * @since 1.0
     * @return Returns a 2D array of rankings
     * @function Raven.getRavenAllRank
     *
     * @example
     * Cells:
     *    A1: seerinteractive.com
     *    A2: 11/01/2011
     * =getRavenAllRank(A1, A2)
     * // Returns the Google ranking for the keyword "seo company" on 11/01/11
     * 
     */
    allRank: function (domainName, date) {  // @exposeToGApps
      if (isInFuture(date)) return "Date is in the future";
      var response = SeerJs.Http.getJson("https://api.raventools.com/api", {
        "key"           : RAVEN_SECRET_KEY,
        "method"        : "rank_all",
        "domain"        : domainName,
        "start_date"    : dateToYMD(date),
        "format"        : "json"
      });
      var retval = [];
      retval.push(["keyword", "engine", "rank", "status", "date", "url"]);
      for (keyword in response) {
        for (engine in response[keyword]) {
          if (response[keyword][engine][0]["rank"] != undefined) {
            var rank = response[keyword][engine][0]["rank"];
            var url = response[keyword][engine][0]["url"];
          }
          status = response[keyword][engine][0]["status"];
          date = response[keyword][engine][0]["date"];
          retval.push([keyword, engine, rank, status, date, url]);
        }
      }
      return retval;
    },

    /**
     * @summary
     * Gets the number of tracked keywords on a specific page
     * 
     * @desc
     * Gets the number of tracked keywords on single page of a search engine.
     *
     * @param {string}  domainName  The raven domain name
     * @param {date}    date        The date you want rankings from
     * @param {string}  engine      Search engine
     * @param {integer} page        Page number you want to get a count from
     * @since 1.0
     * @return The number of keywords that appears on a specific page
     * @function Raven.getRavenCountKeywordsOnPage
     *
     * @example
     * Cells:
     *    A1: seerinteractive.com
     *    A2: 11/01/2011
     *    A3: google
     *    A4: 1 
     * =getRavenCountKeywordsOnPage(A1, A2, A3, A4)
     * // Gets the number of keywords on page 1 on 11/01/2011
     *
     */
    countKeywordsOnPage: function(domainName, date, engine, page) {
      if (isInFuture(date)) return "n/a";
      var data = SeerJs.RavenApi.allRank(domainName, date);
      var rankCounts = [0,0,0,0,0];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[1] == engine.toLowerCase()) {
          if (row[2] <= 10) { rankCounts[1]++; }
          if (row[2] > 10 && row[2] <= 20) { rankCounts[2]++; }
          if (row[2] > 20 && row[2] <= 30) { rankCounts[3]++; }
          if (row[2] > 30) { rankCounts[4]++; }
        }
      }
      return rankCounts[page];
    },

    /**
     * @summary
     * Gets a list of all the keywords you're currently tracking
     *
     * @param {string}  domainName  The raven domain name
     * @since 1.0
     * @return An array of keywords (one per row)
     * @function Raven.getRavenKeywords
     */
    keywords: function (domainName) {
      var retval = [];
      var response = SeerJs.Http.getJson("https://api.raventools.com/api", {
        "key"           : RAVEN_SECRET_KEY,
        "method"        : "keywords",
        "domain"        : domainName,
        "format"        : "json"
      });
      for (keyword in response) {
        retval.push([response[keyword]]);
      }
      return retval;
    },

    /**
     * @summary
     * Gets a list of all the domains in your account
     *
     * @since 1.0
     * @return An array of domains (one per row)
     * @function Raven.getRavenDomains
     */
    domains: function() {
      var retval = [];
      var response = SeerJs.Http.getJson("https://api.raventools.com/api", {
        "key"           : RAVEN_SECRET_KEY,
        "method"        : "domains",
        "format"        : "json"
      });
      for (keyword in response) {
        retval.push([response[keyword]]);
      }
      return retval;
    }

  };

})();

function getRavenRank(domain, keyword, engine, date, dataPoint) {
  return SeerJs.RavenApi.rank(domain, keyword, engine, date, dataPoint);
}

function getRavenAllRank(domainName, date) {
  return SeerJs.RavenApi.allRank(domainName, date);
}

function getRavenCountKeywordsOnPage(domainName, date, engine, page) {
  return SeerJs.RavenApi.countKeywordsOnPage(domainName, date, engine, page);
}

function getRavenKeywords(domainName) {
  return SeerJs.RavenApi.keywords(domainName);
}

function getRavenDomains() {
  return SeerJs.RavenApi.domains();
}
/* ---------------------------------------------------------------------------
 * seomoz.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Seomoz
 @classdesc     SEOmoz API
                <small>(Documentation redesign in progress)</small>
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.SeomozApi = (function() {

  var SEOMOZ_MEMBER_ID          = SeerJs.Settings.get("SEOmoz Member ID");
  var SEOMOZ_SECRET_KEY         = SeerJs.Settings.get("SEOmoz Secret Key");
  var SEOMOZ_BITFLAGS = {
    "ut"   : "title"              , // 1
    "uu"   : "url"                , // 4
    "ueid" : "external links"     , // 32
    "uid"  : "links"              , // 2048
    "umrp" : "mozrank"            , // 16384
    "fmrp" : "subdomain mozrank"  , // 32768
    "us"   : "http status code"   , // 536870912
    "upa"  : "page authority"     , // 34359738368
    "pda"  : "domain authority"     // 6871947673
  };
  var SEOMOZ_ALL_METRICS    = 103616137253; // All the free metrics
  var SEOMOZ_BATCH_SIZE     = 10; // Size of batch (Maximum 10)
  var OBEY_FREE_RATE_LIMIT  = false; // Zzz for 5 sec. after every request

  /**
   * Extracts URLs from columns and removes the protocol from them
   */
  function linkscapePrepUrls_ (urls) {
    if (isArray(urls)) {
      // remove outer array if we get columns
      if (isColumn(urls)) urls = urls[0];
    } else {
      // if we get a string, convert it to an array.
      urls = strToArray(urls);
    }
    // remove protocol or seomoz doesn't work right.
    for (var i = 0; i < urls.length; i++) {
      urls[i] = urls[i].toString().replace(/http(s)?:\/\//gi, "");
    }
    return urls;
  }

  /**
   * Transposes results from linkscape api to a 2d array
   */
  function linkscapeTranspose_ (response) {
    var retval = [];
    var row = [];
    // push headers
    for (key in SEOMOZ_BITFLAGS) { row.push(SEOMOZ_BITFLAGS[key]); }
    retval.push(row);
    // push rows
    for (var i = 0; i < response.length; i++) {
      row = [];
      for (key in SEOMOZ_BITFLAGS) {
        row.push(response[i][key]);
      }
      retval.push(row);
    }
    return retval;
  }

  /**
   * Creates a XOR bit flag based on the array of columns you want.
   */
  function linkscapeBitFlag_(cols) {
     for (flag in SEOMOZ_BITFLAGS) {
      var hash = SEOMOZ_BITFLAGS[flag];
    }
  }

  /**
   * Creates a expiration time stamp
   */
  function linkscapeExp_() {
    var uDate = new Date().getTime();
    return Math.round(uDate/1000) + 1200;
  }

  /**
   * Calculates 64bit hash signature
   */
  function linkscapeSig_(expire) {
    var signature = Utilities.computeHmacSignature(
        Utilities.MacAlgorithm.HMAC_SHA_1, SEOMOZ_MEMBER_ID + "\n" +
        expire, SEOMOZ_SECRET_KEY);
    return encodeURIComponent(Utilities.base64Encode(signature));
  }

  function fetchJson(uri, optParams, optArgs) {
    if (optArgs != undefined) {
      if (optArgs['method'] === 'post') {
        return SeerJs.Http.postJson(uri, optArgs['payload'], optParams);
      }
    } else {
      return SeerJs.Http.getJson(uri, optParams);
    }
  }

  return {

    /**
     * @summary
     * Returns all metrics from SEOmoz's Linkscape. <p>
     *
     * @desc
     * Original by {@link http://www.tomanthony.co.uk/blog/seomoz-linkscape-api-with-google-docs/}
     * Modified so that you can select a large range of URLs and it will get the
     * metrics in batches of 10.<p>
     *
     * @param {string[]} urlRange One or more URLs to send to Linkscape
     * @param {boolean} optIncludeHeader Include the header? (Default is true)
     * @function Seomoz.getLinkscape
     *
     * @example
     * Cells:
     *    A1: www.seerinteractive.com
     *    A2: http://www.domain.com/blog
     *    A3: http://www.anotherdomain.com/page.html
     *
     * // => Gets current data on www.seerinteractive.com
     * =getLinkscape("www.seerinteractive.com")
     * // => Gets current data on www.seerinteractive.com
     * =getLinkscape(A1)
     * // => Gets data for three URLS in a batch
     * =getLInkscape(A1:A3)
     * // => Gets data for three URLS in a batch and reomves the header row
     * =getLInkscape(A1:A3, false)
     *
     */
    urlMetrics: function(urlRange, optIncludeHeader) {
      if (optIncludeHeader == undefined) optIncludeHeader = true;
      var expire = linkscapeExp_();
      var retval = new Array;
      var first = true;
      var response;

      // POST in batches of 10 and merge results
      urlRange = strToArray(urlRange).flatten();
      var urlGroups = SeerJs.groupBy(linkscapePrepUrls_(urlRange), SEOMOZ_BATCH_SIZE);
      for (var g = 0; g < urlGroups.length; g++) {
        var payload = Utilities.jsonStringify(urlGroups[g])
        response = linkscapeTranspose_(fetchJson(
            "http://lsapi.seomoz.com/linkscape/url-metrics/",
            {
              "AccessID"  : SEOMOZ_MEMBER_ID,
              "Expires"   : expire,
              "Signature" : linkscapeSig_(expire),
              "Cols"      : SEOMOZ_ALL_METRICS
            },
            {
              "method"    : "post",
              "payload"   : payload
            }
        ));
        // merge results from batches together
        if (first == false) response.shift();
        retval.push.apply(retval, response);
        first = false;
        if (OBEY_FREE_RATE_LIMIT) { Utilities.sleep(5000); }
      }
      // remove header if user requests.
      if (!optIncludeHeader) retval.shift();
      return retval;
    }

  };
})();

function getLinkscape(urlRange, optIncludeHeader) {
  return SeerJs.SeomozApi.urlMetrics(urlRange, optIncludeHeader);
}

/* ---------------------------------------------------------------------------
 * twitter.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Twitter
 @classdesc     Twitter API
                <small>(Documentation redesign in progress)</small>
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.TwitterApi = (function() { 

/*  function oAuthConfig() {
    OAuthKeys = findOAuthKeys('twitter');
    if (OAuthKeys) {
      return {
        'service'           : 'twitter',
        'accessTokenUrl'    : 'http://api.twitter.com/oauth/access_token',
        'requestTokenUrl'   : 'http://api.twitter.com/oauth/request_token',
        'authorizationUrl'  : 'http://api.twitter.com/oauth/authorize',
        'consumerKey'       : OAuthKeys['consumerKey'],
        'consumerSecret'    : OAuthKeys['consumerSecret']
      }
    }
  }*/

  /**
   * Converts cells into a Twitter search query
   * 
   * @param  {array|cells} searchTermRange Range of cells that contain text want to search
   * @return {string} A search query formatted for Twitter
   * @private
   * @since 1.3
   * @memberOf Twitter
   * 
   * @example
   * Cells:
   * A2: pinterest
   * A3: seo
   * =cellsToTwitterSearch(A2:A3)
   * 
   */
  function cellsToTwitterSearch_(searchTermRange) {
    var a, str;
    if (searchTermRange.length == 1) { a = searchTermRange[0]; }
    str = a.join("_");
    str.replace(/\s/, '_');
    return str + " ";
  }

  return {

    /**
     * @summary 
     * Returns Tweets from a search term. This function only supports returning 
     * both popular and realtime results and a maximum of 100 tweets.
     * 
     * @desc
     * <div class="row"><div class="span6">
     *   <h3>Columns returned</h3>
     *   <table class="table table-striped table-bordered table-condensed">
     *     <thead><tr><th>Column</th><th>Description</th></tr></thead>
     *     <tbody>
     *       <tr><td><code>id</code></td><td>Tweet's ID number</td></tr>
     *       <tr><td><code>id_str</code></td><td>Tweet's ID number</td></tr>
     *       <tr><td><code>to_user_id</code></td><td>To user name</td></tr>
     *       <tr><td><code>from_user_name</code></td><td>From full name</td></tr>
     *       <tr><td><code>from_user_id_str</code></td><td>From user ID</td></tr>
     *       <tr><td><code>created_at</code></td><td>Date Tweeted</td></tr>
     *       <tr><td><code>profile_image_url_https</code></td><td>Profile image</td></tr>
     *       <tr><td><code>from_user_id</code></td><td>User ID</td></tr>
     *       <tr><td><code>profile_image_url</code></td><td>Profile image URL</td></tr>
     *       <tr><td><code>geo</code></td><td>Tweet's geo location</td></tr>
     *       <tr><td><code>source</code></td><td>Service/device used to make the Tweet</td></tr>
     *       <tr><td><code>to_user</code></td><td>To Twitter name</td></tr>
     *       <tr><td><code>text</code></td><td>Content of the Tweet</td></tr>
     *       <tr><td><code>from_user</code></td><td>Twitter user name</td></tr>
     *       <tr><td><code>iso_language_code</code></td><td>Language code</td></tr>
     *       <tr><td><code>to_user_id_str</code></td><td>To user ID</td></tr>
     *       <tr><td><code>to_user_name</code></td><td>To full user name</td></tr>
     *     </tbody>
     *   </table>
     * </div></div>
     * 
     * <div class="row">
     *   <div class="span9">
     *     <h3>SearchTerm options</h3>
     *     <table class="table table-striped table-bordered table-condensed">
     *       <thead><tr><th>Example</th><th>Find tweets ...</th></tr></thead>
     *       <tbody>
     *         <tr><td><code>twitter search</code></td><td>containing both "twitter" and "search". This is the default operator</td></tr>
     *         <tr><td><code>"happy hour"</code></td><td>containing the exact phrase "happy hour"</td></tr>
     *         <tr><td><code>love OR hate</code></td><td>containing either "love" or "hate" (or both)</td></tr>
     *         <tr><td><code>beer -root</code></td><td>containing "beer" but not "root"</td></tr>
     *         <tr><td><code>#haiku</code></td><td>containing the hashtag "haiku"</td></tr>
     *         <tr><td><code>from:twitterapi</code></td><td>sent from the user @twitterapi</td></tr>
     *         <tr><td><code>to:twitterapi</code></td><td>sent to the user @twitterapi</td></tr>
     *         <tr><td><code>place:opentable:2</code></td><td>about the place with OpenTable ID 2</td></tr>
     *         <tr><td><code>place:247f43d441defc03</code></td><td>about the place with Twitter ID 247f43d441defc03</td></tr>
     *         <tr><td><code>@twitterapi</code></td><td>mentioning @twitterapi</td></tr>
     *         <tr><td><code>superhero since:2011-05-09</code></td><td>containing "superhero" and sent since date "2011-05-09" (year-month-day).</td></tr>
     *         <tr><td><code>twitterapi until:2011-05-09</code></td><td>containing "twitterapi" and sent before the date "2011-05-09".</td></tr>
     *         <tr><td><code>movie -scary :)</code></td><td>containing "movie", but not "scary", and with a positive attitude.</td></tr>
     *         <tr><td><code>flight :(</code></td><td>containing "flight" and with a negative attitude.</td></tr>
     *         <tr><td><code>traffic ?</code></td><td>containing "traffic" and asking a question.</td></tr>
     *         <tr><td><code>hilarious filter:links</code></td><td>containing "hilarious" and with a URL.</td></tr>
     *         <tr><td><code>news source:tweet_button</code></td><td>containing "news" and entered via the Tweet Button</td></tr>
     *         <tr><td colspan="2">
     *           <h5>Tips:</h5>
     *           <ul>
     *             <li>You cannot use a negation (the '-' minus sign)</li>
     *             <li>Dates must be in YYYY-MM-DD format.  Hint: Try using the =dateToYMD() function</li>
     *             <li>Dates in Twitter are always UTC timezone</li>
     *             <li>The start date can't be later than the end date</li>
     *             <li>To have multi word searches, use an underscore instead of a space</li>
     *           </ul>
     *         </td></tr>
     *       </tbody>
     *     </table>
     *   </div>
     * </div>
     * 
     * @param {string} serarchTerm Search term
     * @param {string} optResults (Optional) Number of tweets to return 
     *                 (default is 25. Max is 100).
     * @param {array|range} optCols (Optional) Columns you want to get back 
     *                      from Twitter.  Default columns: "created_at", 
     *                      "from_user", "to_user", "text"
     * @see {@link https://dev.twitter.com/docs/api/1/get/search}     
     * @return {array|cells} Twitter results
     * 
     * @function Twitter.getTwitterSearch
     * @since 1.3
     *     
     * @example
     * Cells:
     * A1: @wilreynolds
     * =getTwitterSearch(A1)      // Last 25 tweets containing "@wilreynolds"
     * =getTwitterSearch(A1, 50)  // Last 50 tweets containing "@wilreynolds"
     * 
     * // Get the date of the tweet, the tweet itself, and the 
     * // service or device they used to make the tweet.
     * A1: created_at
     * B1: text
     * C1: source
     * A2: =getTwitterSearch("#fml", 25, A1:C1)
     * 
     * // Get tweets sent to @djchrisle
     * =getTwitterSearch("to:djchrisle")
     * 
     * // Get tweets sent from @djchrisle
     * =getTwitterSearch("from:djchrisle")
     * 
     * // Get tweet containing the word "pinterest" and "seo"
     * =getTwitterSearch("pinterest_seo")
     * 
     * // Get tweet containing the word "pinterest" and "seo" 
     * // since Jan 15, 2012
     * =getTwitterSearch("pinterest_seo since:2012-01-15")
     * 
     * // Get tweet containing the word "pinterest" and "seo" 
     * // since Jan 15, 2012 but using a date in cell
     * Cells:
     * A1: 01/15/2012
     * =getTwitterSearch("pinterest_seo since:" & dateToYMD(A1))
     * 
     * // Get tweet containing the word "pinterest" and "seo" 
     * // since Jan 15, 2012 but using a date in cell and terms from cells
     * Cells:
     * A1: 01/15/2012
     * A2: pinterest
     * A3: seo
     * =getTwitterSearch(cellsToTwitterSearch(A2:A3) & "since:" & dateToYMD(A1))
     */
    search: function(searchQuery, optResults, optCols) {
      optCols = optCols || ["created_at", "from_user", "to_user", "text"];
      optResults = optResults || 25;
      var optResults = (optResults != undefined) ? "&rpp=" + optResults : "";
      var searchTerm  = encodeURIComponent(searchTerm);
      var response = SeerJs.Http.getJson("http://search.twitter.com/search.json", {
          'q' : searchTerm + optResults
      });
      if (response.results.length == 0) { return response.error; }
      return filterColumns(response.results, optCols);
    },

    /**
     * Returns information about one or more Twitter accounts<p>
     * <b>Limits</b>
     * <li>The maximum range is 100 twitter accounts.</li>
     * <li>Twitter's API limits you up to 150 calls per hour</li>
     *  
     * <p><b>Available columns</b>
     * <p><i>(Default columns returned by this function are marked with a (*)</i><p>
     * 
     * <li>name</li>
     * <li>profile_sidebar_border_color</li>
     * <li>profile_background_tile</li>
     * <li>profile_sidebar_fill_color</li>
     * <li>location (*)</li>
     * <li>profile_image_url</li>
     * <li>created_at (*)</li>
     * <li>profile_link_color</li>
     * <li>favourites_count (*)</li>
     * <li>url (*)</li>
     * <li>contributors_enabled</li>
     * <li>utc_offset</li>
     * <li>id (*)</li>
     * <li>profile_use_background_image</li>
     * <li>profile_text_color</li>
     * <li>protected</li>
     * <li>followers_count (*)</li>
     * <li>lang (*)</li>
     * <li>verified (*)</li>
     * <li>profile_background_color</li>
     * <li>geo_enabled (*)</li>
     * <li>notifications</li>
     * <li>description (*)</li>
     * <li>time_zone (*)</li>
     * <li>friends_count (*)</li>
     * <li>statuses_count (*)</li>
     * <li>profile_background_image_url</li>
     * 
     * @param  {array|cells} screenNamesRange Cells of of twitter accounts to search
     * @param  {array|cells} optCols Columns you want returned from Twitter
     * @return {array|cells} Twitter results
     * 
     * @name getTwitterUserLookup
     * @function
     * @since 1.3
     * @memberOf Twitter
     * 
     * @example
     * Cells:
     *   A1: djchrisle
     *   A2: wilreynolds
     *   A3: seerinteractive
     * 
     * // Get default columns about the following Twitter users 
     * =getTwitterUserLookup(A2:A3)
     * 
     */
    userLookup: function(screenNamesRange, optCols) {
      var defaultCols = ["location", 
                         "created_at",
                         "favourites_count",
                         "url",
                         "id",
                         "followers_count",
                         "lang",
                         "verified",
                         "geo_enabled",
                         "description",
                         "time_zone",
                         "friends_count",
                         "statuses_count"];
      optCols = optCols || defaultCols;
      var screen_names = (isArray(screenNamesRange)) ? 
          screenNamesRange.join(",") : screenNamesRange;
      var response = SeerJs.Http.getJson("http://api.twitter.com/1/users/lookup.json", {
          'screen_name' : screen_names
      });
      return filterColumns(response, optCols); 
    }
  };

})();

function getTwitterUserLookup(screenNamesRange, optCols) {
  return SeerJs.TwitterApi.userLookup(screenNamesRange, optCols);
}

function getTwitterSearch(searchQuery, optResults, optCols) {
  return SeerJs.TwitterApi.search(searchQuery, optResults, optCols); 
}
