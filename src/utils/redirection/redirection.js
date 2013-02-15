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
