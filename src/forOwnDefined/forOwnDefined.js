/**
 * Iterate an object ignoring inherited and undefined values
 * @param {Object} object  The object to iterate
 * @param {Function} iteratee  The function to call for each item; takes args value, key, object
 */
function forOwnDefined(object, iteratee) {
	for (const key in object) {
		if (!object.hasOwnProperty(key) || object[key] === undefined) {
			return;
		}
		iteratee(object[key], key, object);
	}
}

module.exports = forOwnDefined;
