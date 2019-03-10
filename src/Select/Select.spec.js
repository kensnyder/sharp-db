const { Select } = require('../../dist/index.js');
const expect = require('chai').expect;

describe('Select', function() {
	describe('class', function() {
		it('should be instantiable', function() {
			const query = new Select();
			expect(query).to.be.instanceof(Select);
		});
	});
	describe('where() with arguments', function() {
		it('should handle expressions', function() {
			const query = new Select();
			query.where('mycol = LOWER(mycol2)');
			expect(query._wheres[0]).to.equal('mycol = LOWER(mycol2)');
		});
		it('should handle equals', function() {
			const query = new Select();
			query.where('mycol', 'myval');
			expect(query._wheres[0]).to.equal("`mycol` = 'myval'");
		});
		it('should handle automatic IN', function() {
			const query = new Select();
			query.where('mycol', [1, 2]);
			expect(query._wheres[0]).to.equal('`mycol` IN(1,2)');
		});
		it('should handle explicit IN', function() {
			const query = new Select();
			query.where('mycol', 'IN', [1, 2]);
			expect(query._wheres[0]).to.equal('`mycol` IN(1,2)');
		});
		it('should handle automatic NOT IN', function() {
			const query = new Select();
			query.where('mycol', '!=', [1, 2]);
			expect(query._wheres[0]).to.equal('`mycol` NOT IN(1,2)');
		});
		it('should handle explicit NOT IN', function() {
			const query = new Select();
			query.where('mycol', 'NOT IN', [1, 2]);
			expect(query._wheres[0]).to.equal('`mycol` NOT IN(1,2)');
		});
		it('should handle BETWEEN', function() {
			const query = new Select();
			query.where('mycol', 'BETWEEN', [1, 2]);
			expect(query._wheres[0]).to.equal('`mycol` BETWEEN 1 AND 2');
		});
		it('should handle operators', function() {
			const query = new Select();
			query.where('mycol', '>', 3);
			expect(query._wheres[0]).to.equal('`mycol` > 3');
		});
		it('should handle NULL', function() {
			const query = new Select();
			query.where('mycol', null);
			expect(query._wheres[0]).to.equal('`mycol` IS NULL');
		});
		it('should handle NOT NULL', function() {
			const query = new Select();
			query.where('mycol', '!', null);
			expect(query._wheres[0]).to.equal('`mycol` IS NOT NULL');
		});
		it('should handle LIKE', function() {
			const query = new Select();
			query.where('mycol', 'LIKE', 'foo');
			expect(query._wheres[0]).to.equal("`mycol` LIKE 'foo'");
		});
		it('should handle LIKE %?', function() {
			const query = new Select();
			query.where('mycol', 'LIKE %?', 'foo');
			expect(query._wheres[0]).to.equal("`mycol` LIKE '%foo'");
		});
		it('should handle LIKE ?%', function() {
			const query = new Select();
			query.where('mycol', 'LIKE ?%', 'foo');
			expect(query._wheres[0]).to.equal("`mycol` LIKE 'foo%'");
		});
		it('should handle LIKE %?%', function() {
			const query = new Select();
			query.where('mycol', 'LIKE %?%', 'foo');
			expect(query._wheres[0]).to.equal("`mycol` LIKE '%foo%'");
		});
	});
	describe('where() with Arrays', function() {
		it('should handle numeric arrays', function() {
			const query = new Select();
			query.where(['mycol = LOWER(mycol2)']);
			expect(query._wheres[0]).to.equal('mycol = LOWER(mycol2)');
		});
	});
	describe('where() with Objects', function() {
		it('should handle automatic equals', function() {
			const query = new Select();
			query.where({ mycol: 'myval' });
			expect(query._wheres[0]).to.equal("`mycol` = 'myval'");
		});
		it('should handle automatic IN', function() {
			const query = new Select();
			query.where({ mycol: [1, 2] });
			expect(query._wheres[0]).to.equal('`mycol` IN(1,2)');
		});
		it('should handle operators', function() {
			const query = new Select();
			query.where({ 'mycol >': 3 });
			expect(query._wheres[0]).to.equal('mycol > 3');
		});
	});
	describe('orWhere()', function() {
		it('should handle expressions', function() {
			const query = new Select();
			query.orWhere([['a', '>', 1], ['b', 2]]);
			expect(query._wheres[0]).to.equal('(`a` > 1 OR `b` = 2)');
		});
	});
	// describe('bindings', function() { // can't do bindings without real DB
	// 	it('should handle strings', function() {
	// 		const query = new Select();
	// 		query.table('mytable');
	// 		query.bind({ myval: 'a' });
	// 		query.where('mycol = :myval');
	// 		expect(query.normalized()).to.equal("SELECT * FROM mytable WHERE mycol = 'a'");
	// 	});
	// });
	describe('foundRows()', () => {
		it('should handle a simple query', () => {
			const query = Select.parse('SELECT * FROM a');
			const actual = query.getFoundRowsSql().replace(/\s+/g, ' ');
			expect(actual).to.equal('SELECT COUNT(*) AS foundRows FROM a');
		});
	});
});
