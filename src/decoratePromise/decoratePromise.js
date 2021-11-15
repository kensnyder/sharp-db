const commonProps = [
	'results',
	'insertId',
	'affectedRows',
	'changedRows',
	'query',
	'queries',
];

const descriptors = commonProps.map(prop => {
	return {
		get: () => {
			throw new Error(
				`Did you forget "await"? Promise has no property "${prop}".`
			);
		},
	};
});

/**
 * In dev, decorate the given Promise with properties that alert
 * developers when they try to use the promise without "await"
 * @param {Promise} promise
 * @return {Promise}
 */
function decoratePromise(promise) {
	if (['test', 'development'].includes(process.env.NODE_ENV)) {
		commonProps.forEach((prop, i) => {
			Object.defineProperty(promise, prop, descriptors[i]);
		});
	}
	return promise;
}

module.exports = decoratePromise;
