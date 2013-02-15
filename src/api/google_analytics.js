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
      if (sort == true) {
        URL = URL + "&sort=-" + metrics;
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
 *        <em class="muted">(Optional)</em> Sort<br/>
 *        <span class="label label-important">Known Bug</span>
 *        Sorting doesn't work. You have to sort the data yourself.
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

