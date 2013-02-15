/* ---------------------------------------------------------------------------
 * ga_tools.js
 * -------------------------------------------------------------------------*/

SeerJs.GoogleAnalyticsTools = { 

  /**
   * Create event tracking code in JavaScript
   * @param  {[type]} category       [description]
   * @param  {[type]} action         [description]
   * @param  {[type]} label          [description]
   * @param  {[type]} value          [description]
   * @param  {[type]} implicitCount  [description]
   * @param  {[type]} optGaArrayName [description]
   * @return {[type]}
   */
  trackEvent: function(category, action, optLabel, optValue, implicitCount, optGaArrayName) {
    
    // Assign default values
    optGaArrayName = optGaArrayName || '_gaq';
    label = optLabel || undefined;
    value = parseInt(optValue) || undefined;

    // Check for require fields
    if (category === undefined) { SeerJs.Error.set('Category is required.'); }
    if (action === undefined) { SeerJs.Error.set('Action is required.'); }
    if (SeerJs.Error.hasOccurred()) { return SeerJs.Error.get(); }
    
    // Generate the event tracking event
    var pushArray = [
      '_trackEvent'.inQuotes(),
      category.inQuotes(),
      action.inQuotes()
    ];
    if (label != undefined) { pushArray.push(label.inQuotes()); }
    if (value != undefined) { pushArray.push(value); }

    // return a push
    return optGaArrayName + '.push([' + pushArray.join(',') + ']);';
  },

  outboundEventTracking: function(outboundLink, anchorText, category, 
                                  optNewWindow, optGaArrayName) {
    
    var target = (optNewWindow) ? ' target="_blank" ' : '';
    var ahref = '<a href="' + outboundLink + '" onClick="' 
        + trackEvent(category, 'outboundClick', outboundLink)
        + target + '>' + anchorText + '</a>';
    var getGaMetric = 'getGaMetric(clientId, "totalEvents", startDate, endDate, ,'
        + '"ga:eventCategory==' + category + ','
        + '"ga:eventAction==outboundClick,'
        + '"ga:eventLabel==' + outboundLink + '")';
    return [ahref, getGaMetric];
    
  }

};

function createEventTrackingCode(category, action, label, value, implicitCount, 
                           optGaArrayName) {
  return SeerJs.GoogleAnalyticsTools.trackEvent(category, action, label, value,
      implicitCount, optGaArrayName);
}

