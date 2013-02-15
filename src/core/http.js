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
