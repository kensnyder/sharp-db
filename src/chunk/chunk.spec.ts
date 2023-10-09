import chunk from './chunk';

describe('chunk', () => {
	it('should return empty array if input is empty', () => {
		const empty = [];
		const result = chunk(empty, 5);
		expect(result).toEqual([]);
		expect(result).not.toBe(empty);
	});
	it('should return a chunked array', () => {
		const list = [1, 2, 3, 4, 5];
		const chunked = chunk(list, 2);
		expect(chunked).toEqual([[1, 2], [3, 4], [5]]);
	});
});
