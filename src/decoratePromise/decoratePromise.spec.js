const decoratePromise = require('./decoratePromise.js');

describe('decoratePromise', () => {
	it('should be a function', () => {
		expect(decoratePromise).toBeInstanceOf(Function);
	});
	it('should return a Promise', () => {
		const promise = decoratePromise(Promise.resolve({}));
		expect(promise).toBeInstanceOf(Promise);
	});
	it('should error on "results"', () => {
		function tryIt() {
			const { results } = decoratePromise(Promise.resolve({}));
		}
		expect(tryIt).toThrow(/await/);
	});
	it('should error on "results" after then()', () => {
		function tryIt() {
			const { results } = decoratePromise(
				Promise.resolve({}).then(() => 'foo')
			);
		}
		expect(tryIt).toThrow(/await/);
	});
});
