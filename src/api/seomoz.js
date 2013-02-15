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

