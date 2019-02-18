const { Select } = require('../../dist/index.js');
const expect = require('chai').expect;

describe('Select', function() {
	describe('class', function() {
		it('should be instantiable', function() {
			const query = new Select();
			expect(query).to.be.instanceof(Select);
		});
	});
});
