/* ---------------------------------------------------------------------------
 * klout.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     Klout
 @classdesc     Klout API
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.KloutApi = (function() { 
 
  KLOUT_API_KEY = getSetting("Klout API Key");

  function kloutFetch_ (users) {
    // fetches xml
    return SeerJs.Http.getXml("http://api.klout.com/1/users/show.xml", {
      "key": KLOUT_API_KEY,
      "users": users
    });  
  }

  function kloutPushRows_ (retval, response) {
    // Creates a row in the array
    retval.push(["twitter_id", "kscore", "slope", "description", "kclass_id", 
                 "kclass", "kclass_description", "network_score", 
                 "amplification_score", "true_reach", "delta_1day", 
                 "delta_5day"]);
    var usersInResponse = response.users.user.length;
    if (usersInResponse > 1) {
      for (var i = 0; i < usersInResponse; i++) {
        retval.push(kloutPushCols_(retval, response.users.user[i]));
      }
    } else {
      retval.push(kloutPushCols_(retval, response.users.user));
    }
    return retval;
  }

  function kloutPushCols_ (retval, user) {
    // pushes data to one row
    return ([user.twitter_id.getText(),
             user.score.kscore.getText(),
             user.score.slope.getText(),
             user.score.description.getText(),
             user.score.kclass_id.getText(),
             user.score.kclass.getText(),
             user.score.kclass_description.getText(),
             user.score.network_score.getText(),
             user.score.amplification_score.getText(),
             user.score.true_reach.getText(),
             user.score.delta_1day.getText(),
             user.score.delta_5day.getText()]);
  }

  return {

    score: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["kscore"]]);
    },

    trueReach: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["true_reach"]], false); 
    },

    delta1: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["delta_1day"]], false); 
    },

    delta5: function(usersRange) {
      return filterColumns(getKlout(usersRange), [["delta_5day"]] , false); 
    },

    all: function(usersRange) {
      usersRange = strToArray(usersRange);
      var users = SeerJs.groupBy(usersRange, 5);
      var retval= [];
      for (var i = 0; i < users.length; i++) {
        var str = users[i].join(',');
        retval = kloutPushRows_(retval, kloutFetch_(str));
      }
      return retval;
    }
    
  };
})();

/**
 * @summary
 *   Gets just the Klout score for one or many Twitter users.
 * 
 * @desc
 *   If all you need is the Klout score this function provides a shortcut
 *   to getKloutAll that will only return the Klout score.
 *   
 * @param {Array | Range} usersRange 
 *        Range of cells of user's Twitter names<br/>
 *        <span class="label label-info">Note</span>
 *        Twitter names needs to be be without the @ symbol.
 *        
 * @since 1.2
 * @function Klout.getKloutScore
 * 
 * @example
 * <caption>
 *   <h4>Klout score for one person</h4>
 * </caption>
 * =getKloutScore("djchrisle")
 * 
 * @example
 * <caption>
 *   <h4>Klout score for many people</h4>
 * </caption>
 * Cells:
 *   A2: djchrisle
 *   A3: wilreynolds
 *   A4: seerinteractive
 * =getKloutScore(A2:A4)
 * 
 */
function getKloutScore(usersRange) { 
  return (SeerJs.Error.hasOccurred()) 
      ? SeerJs.Error.get() 
      : SeerJs.KloutApi.score(usersRange); 
}

/**
 * @function Klout.getKloutAll
 * @since 1.2
 * 
 * @summary
 *   Gets all data from Klout, including Klout score, for one or many Twitter users.
 * 
 * @desc 
 *   This function will return all the data made available by the Klout API.
 *   
 *   <div class="alert alert-success">
 *     <strong>Tip:</strong> Select Twitter accounts in multiples of 5.  Klout
 *     processes them five at a time.
 *   </div>
 *   <div class="alert alert-error">
 *     <strong>Limitation:</strong> Google Docs might timeout if you select
 *     too many Twitter users. Try a smaller number of users.
 *   </div>
 * 
 * @param {Array | Range} usersRange 
 *        Range of cells of user's Twitter names<br/>
 *        <span class="label label-info">Note</span>
 *        Twitter names needs to be be without the @ symbol.
 *
 * @returns twitter_id:           Twitter ID
 * @returns kscore:               Klout score
 * @returns slope:                Scope
 * @returns description:          Description of the score
 * @returns kclass_id:            Klout classification ID
 * @returns kclass:               Klout classification
 * @returns kclass_description:   Klout classification description
 * @returns network_score:        Network score
 * @returns amplification_score:  Amplification score
 * @returns true_reach:           True reach score
 * @returns delta_1day:           Change in Klout score over 1 day
 * @returns delta_5day:           Change in Klout score over 5 days

 * 
 * @example
 * <caption>
 *   <h4>Klout data for one person</h4>
 * </caption>
 * =getKloutAll("djchrisle")
 * 
 * @example
 * <caption>
 *   <h4>Klout data for many people</h4>
 * </caption>
 * Cells:
 *   A2: djchrisle
 *   A3: wilreynolds
 *   A4: seerinteractive
 * =getKlout(A2:A4)
 * 
 */
function getKloutAll(usersRange) { 
  return (SeerJs.Error.hasOccurred()) 
      ? SeerJs.Error.get() 
      : SeerJs.KloutApi.all(usersRange); 
}

