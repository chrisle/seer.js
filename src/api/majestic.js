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
