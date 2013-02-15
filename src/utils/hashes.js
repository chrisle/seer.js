
/* ---------------------------------------------------------------------------
 * hashes.js
 * -------------------------------------------------------------------------*/
/**
 @namespace     Hashes
 @classdesc     Hash Calculations
 @author        Chris Le <chrisl at seerinteractive.com>
 @exposeModule  SeerJs.Hashes
 @exposeAs      Hashes
 */

/**
 * @summary
 * Returns a base64 encoded MD5 hash of a string
 *
 * @function Hashes.computeMD5
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeMD5(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA1 hash of a string
 *
 * @function Hashes.computeSHA1
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA1(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA256 hash of a string
 *
 * @function Hashes.computeSHA256
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA256(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA384 hash of a string
 *
 * @function Hashes.computeSHA384
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA384(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_384, str);
  return Utilities.base64Encode(digest);
}

/**
 * @summary
 * Returns a base64 encoded SHA512 hash of a string
 *
 * @function Hashes.computeSHA512
 * @since 1.6.4
 * @param {string} str String to hash
 */
function computeSHA512(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, str);
  return Utilities.base64Encode(digest);
}
