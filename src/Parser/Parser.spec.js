const { Select } = require('../../dist/index.js');
const expect = require('chai').expect;

describe('Parser', () => {
	describe('column handler', () => {
		it('should recognize asterisk', () => {
			const query = Select.parse('SELECT * FROM mytable');
			expect(query._columns).to.deep.equal(['*']);
		});
	});
	describe('comment handler', () => {
		it('should strip single-line comments -- dashes', () => {
			const query = Select.parse(`
				SELECT
				-- stuff
				a,
					-- more stuff
				b -- and even more stuff
				FROM mytable
			`);
			expect(query.normalized()).to.equal('SELECT a, b FROM mytable');
		});
		it('should strip single-line comments #hash', () => {
			const query = Select.parse(`
				SELECT
				#stuff
				a,
					# more stuff
				b #and even more stuff
				FROM mytable
			`);
			expect(query.normalized()).to.equal('SELECT a, b FROM mytable');
		});
		it('should strip multi-line comments', () => {
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
	describe('subquery handler', () => {
		it('should handle column subqueries', () => {
			const normalized = 'SELECT a, (SELECT * FROM tbl2) AS b FROM mytable WHERE mycol = 1';
			const query = Select.parse(normalized);
			expect(query.normalized()).to.equal(normalized);
		});
		it('should handle column subqueries with SELECT EXISTS', () => {
			const normalized =
				'SELECT a, (SELECT EXISTS (SELECT * FROM tbl2)) AS b FROM mytable WHERE mycol = 1';
			const query = Select.parse(normalized);
			expect(query.normalized()).to.equal(normalized);
		});
		it('should handle IF() column expressions', () => {
			const normalized =
				'SELECT a, IF(b > 0) AS is_gt_0, IF(b > 100) AS is_gt_100 FROM mytable WHERE mycol = 1';
			const query = Select.parse(normalized);
			expect(query.normalized()).to.equal(normalized);
		});
		it('should handle IN() expressions in WHERE', () => {
			const normalized = 'SELECT * FROM mytable WHERE mycol IN (SELECT id FROM othertable)';
			const query = Select.parse(normalized);
			expect(query.normalized()).to.equal(normalized);
		});
		it('should handle IN() expressions in JOINs', () => {
			const normalized =
				'SELECT * FROM a INNER JOIN b ON b.id = a.b_id AND b.status IN (SELECT id FROM statuses) WHERE a.id > 10';
			const query = Select.parse(normalized);
			expect(query.normalized()).to.equal(normalized);
		});
	});
	describe('table handler', () => {
		it('should parse single table', () => {
			const query = Select.parse('SELECT * FROM a');
			expect(query._tables).to.deep.equal(['a']);
		});
		it('should parse comma-separated tables', () => {
			const query = Select.parse('SELECT * FROM a, b');
			expect(query._tables).to.deep.equal(['a', 'b']);
		});
	});
	describe('column handler', () => {
		it('should parse single column', () => {
			const query = Select.parse('SELECT a FROM b');
			expect(query._columns).to.deep.equal(['a']);
		});
		it('should parse comma-separated columns', () => {
			const query = Select.parse('SELECT a, b FROM c');
			expect(query._columns).to.deep.equal(['a', 'b']);
		});
	});
	describe('option handler', () => {
		it('should save SQL_CALC_FOUND_ROWS as an option', () => {
			const query = Select.parse('SELECT SQL_CALC_FOUND_ROWS * FROM a');
			expect(query._columns).to.deep.equal(['*']);
			expect(query._options).to.deep.equal(['SQL_CALC_FOUND_ROWS']);
		});
	});
	describe('JOIN handler', () => {
		const joins = [
			'JOIN',
			'INNER JOIN',
			'LEFT JOIN',
			'OUTER JOIN',
			'RIGHT JOIN',
			'RIGHT OUTER JOIN',
			'CROSS JOIN',
			'FULL JOIN',
			'FULL OUTER JOIN',
		];
		joins.forEach(join => {
			it(`should handle ${join}`, () => {
				const sql = `SELECT * FROM a ${join} b ON b.id = a.b_id`;
				const query = Select.parse(sql);
				expect(query.normalized()).to.equal(sql);
			});
		});
	});
	describe('conditions handler', () => {
		it('should parse WHERE 1', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE 1');
			expect(query._wheres).to.deep.equal(['1']);
		});
		it("should parse WHERE '1'", () => {
			const query = Select.parse("SELECT * FROM mytable WHERE '1'");
			expect(query._wheres).to.deep.equal(["'1'"]);
		});
		it('should parse WHERE true', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE true');
			expect(query._wheres).to.deep.equal(['true']);
		});
		it('should parse single WHERE', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE mycol = 1');
			expect(query._wheres).to.deep.equal(['mycol = 1']);
		});
		it('should parse two WHERE clauses joined by AND', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE mycol = 1 AND scheduled < NOW()');
			expect(query._wheres).to.deep.equal(['mycol = 1', 'scheduled < NOW()']);
		});
		it('should parse two WHERE clauses joined by OR', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE mycol = 1 OR scheduled < NOW()');
			expect(query._wheres).to.deep.equal(['(mycol = 1 OR scheduled < NOW())']);
		});
		it('should parse OR then AND', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE a = 1 OR b = 2 AND c = 3');
			expect(query._wheres).to.deep.equal(['(a = 1 OR b = 2)', 'c = 3']);
		});
		it('should parse OR then AND with parens', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE (a = 1 OR b = 2) AND c = 3');
			expect(query._wheres).to.deep.equal(['(a = 1 OR b = 2)', 'c = 3']);
		});
		it('should parse AND then OR', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE a = 1 AND b = 2 OR c = 3');
			expect(query._wheres).to.deep.equal(['a = 1', '(b = 2 OR c = 3)']);
		});
	});
	it('should parse WHERE 1', () => {
		const query = Select.parse('SELECT * FROM mytable WHERE 1');
		expect(query._wheres).to.deep.equal(['1']);
	});
});
