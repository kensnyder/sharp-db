const { Select } = require('../../dist/index.js');
const expect = require('chai').expect;

describe('Parser', function() {
	describe('column handler', function() {
		it('should recognize asterisk', function() {
			const query = Select.parse('SELECT * FROM mytable');
			expect(query._columns).to.deep.equal(['*']);
		});
	});
	describe('table handler', function() {
		const query = Select.parse('SELECT * FROM a, b');
		expect(query._tables).to.deep.equal(['a', 'b']);
	});
	describe('comment handler', function() {
		it('should strip single-line comments', function() {
			const query = Select.parse(`
				SELECT
				-- stuff
				a,
					-- more stuff
				b
				FROM mytable
			`);
			expect(query.normalized()).to.equal('SELECT a, b FROM mytable');
		});
		it('should strip multi-line comments', function() {
			const query = Select.parse(`
				SELECT
				/*
					stuff
				*/
				a,
					/* more stuff */ b
				FROM mytable
			`);
			expect(query.normalized()).to.equal('SELECT a, b FROM mytable');
		});
	});
	describe('conditions handler', function() {
		it('should parse single WHERE', function() {
			const query = Select.parse('SELECT * FROM mytable WHERE mycol = 1');
			expect(query._wheres).to.deep.equal(['mycol = 1']);
		});
		it('should parse two WHERE clauses joined by AND', function() {
			const query = Select.parse('SELECT * FROM mytable WHERE mycol = 1 AND scheduled < NOW()');
			expect(query._wheres).to.deep.equal(['mycol = 1', 'scheduled < NOW()']);
		});
		it('should parse two WHERE clauses joined by OR', function() {
			const query = Select.parse('SELECT * FROM mytable WHERE mycol = 1 OR scheduled < NOW()');
			expect(query._wheres).to.deep.equal(['(mycol = 1 OR scheduled < NOW())']);
		});
		it('should parse OR then AND', function() {
			const query = Select.parse('SELECT * FROM mytable WHERE a = 1 OR b = 2 AND c = 3');
			expect(query._wheres).to.deep.equal(['(a = 1 OR b = 2)', 'c = 3']);
		});
		it('should parse OR then AND with parens', function() {
			const query = Select.parse('SELECT * FROM mytable WHERE (a = 1 OR b = 2) AND c = 3');
			expect(query._wheres).to.deep.equal(['(a = 1 OR b = 2)', 'c = 3']);
		});
		it('should parse AND then OR', function() {
			const query = Select.parse('SELECT * FROM mytable WHERE a = 1 AND b = 2 OR c = 3');
			expect(query._wheres).to.deep.equal(['a = 1', '(b = 2 OR c = 3)']);
		});
	});
	describe('subquery handler', function() {
		// it('should handle column subqueries', function()  {
		// 	$normalized = 'SELECT a, (SELECT * FROM tbl2) AS b FROM mytable WHERE mycol = 1';
		// 	const query = Select.parse($normalized);
		// 	expect(query.normalized()).to.equal($normalized);
		// });
		// it('should handle column subqueries with SELECT EXISTS', function()  {
		// 	$normalized = 'SELECT a, (SELECT EXISTS (SELECT * FROM tbl2)) AS b FROM mytable WHERE mycol = 1';
		// 	const query = Select.parse($normalized);
		// 	expect(query.normalized()).to.equal($normalized);
		// });
		// it('should handle IF() column expressions', function()  {
		// 	$normalized = 'SELECT a, IF(b > 0) AS is_gt_0, IF(b > 100) AS is_gt_100 FROM mytable WHERE mycol = 1';
		// 	const query = Select.parse($normalized);
		// 	expect(query.normalized()).to.equal($normalized);
		// });
	});
	//
	// describe('where() with arguments', function() {
	// 	it('should handle expressions', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol = LOWER(mycol2)');
	// 		expect(query._wheres[0]).to.equal('mycol = LOWER(mycol2)');
	// 	});
	// 	it('should handle equals', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'myval');
	// 		expect(query._wheres[0]).to.equal("`mycol` = 'myval'");
	// 	});
	// 	it('should handle automatic IN', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', [1,2]);
	// 		expect(query._wheres[0]).to.equal("`mycol` IN('1','2')");
	// 	});
	// 	it('should handle explicit IN', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'IN', [1,2]);
	// 		expect(query._wheres[0]).to.equal("`mycol` IN('1','2')");
	// 	});
	// 	it('should handle automatic NOT IN', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', '!=', [1,2]);
	// 		expect(query._wheres[0]).to.equal("`mycol` NOT IN('1','2')");
	// 	});
	// 	it('should handle explicit NOT IN', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'NOT IN', [1,2]);
	// 		expect(query._wheres[0]).to.equal("`mycol` NOT IN('1','2')");
	// 	});
	// 	it('should handle BETWEEN', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'BETWEEN', [1,2]);
	// 		expect(query._wheres[0]).to.equal("`mycol` BETWEEN '1' AND '2'");
	// 	});
	// 	it('should handle operators', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', '>', 3);
	// 		expect(query._wheres[0]).to.equal("`mycol` > '3'");
	// 	});
	// 	it('should handle NULL', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', null);
	// 		expect(query._wheres[0]).to.equal("`mycol` IS NULL");
	// 	});
	// 	it('should handle NOT NULL', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', '!', null);
	// 		expect(query._wheres[0]).to.equal("`mycol` IS NOT NULL");
	// 	});
	// 	it('should handle LIKE', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'LIKE', 'foo');
	// 		expect(query._wheres[0]).to.equal("`mycol` LIKE 'foo'");
	// 	});
	// 	it('should handle LIKE %?', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'LIKE %?', 'foo');
	// 		expect(query._wheres[0]).to.equal("`mycol` LIKE '%foo'");
	// 	});
	// 	it('should handle LIKE ?%', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'LIKE ?%', 'foo');
	// 		expect(query._wheres[0]).to.equal("`mycol` LIKE 'foo%'");
	// 	});
	// 	it('should handle LIKE %?%', function()  {
	// 		$query = new QuickSelect();
	// 		query.where('mycol', 'LIKE %?%', 'foo');
	// 		expect(query._wheres[0]).to.equal("`mycol` LIKE '%foo%'");
	// 	});
	// });
	//
	// describe('where() with arrays', function() {
	// 	it('should handle numeric arrays', function()  {
	// 		$query = new QuickSelect();
	// 		query.where([
	// 			'mycol = LOWER(mycol2)',
	// 		]);
	// 		expect(query._wheres[0]).to.equal('mycol = LOWER(mycol2)');
	// 	});
	// 	it('should handle mixed arrays', function()  {
	// 		$query = new QuickSelect();
	// 		query.where([
	// 			'mycol = LOWER(mycol2)',
	// 			'col2' => 2
	// 	]);
	// 		expect(query._wheres[0]).to.equal('mycol = LOWER(mycol2)');
	// 		expect(query._wheres[1]).to.equal("`col2` = '2'");
	// 	});
	// 	it('should handle equals', function()  {
	// 		$query = new QuickSelect();
	// 		query.where(['mycol' => 'myval']);
	// 		expect(query._wheres[0]).to.equal("`mycol` = 'myval'");
	// 	});
	// 	it('should handle automatic IN', function()  {
	// 		$query = new QuickSelect();
	// 		query.where(['mycol' => [1,2]]);
	// 		expect(query._wheres[0]).to.equal("`mycol` IN('1','2')");
	// 	});
	// 	it('should handle operators', function()  {
	// 		$query = new QuickSelect();
	// 		query.where(['mycol >' => 3]);
	// 		expect(query._wheres[0]).to.equal("mycol > '3'");
	// 	});
	// });
	//
	// describe('orWhere()', function() {
	// 	it('should handle expressions', function()  {
	// 		$query = new QuickSelect();
	// 		query.orWhere([
	// 			['a', '>', 2],
	// 			['b', 1],
	// 		]);
	// 		expect(query._wheres[0]).to.equal("(`a` > '2' OR `b` = '1')");
	// 	});
	// });
});
