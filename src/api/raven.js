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
