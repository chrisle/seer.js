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

