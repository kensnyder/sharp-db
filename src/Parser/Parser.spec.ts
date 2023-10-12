import Select from '../Select/Select';

describe('Parser', () => {
	describe('column handler', () => {
		it('should recognize asterisk', () => {
			const query = Select.parse('SELECT * FROM mytable');
			expect(query._columns).toEqual(['*']);
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
			expect(query.normalized()).toBe('SELECT a, b FROM mytable');
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
			expect(query.normalized()).toBe('SELECT a, b FROM mytable');
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
			expect(query.normalized()).toBe('SELECT a, b FROM mytable');
		});
	});
	describe('subquery handler', () => {
		it('should handle column subqueries', () => {
			const normalized =
				'SELECT a, (SELECT * FROM tbl2) AS b FROM mytable WHERE mycol = 1';
			const query = Select.parse(normalized);
			expect(query.normalized()).toBe(normalized);
		});
		it('should handle column subqueries with SELECT EXISTS', () => {
			const normalized =
				'SELECT a, (SELECT EXISTS (SELECT * FROM tbl2)) AS b FROM mytable WHERE mycol = 1';
			const query = Select.parse(normalized);
			expect(query.normalized()).toBe(normalized);
		});
		it('should handle IF() column expressions', () => {
			const normalized =
				'SELECT a, IF(b > 0) AS is_gt_0, IF(b > 100) AS is_gt_100 FROM mytable WHERE mycol = 1';
			const query = Select.parse(normalized);
			expect(query.normalized()).toBe(normalized);
		});
		it('should handle IN() expressions in WHERE', () => {
			const normalized =
				'SELECT * FROM mytable WHERE mycol IN (SELECT id FROM othertable)';
			const query = Select.parse(normalized);
			expect(query.normalized()).toBe(normalized);
		});
		it('should handle IN() expressions in JOINs', () => {
			const normalized =
				'SELECT * FROM a INNER JOIN b ON b.id = a.b_id AND b.status IN (SELECT id FROM statuses) WHERE a.id > 10';
			const query = Select.parse(normalized);
			expect(query.normalized()).toBe(normalized);
		});
	});
	describe('table handler', () => {
		it('should parse single table', () => {
			const query = Select.parse('SELECT * FROM a');
			expect(query._tables).toEqual(['a']);
		});
		it('should parse comma-separated tables', () => {
			const query = Select.parse('SELECT * FROM a, b');
			expect(query._tables).toEqual(['a', 'b']);
		});
	});
	describe('column handler', () => {
		it('should parse single column', () => {
			const query = Select.parse('SELECT a FROM b');
			expect(query._columns).toEqual(['a']);
		});
		it('should parse comma-separated columns', () => {
			const query = Select.parse('SELECT a, b FROM c');
			expect(query._columns).toEqual(['a', 'b']);
		});
		it('should handle expressions with one comma', () => {
			const query = Select.parse("SELECT a, CONCAT('b',b) FROM c");
			expect(query._columns).toEqual(['a', "CONCAT('b',b)"]);
		});
		it('should handle expressions with 2 commas', () => {
			const query = Select.parse(
				"SELECT a, CONCAT(fname, ' ', lname) FROM users"
			);
			expect(query._columns).toEqual(['a', "CONCAT(fname, ' ', lname)"]);
		});
	});
	describe('option handler', () => {
		it('should save SQL_CALC_FOUND_ROWS as an option', () => {
			const query = Select.parse('SELECT SQL_CALC_FOUND_ROWS * FROM a');
			expect(query._columns).toEqual(['*']);
			expect(query._options).toEqual(['SQL_CALC_FOUND_ROWS']);
		});
	});
	describe('JOIN handler', () => {
		const joins = [
			'JOIN',
			'INNER JOIN',
			'LEFT JOIN',
			'LEFT OUTER JOIN',
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
				expect(query.normalized()).toBe(sql);
			});
		});
	});
	describe('conditions handler', () => {
		it('should parse WHERE 1 = 1', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE 1 = 1');
			expect(query._wheres).toEqual(['1']);
		});
		it("should parse WHERE '1'", () => {
			const query = Select.parse("SELECT * FROM mytable WHERE '1'");
			expect(query._wheres).toEqual(["'1'"]);
		});
		it('should parse WHERE true', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE true');
			expect(query._wheres).toEqual(['true']);
		});
		it('should parse single WHERE', () => {
			const query = Select.parse('SELECT * FROM mytable WHERE mycol = 1');
			expect(query._wheres).toEqual(['mycol = 1']);
		});
		it('should parse two WHERE clauses joined by AND', () => {
			const query = Select.parse(
				'SELECT * FROM mytable WHERE mycol = 1 AND scheduled < NOW()'
			);
			expect(query._wheres).toEqual(['mycol = 1', 'scheduled < NOW()']);
		});
		it('should parse two WHERE clauses joined by OR', () => {
			const query = Select.parse(
				'SELECT * FROM mytable WHERE mycol = 1 OR scheduled < NOW()'
			);
			expect(query._wheres).toEqual(['(mycol = 1 OR scheduled < NOW())']);
		});
		it('should parse OR then AND', () => {
			const query = Select.parse(
				'SELECT * FROM mytable WHERE a = 1 OR b = 2 AND c = 3'
			);
			expect(query._wheres).toEqual(['(a = 1 OR b = 2)', 'c = 3']);
		});
		it('should parse OR then AND with parens', () => {
			const query = Select.parse(
				'SELECT * FROM mytable WHERE (a = 1 OR b = 2) AND c = 3'
			);
			expect(query._wheres).toEqual(['(a = 1 OR b = 2)', 'c = 3']);
		});
		it('should parse AND then OR', () => {
			const query = Select.parse(
				'SELECT * FROM mytable WHERE a = 1 AND b = 2 OR c = 3'
			);
			expect(query._wheres).toEqual(['a = 1', '(b = 2 OR c = 3)']);
		});
	});
	it('should parse GROUP BY and HAVING', () => {
		const query = Select.parse(
			'SELECT name, COUNT(*) FROM mytable GROUP BY name HAVING COUNT(*) > 1'
		);
		expect(query._groupBys).toEqual(['name']);
		expect(query._havings).toEqual(['COUNT(*) > 1']);
	});
	it('should parse ORDER BY', () => {
		const query = Select.parse('SELECT * FROM users ORDER BY id DESC');
		expect(query._orderBys).toEqual(['id DESC']);
	});
	describe('pagination', () => {
		it('should parse LIMIT with number', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT 1');
			expect(query._limit).toBe(1);
		});
		it('should parse LIMIT with placeholder', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT ?');
			expect(query._limit).toBe('?');
		});
		it('should parse LIMIT with named placeholder', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT :limit');
			expect(query._limit).toBe(':limit');
		});
		it('should parse OFFSET with number', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT 5 OFFSET 10');
			expect(query._offset).toBe(10);
		});
		it('should parse OFFSET with placeholder', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT 5 OFFSET ?');
			expect(query._offset).toBe('?');
		});
		it('should parse OFFSET with named placeholder', () => {
			const query = Select.parse(
				'SELECT * FROM mytable LIMIT 5 OFFSET :offset'
			);
			expect(query._offset).toBe(':offset');
		});
		it('should parse OFFSET, LIMIT with numbers', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT 10, 5');
			expect(query._limit).toBe(5);
			expect(query._offset).toBe(10);
		});
		it('should parse OFFSET, LIMIT with placeholders', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT ?, ?');
			expect(query._limit).toBe('?');
			expect(query._offset).toBe('?');
		});
		it('should parse OFFSET, LIMIT with named placeholders', () => {
			const query = Select.parse('SELECT * FROM mytable LIMIT :offset, :limit');
			expect(query._limit).toBe(':limit');
			expect(query._offset).toBe(':offset');
		});
	});
});
