import forOwn from './forOwnDefined';

describe('forOwn', () => {
	it('should iterate', () => {
		const obj = { foo: 'bar' };
		forOwn(obj, (value, key, object) => {
			expect(value).toBe('bar');
			expect(key).toBe('foo');
			expect(object).toBe(obj);
		});
		expect.assertions(3);
	});
	it('should ignore inherited values', () => {
		const Animal = function () {};
		Animal.prototype.home = 'nature';
		const Dog = function () {};
		Dog.prototype = new Animal();
		const fido = new Dog();
		fido.color = 'black';
		forOwn(fido, (value, key) => {
			expect(value).toBe('black');
			expect(key).toBe('color');
		});
		expect.assertions(2);
	});
	it('should ignore undefined values', () => {
		const keys = [];
		const obj = { foo: 'bar', baz: undefined };
		forOwn(obj, (value, key) => {
			keys.push(key);
		});
		expect(keys).toEqual(['foo']);
	});
});
