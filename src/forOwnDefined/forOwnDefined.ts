/**
 * Iterate an object ignoring inherited and undefined values
 * @param object  The object to iterate
 * @param iteratee  The function to call for each item; takes args value, key, object
 */
export default function forOwnDefined<InputObject extends Record<string, any>>(
	object: InputObject,
	iteratee: (value: any, key: keyof InputObject, object: InputObject) => void
) {
	for (const key in object) {
		if (!object.hasOwnProperty(key) || object[key] === undefined) {
			continue;
		}
		iteratee(object[key], key, object);
	}
}
