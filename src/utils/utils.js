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


