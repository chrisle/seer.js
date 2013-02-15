/* ---------------------------------------------------------------------------
 * settings.js
 * -------------------------------------------------------------------------*/

/**
 * @namespace Settings
 * @classdesc Used for getting settings from the "Settings" worksheet
 * @author    Chris Le <chrisl at seerinteractive.com>
 */
SeerJs.Settings = (function() {

  function getSettingsSheet_() {
    SETTINGS_SHEET = "Settings";
    var thisDoc = SpreadsheetApp.getActiveSpreadsheet();
    var settingsSheet = thisDoc.getSheetByName(SETTINGS_SHEET);
    if (settingsSheet == null) {
      SeerJs.Error.set('Settings sheet not found. Created one for you.');
      thisDoc.insertSheet(SETTINGS_SHEET);
    }
    return settingsSheet;
  }

  return {
    /**
     * Returns setting names need to be in column A and the setting value needs to
     * be in column B.
     *
     * @param {string} settingName Name of the setting you want to return
     * @since 1.0
     * @return The setting or false if not found.
     */
    get: function(settingName) {
      var settings = getSettingsSheet_().getRange("A:B").getValues();
      for (var i = 0; i < settings.length; i++) {
        var setting = settings[i][0];
        if (settings[i][0].toUpperCase() == settingName.toUpperCase()) {
          return settings[i][1];
        }
      }
      SeerJs.Error.set('Could not find the setting "' + settingName + '"');
      return false;
    }

  };

})();


function getSetting(settingName) { return SeerJs.Settings.get(settingName); }

