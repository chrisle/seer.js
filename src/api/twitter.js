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
