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
