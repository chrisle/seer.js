/* ---------------------------------------------------------------------------
 * string.js
 * -------------------------------------------------------------------------*/

/**
 * Trims whitespace from the beginning and end of a string
 */
String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g, '');
}

/**
 * Removes newlines from a string
 */
String.prototype.stripNewline = function() {
  return this.replace(/\n|\r/g, '');
}

/**
 * Replaces two or more whitespaces with one whitespace
 */
String.prototype.stripMultiSpace = function() { 
  return this.replace(/\s{2,}/g, '');
}

/**
 * Converts a string into a one dimentional array
 */
String.prototype.toArray = function() {
  return [this];
}

/**
 * Returns the string surrounded in single quotes.
 */
String.prototype.inQuotes = function() {
  return "'" + this + "'";
}

/**
 * Lets left n characters from a string
 */
String.prototype.left = function(n) {
  if (n <= 0)
    return "";
  else if (n > String(this).length)
    return this;
  else
    return String(this).substring(0,n);
}

/**
 * Lets right n characters from a string
 */
String.prototype.right = function(n) {
  if (n <= 0)
    return "";
  else if (n > String(this).length)
    return this;
  else {
    var iLen = String(this).length;
    return String(this).substring(iLen, iLen - n);
  }
}

//----------------------------------------------------------------------------
// URLs

/**
 * True if the string has a path
 */
String.prototype.hasPathInURL = function() {
  if (this.indexOf('http') != -1) {
    return (this.split('/').length > 4) ? true : false;
  } else {
    return (this.split('/').length > 2) ? true : false;
  }
}

/**
 * Returns just the domain name of a URL
 */
String.prototype.getDomainName = function() {
  regex = new RegExp(/((www)\.)?.*(\w+)\.([\w\.]{2,6})/);
  return regex.exec(this)[0]
           .replace(/^http(s)?:\/\//i, "")
           .replace(/^www\./i, "")
           .replace(/\/.*$/, "");
}

/**
 * URL encodes a string
 * (Old PHP habit, sorry)
 */
String.prototype.urlencode = function() { 
  return encodeURIComponent(this);
}

//----------------------------------------------------------------------------
// HTML

/**
 * Removes one tag or all tags
 * (Taken from Prototype.js)
 * @param  {string} str String to perform tag removal to
 * @param  {tag} tag HTML tag to remove.  Undefined will remove all tags
 * @return {string} String with tags removed
 */
String.prototype.removeTags = function(tag) {
  if (tag === undefined) {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  } else {
    var reBegin = new RegExp('(<(' + tag + '[^>]+)>)', 'ig');
    var reEnd = new RegExp('(<(\/' + tag + '[^>]?)>)', 'ig');
    return this.replace(reBegin, '').replace(reEnd, '');        
  }  
}

/**
 * Unescapes HTML strings
 */
String.prototype.unescapeHTML = function() {
  // Taken from Prototype
  return this
      .replace(/&lt;/g,'<')
      .replace(/&gt;/g,'>')
      .replace(/&amp;/g,'&')
      .replace(/&#39;/g,"'");
} 

/**
 * Returns just the text inside the body tag
 * @param  {string} str Input string
 * @return {string} The text inside the body tag
 */
String.prototype.contentInBodyTag = function() {
  return this
      .replace(/\n|\r/g, '')
      .match(/\<body.*/)[0]
      .replace(/\</gi, ' <')
      .replace(/\<.*?\>/gi, '');
}

/**
 * Extracts the string between the first instance of (start) and the first
 * instace of (end)
 */
String.prototype.extractBetween = function(start, end) {
  var retval = [];
  var temp = this.split(start);
  var i = 0;
  var len = temp.length;
  if (len > 0) {
    while (i < len) {
      var endIndex = temp[i].indexOf(end);
      if (endIndex > 0) { 
        var content = temp[i].substr(0, endIndex);
        if (content != '...') { retval.push(content); }
      }            
      i++;
    }
    return (retval.length == 1) ? retval[0].toString() : retval;
  } else {
    return false;
  }
}

/**
 * Strips all the whitespaces from a string
 */
String.prototype.stripAllSpaces = function() {
  return this.replace(/ /g, '');
}

//----------------------------------------------------------------------------
// Google Analytics

/**
 * Escapes characters for use with Google Analytics.
 */
String.prototype.encodeGa = function() {

  var el = this.split('ga:');
  var i = 0; len = el.length;
  while (i < len) {
    el[i] = el[i]
      .trim()
      .replace(/=/g, '%3D')           // escape equals sign
      .replace(/>/g, '%3E')           // escape equals sign
      .replace(/</g, '%3C')           // escape equals sign
      .replace(/,\s{1,}/g, ',')       // remove white space after ,
      .replace(/;\s{1,}/g, ';')       // remove white space after ;
      .replace(/\s/, '%20')           // convert remaining spaces to %20
      ;
    i++;
  }
  return el.join('ga:');

}

