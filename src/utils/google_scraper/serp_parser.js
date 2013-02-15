//-------------------------------------------------------------------------
// SerpParser 
// 
// Given HTML from a Google page it will return 

SeerJs.GoogleSerpParser = function(html, options) {
  init();

  function init() {
    var temp = html;
    html = temp.replace(/\n|\r/g, '');
  }

  function extractTags(haystack, start, end) {
    var retval = [];
    var temp = haystack.split(start);
    var i = 0;
    var len = temp.length;
    if (len > 0) {
      while (i < len) {
        var endIndex = temp[i].indexOf(end);
        if (endIndex > 0) { 
          // console.log(endIndex);
          var content = temp[i].substr(0, endIndex);
          // console.log('pushing --- ' + content)
          if (content != '...') { retval.push(content); }
        }            
        i++;
      }
      return (retval.length == 1) ? retval[0].toString() : retval;
    } else {
      return false;
    }
  }

  function eachTag(section, tag, block) {
    var temp = section.split(tag), i = 0, len = temp.length;
    if (len > 0) {
      while (i < len) {
        block(temp[i]);
        i++;
      }
    }
  }

  function organicSection() {
    var z = html;
    return html.match(
        /<div id=\"res\"><div id=\"ires\"><ol>(.*)<\/ol><\/div><\/div>/
        )[1].toString();
  }

  function extractOrganicResult(serp) {
    var temp;
    temp = {
      'title'   : extractTags(serp, '<h3 class="r">', '</h3>').removeTags().unescapeHTML(),
      'url'     : extractTags(serp, '/url?q=', '&amp;sa'),
      'desc'    : extractTags(serp, '<div class="s">', '<div>').removeTags().unescapeHTML(),
      'cite'    : extractTags(serp, '<cite>', '</cite>').toString().removeTags().unescapeHTML(),
      'bolded'  : extractTags(serp, '<b>', '</b>').toString(),
      'cache'   : 'http:' + extractTags(serp, '"flc"> - <a href=\"', '\">Cached</a>')
    };
    temp = handleUniversalResult(serp, temp);
    return temp;
  }

  function handleUniversalResult(serp, result) {
    if (options['showUniversal']) {
      if (result['url'].length === 0) {
        result['url'] = 'http://www.google.com/' + extractTags(serp, '<a href=\"\/', '\">')[1];
      }        
    }
    return result;
  }

  return {

    all: function() {
      var results = [], result;
      eachTag(organicSection(), '<li class=\"g\">', function(serp) {
        if (serp.length ) {
          var result = extractOrganicResult(serp);
          if (result['url'].length > 0) { results.push(result); }
        }
      });
      return results;
    }

  };
};
