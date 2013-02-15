/* ---------------------------------------------------------------------------
 * OnPage.js
 * -------------------------------------------------------------------------*/

/**
 @namespace     OnPage
 @classdesc     On-page Analysis Tools
 @exposeModule  SeerJs.OnPage
 @exposeAs      OnPage
 @author        Chris Le <chrisl at seerinteractive.com>
 */

SeerJs.OnPage = (function() { 

  return {
    /**
     * Gets the HTML content from a URL and puts the whole thing in a cell.
     * @param  {string} url URL to get content from
     * @return {string} HTML content
     * @since 1.5
     * @function OnPage.getOnPageContent
     * 
     * @example
     * Cells:
     *   A1: http://www.seerinteractive.com
     * =getHttpContent(A1)
     * 
     * // Directly using a parameter instead of cell
     * =getHttpContent("http://www.seerinteractive.com")
     * 
     */
    content: function (url) {
      return SeerJs.Http.fetch(url).trim();
    },

    /**
     * @summary
     * Gets the content's text without HTML that is inside the body tag.
     * 
     * 
     * @param  {string} url URL to get text from
     * @return {string} Text thats in the body tag
     * @since  1.4
     * @function OnPage.getOnPageBodyText
     * 
     * @example
     * Cells:
     *   A1: http://www.seerinteractive.com
     * =getOnPageBodyText(A1)
     * 
     * // Directly using a parameter instead of cell
     * =getOnPageBodyText("http://www.seerinteractive.com")
     * 
     */
    bodyText: function (url) {
      return SeerJs.Http.fetch(url).contentInBodyTag();
    },

    /**
     * @summary
     * Counts the number of words that are inside the HTML body
     * 
     * @param  {string} url URL that you want to get a word count from
     * @return {integer} Number of words in the body
     * @since 1.4
     * @function OnPage.getOnPageBodyWordCount
     * 
     * @example
     * Cells:
     * A1: http://www.seerinteractive.com
     * =getOnPageBodyWordCount(A1)
     * 
     * // Without using a cell
     * =getOnPageBodyWordCount("http://www.seerinteractive.com")
     * 
     */ 
    bodyWordCount: function (url) {
      var plainText = SeerJs.Http.fetch(url).contentInBodyTag();
      if (!SeerJs.Error.hasOccurred()) {
        var words = plainText.split(/[\s\t\n\r]+/g);
        return words.length;
      } else {
        return SeerJs.Error.get();
      }
    },

    /**
     * Detect a URL inside an arbitrary string
     * see: http://daringfireball.net/2010/07/improved_regex_for_matching_urls
     * 
     */
    detectUrl: function(str) {
        // (?i)\b((?:[a-z][\w-]+:(?:/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))
        // (?i)\b((?:https?://|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))
    }

  };

})();

function getOnPageContent(url) { return (SeerJs.Error.hasOccurred()) ? SeerJs.Error.get() : SeerJs.OnPage.content(url); }

function getOnPageBodyText(url) { return (SeerJs.Error.hasOccurred()) ? SeerJs.Error.get() : SeerJs.OnPage.bodyText(url); }

function getOnPageBodyWordCount(url) { return (SeerJs.Error.hasOccurred()) ? SeerJs.Error.get() : SeerJs.OnPage.bodyWordCount(url); }


/*
ideas:

seo - onpage
LinkCount
HtmlTitle
HtmlMetaDescription
HtmlMetaKeywords
HtmlMeta
HtmlFirst
HtmlH1
HtmlH2
HtmlH3
HtmlCanonical
W3CValidate
PageCodeToTextRatio
PageSize
PageTextSize
PageCodeSize
HttpStatus
HttpHeader
ResponseTime
PageEncoding
IsFoundOnPage

content
FindDuplicatedContent
CountWords
LCS
SpinText

backlinks
CheckBacklink
GooglePageRank
GoogleResultCount
GoogleIndexCount
GoogleLinkCount
AlexaReach
AlexaPopularity
AlexaLinkCount
BleckoLinkingDomains
BleckoInboundLinks

network
WhoIs
WhoIsDomainCreated
WhoIsDomainUpdated
WhoIsDomainExpires
IsDomainRegistered
InternetArchiveFirstSeen
DomainAge
ResolveIp

string
Format
StringJoin
RegexpIsMatch
RegexpFind
RegexpReplace
UrlEncode
UrlDecode
UrlProperty

social
FacebookLikes
GooglePlusCount
TwitterCount

*/
