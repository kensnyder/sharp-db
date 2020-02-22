jest.mock('mysql2');
const mysqlMock = require('mysql2');
const Select = require('../Select/Select.js');
const prettify = require('pretty-var-export');

describe('Select', function() {
	describe('class', function() {
		it('should be instantiable', function() {
			const query = new Select();
			expect(query).toBeInstanceOf(Select);
		});
	});
	describe('where() with arguments', function() {
		it('should handle expressions', function() {
			const query = new Select();
			query.where('mycol = LOWER(mycol2)');
			expect(query._wheres[0]).toBe('mycol = LOWER(mycol2)');
		});
		it('should handle equals', function() {
			const query = new Select();
			query.where('mycol', 'myval');
			expect(query._wheres[0]).toBe("`mycol` = 'myval'");
		});
		it('should handle automatic IN', function() {
			const query = new Select();
			query.where('mycol', [1, 2]);
			expect(query._wheres[0]).toBe('`mycol` IN(1,2)');
		});
		it('should handle explicit IN', function() {
			const query = new Select();
			query.where('mycol', 'IN', [1, 2]);
			expect(query._wheres[0]).toBe('`mycol` IN(1,2)');
		});
		it('should handle explicit IN (not an array)', function() {
			const query = new Select();
			query.where('mycol', 'IN', 123);
			expect(query._wheres[0]).toBe('`mycol` IN(123)');
		});
		it('should handle automatic NOT IN', function() {
			const query = new Select();
			query.where('mycol', '!=', [1, 2]);
			expect(query._wheres[0]).toBe('`mycol` NOT IN(1,2)');
		});
		it('should handle explicit NOT IN', function() {
			const query = new Select();
			query.where('mycol', 'NOT IN', [1, 2]);
			expect(query._wheres[0]).toBe('`mycol` NOT IN(1,2)');
		});
		it('should handle BETWEEN', function() {
			const query = new Select();
			query.where('mycol', 'BETWEEN', [1, 2]);
			expect(query._wheres[0]).toBe('`mycol` BETWEEN 1 AND 2');
		});
		it('should handle operators', function() {
			const query = new Select();
			query.where('mycol', '>', 3);
			expect(query._wheres[0]).toBe('`mycol` > 3');
		});
		it('should handle NULL', function() {
			const query = new Select();
			query.where('mycol', null);
			expect(query._wheres[0]).toBe('`mycol` IS NULL');
		});
		it('should handle NOT NULL', function() {
			const query = new Select();
			query.where('mycol', '!', null);
			expect(query._wheres[0]).toBe('`mycol` IS NOT NULL');
		});
		it('should handle LIKE', function() {
			const query = new Select();
			query.where('mycol', 'LIKE', 'foo');
			expect(query._wheres[0]).toBe("`mycol` LIKE 'foo'");
		});
		it('should handle LIKE %?', function() {
			const query = new Select();
			query.where('mycol', 'LIKE %?', 'foo');
			expect(query._wheres[0]).toBe("`mycol` LIKE '%foo'");
		});
		it('should handle LIKE ?%', function() {
			const query = new Select();
			query.where('mycol', 'LIKE ?%', 'foo');
			expect(query._wheres[0]).toBe("`mycol` LIKE 'foo%'");
		});
		it('should handle LIKE %?%', function() {
			const query = new Select();
			query.where('mycol', 'LIKE %?%', 'foo');
			expect(query._wheres[0]).toBe("`mycol` LIKE '%foo%'");
		});
		it('should handle multiple question marks (2 args)', function() {
			const query = new Select();
			query.table('users');
			query.where('SUBSTR(prefs, ?, ?) = role', [1, 4]);
			expect(query.normalized()).toBe(
				"SELECT * FROM users WHERE SUBSTR(prefs, '1', '4') = role"
			);
		});
	});
	describe('where() with Arrays', function() {
		it('should handle numeric arrays', function() {
			const query = new Select();
			query.where(['mycol = LOWER(mycol2)']);
			expect(query._wheres[0]).toBe('mycol = LOWER(mycol2)');
		});
	});
	describe('where() with Objects', function() {
		it('should handle automatic equals', function() {
			const query = new Select();
			query.where({ mycol: 'myval' });
			expect(query._wheres[0]).toBe("`mycol` = 'myval'");
		});
		it('should handle automatic IN', function() {
			const query = new Select();
			query.where({ mycol: [1, 2] });
			expect(query._wheres[0]).toBe('`mycol` IN(1,2)');
		});
		it('should handle operators', function() {
			const query = new Select();
			query.where({ 'mycol >': 3 });
			expect(query._wheres[0]).toBe('mycol > 3');
		});
	});
	describe('having()', function() {
		it('should handle strings', function() {
			const query = new Select();
			query.having('SUM(size) < 1024');
			expect(query._havings[0]).toBe('SUM(size) < 1024');
		});
		it('should handle 2 args with implicit equals', function() {
			const query = new Select();
			query.having('COUNT(*)', 0);
			expect(query._havings[0]).toBe('COUNT(*) = 0');
		});
		it('should handle 2 args with operator', function() {
			const query = new Select();
			query.having('SUM(size) <', 1024);
			expect(query._havings[0]).toBe('SUM(size) < 1024');
		});
		it('should handle 3 args', function() {
			const query = new Select();
			query.having('COUNT(*)', '>', 1);
			expect(query._havings[0]).toBe('COUNT(*) > 1');
		});
		it('should handle an object', function() {
			const query = new Select();
			query.having({ 'COUNT(*)': 1 });
			expect(query._havings[0]).toBe('COUNT(*) = 1');
		});
	});
	describe('orHaving()', function() {
		it('should handle strings', function() {
			const query = new Select();
			query.orHaving([['SUM(size) > 1024'], ['SUM(size) < 4096']]);
			expect(query._havings[0]).toBe('(SUM(size) > 1024 OR SUM(size) < 4096)');
		});
		it('should handle 2 args with implicit equals', function() {
			const query = new Select();
			query.orHaving([
				['COUNT(*)', 0],
				['SUM(size)', 0],
			]);
			expect(query._havings[0]).toBe('(COUNT(*) = 0 OR SUM(size) = 0)');
		});
	});
	describe('orWhere()', function() {
		it('should handle expressions', function() {
			const query = new Select();
			query.orWhere([
				['a', '>', 1],
				['b', 2],
			]);
			expect(query._wheres[0]).toBe('(`a` > 1 OR `b` = 2)');
		});
	});
	describe('sortField()', function() {
		it('should handle simple columns', function() {
			const query = new Select();
			query.sortField('post.created_at');
			expect(query._orderBys[0]).toBe('post.created_at ASC');
		});
		it('should handle minus signs', function() {
			const query = new Select();
			query.sortField('-created_at');
			expect(query._orderBys[0]).toBe('created_at DESC');
		});
		it('should handle mapping', function() {
			const query = new Select();
			query.sortField('-created_at', {
				created_at: 'post.created_timestamp',
			});
			expect(query._orderBys[0]).toBe('post.created_timestamp DESC');
		});
	});
	describe('whereBetween()', function() {
		it('should handle arrays', function() {
			const query = new Select();
			query.whereBetween('attempts', [1, 3]);
			expect(query._wheres[0]).toBe('`attempts` BETWEEN 1 AND 3');
		});
		it('should handle arrays (left end open)', function() {
			const query = new Select();
			query.whereBetween('attempts', [null, 3]);
			expect(query._wheres[0]).toBe('`attempts` <= 3');
		});
		it('should handle arrays (right end open)', function() {
			const query = new Select();
			query.whereBetween('attempts', [8]);
			expect(query._wheres[0]).toBe('`attempts` >= 8');
		});
	});
	describe('foundRows()', () => {
		it('should handle a simple query', () => {
			const query = Select.parse('SELECT * FROM a');
			const actual = query.getFoundRowsSql().replace(/\s+/g, ' ');
			expect(actual).toBe('SELECT COUNT(*) AS foundRows FROM a');
		});
		it('should handle queries with HAVING', () => {
			const query = Select.parse(
				'SELECT category, COUNT(*) FROM posts GROUP BY category HAVING COUNT(*) > 1'
			);
			const actual = query.getFoundRowsSql().replace(/\s+/g, ' ');
			expect(actual).toBe(
				'SELECT COUNT(*) AS foundRows FROM ( SELECT category, COUNT(*) FROM posts GROUP BY category HAVING COUNT(*) > 1 ) AS subq'
			);
			expect(query.getFoundRowsSql(null, true)).toBe(
				'SELECT COUNT(*) AS foundRows FROM (SELECT category, COUNT(*) FROM posts GROUP BY category HAVING COUNT(*) > 1) AS subq'
			);
		});
	});
	describe('LIMIT and OFFSET', () => {
		it('should add both', () => {
			const query = Select.parse('SELECT * FROM a');
			query.limit(2);
			query.offset(4);
			expect(query.normalized()).toBe('SELECT * FROM a LIMIT 2 OFFSET 4');
			expect(query.toString().replace(/\s+/g, ' ')).toBe(
				'SELECT * FROM a LIMIT 2 OFFSET 4'
			);
		});
	});
	describe('reset()', () => {
		it('should reset all', () => {
			const query = Select.parse('SELECT * FROM a');
			query.reset();
			const emptyQuery = new Select();
			expect(query).toEqual(emptyQuery);
		});
		it('should reset single fields', () => {
			const query = Select.parse('SELECT * FROM a');
			query.reset('column');
			const emptyQuery = new Select();
			emptyQuery.from('a');
			expect(query).toEqual(emptyQuery);
		});
		it('should reset multiple fields', () => {
			const query = Select.parse('SELECT * FROM a');
			query.reset(['column', 'table']);
			const emptyQuery = new Select();
			expect(query).toEqual(emptyQuery);
		});
	});
	describe('page()', () => {
		it('should allow 1', () => {
			const query = new Select();
			query.page(1);
			expect(query._page).toBe(1);
		});
		it('should allow 2', () => {
			const query = Select.parse('SELECT * FROM a');
			query.page(3);
			query.limit(10);
			expect(query.normalized()).toBe('SELECT * FROM a LIMIT 10 OFFSET 20');
			expect(query.toString().replace(/\s+/g, ' ')).toBe(
				'SELECT * FROM a LIMIT 10 OFFSET 20'
			);
		});
		it('should ignore 0', () => {
			const query = Select.parse('SELECT * FROM a');
			query.page(0);
			expect(query.normalized()).toBe('SELECT * FROM a');
		});
		it('should ignore negative numbers', () => {
			const query = Select.parse('SELECT * FROM a');
			query.page(-4);
			expect(query.normalized()).toBe('SELECT * FROM a');
		});
		it('should ignore non-numbers', () => {
			const query = Select.parse('SELECT * FROM a');
			query.page('foo');
			expect(query.normalized()).toBe('SELECT * FROM a');
		});
	});
	describe('join()', () => {
		it('should allow generic join', () => {
			const query = new Select();
			query.table('users u');
			query.join('avatars a ON a.user_id = u.id');
			expect(query.normalized()).toBe(
				'SELECT * FROM users u INNER JOIN avatars a ON a.user_id = u.id'
			);
		});
		it('should allow unjoining', () => {
			const query = new Select();
			query.table('users u');
			query.join('avatars a ON a.user_id = u.id');
			query.unjoin('avatars');
			expect(query.normalized()).toBe('SELECT * FROM users u');
		});
		it('should allow unjoining array', () => {
			const query = new Select();
			query.table('users u');
			query.join('avatars a ON a.user_id = u.id');
			query.join('permissions p ON p.user_id = u.id');
			query.unjoin(['avatars', 'permissions']);
			expect(query.normalized()).toBe('SELECT * FROM users u');
		});
	});
	describe('options()', () => {
		it('should add SQL_CALC_FOUND_ROWS', () => {
			const query = new Select();
			query.table('users');
			query.columns(['a', 'b']);
			query.limit(10);
			query.option('SQL_CALC_FOUND_ROWS');
			expect(query.normalized()).toBe(
				'SELECT SQL_CALC_FOUND_ROWS a, b FROM users LIMIT 10'
			);
		});
	});
	describe('columns()', () => {
		it('should allow 1', () => {
			const query = new Select();
			query.table('users');
			query.columns(['a', 'b']);
			expect(query.normalized()).toBe('SELECT a, b FROM users');
		});
	});
	describe('escape()', () => {
		it('should handle strings', () => {
			const query = new Select();
			expect(query.escape('me')).toBe("'me'");
		});
		it('should handle numbers', () => {
			const query = new Select();
			expect(query.escape(1)).toBe('1');
		});
	});
	describe('escapeQuoteless()', () => {
		it('should handle strings', () => {
			const query = new Select();
			expect(query.escapeQuoteless('me')).toBe('me');
		});
		it('should handle numbers', () => {
			const query = new Select();
			expect(query.escapeQuoteless(1)).toBe('1');
		});
	});
	describe('toBoundSql()', () => {
		it('should allow name-value pairs', () => {
			const query = Select.parse('SELECT * FROM a WHERE id = :id');
			query.bind('id', 2);
			expect(query.toBoundSql()).toBe('SELECT * FROM a WHERE id = 2');
		});
		it('should allow objects', () => {
			const query = Select.parse('SELECT * FROM a WHERE id = :id');
			query.bind({ id: 4 });
			expect(query.toBoundSql()).toBe('SELECT * FROM a WHERE id = 4');
		});
		it('should allow unbinding strings', () => {
			const query = Select.parse('SELECT * FROM a WHERE id = :id');
			query.bind({ id: 4 });
			query.unbind('id');
			expect(query.toBoundSql()).toBe('SELECT * FROM a WHERE id = :id');
		});
		it('should allow unbinding array', () => {
			const query = Select.parse('SELECT * FROM a WHERE id = :id');
			query.bind({ id: 4 });
			query.unbind(['id']);
			expect(query.toBoundSql()).toBe('SELECT * FROM a WHERE id = :id');
		});
		it('should allow unbinding all', () => {
			const query = Select.parse('SELECT * FROM a WHERE id = :id');
			query.bind({ id: 4 });
			query.unbind();
			expect(query.toBoundSql()).toBe('SELECT * FROM a WHERE id = :id');
		});
	});
	describe('_extractBindingName()', () => {
		it('should find binding', () => {
			const sql = 'SELECT * FROM a WHERE id IN(:id)';
			expect(Select._extractBindingName(sql)).toBe('id');
		});
		it('should throw Error when none are found', () => {
			const find = () => {
				const sql = 'SELECT * FROM a';
				Select._extractBindingName(sql);
			};
			expect(find).toThrow();
		});
	});
	describe('fetch()', () => {
		it('should support simple queries', async () => {
			const response = {
				error: null,
				results: [
					{ id: 1, name: 'John' },
					{ id: 2, name: 'Jane' },
				],
				fields: [{ name: 'id' }, { name: 'name' }],
			};
			mysqlMock.pushResponse(response);
			const query = new Select();
			query.table('users');
			query.columns(['id', 'name']);
			const { queries, results, fields } = await query.fetch();
			expect(queries[0].replace(/\s+/g, ' ')).toBe(
				'SELECT id, name FROM users'
			);
			expect(results).toEqual(response.results);
			expect(fields).toEqual(response.fields);
		});
		it('should fetch withSiblingData()', async () => {
			mysqlMock.pushResponse({
				results: [
					{ id: 11, published_by: 1, published_at: '2020-02-11' },
					{ id: 12, published_by: 2, published_at: '2020-02-12' },
				],
				fields: [{ name: 'id' }],
			});
			mysqlMock.pushResponse({
				results: [
					{ id: 1, name: 'John' },
					{ id: 2, name: 'Jane' },
				],
				fields: [{ name: 'id' }],
			});
			const expectedResult = [
				{
					id: 11,
					published_by: 1,
					published_at: '2020-02-11',
					publisher: { id: 1, name: 'John' },
				},
				{
					id: 12,
					published_by: 2,
					published_at: '2020-02-12',
					publisher: { id: 2, name: 'Jane' },
				},
			];
			const query = new Select();
			query.columns(['id', 'user_id', 'published_at']);
			query.table('posts');
			query.withSiblingData(
				'publisher',
				Select.parse(
					'SELECT id, name FROM users WHERE user_id IN(:published_by)'
				)
			);
			const { queries, results } = await query.fetch();
			expect(results).toEqual(expectedResult);
			expect(queries).toHaveLength(2);
		});
		it('should fetch withChildData()', async () => {
			mysqlMock.pushResponse({
				results: [
					{ id: 11, headline: 'Elvis is alive' },
					{ id: 12, headline: 'He proclaimed foobar' },
				],
			});
			mysqlMock.pushResponse({
				results: [
					{ id: 1, post_id: 11, path: '/plan.doc' },
					{ id: 2, post_id: 12, path: '/report.pdf' },
					{ id: 3, post_id: 12, path: '/presentation.ppt' },
				],
				fields: [{ name: 'post_id' }],
			});
			const expectedResult = [
				{
					id: 11,
					headline: 'Elvis is alive',
					files: [{ id: 1, post_id: 11, path: '/plan.doc' }],
				},
				{
					id: 12,
					headline: 'He proclaimed foobar',
					files: [
						{ id: 2, post_id: 12, path: '/report.pdf' },
						{ id: 3, post_id: 12, path: '/presentation.ppt' },
					],
				},
			];
			const query = new Select();
			query.columns(['id', 'headline']);
			query.table('posts');
			query.withChildData(
				'files',
				Select.parse(
					'SELECT post_id, id, path FROM files WHERE post_id IN(:id)'
				)
			);
			const { queries, results } = await query.fetch();
			expect(results).toEqual(expectedResult);
			expect(queries).toHaveLength(2);
		});
	});
	describe('foundRows()', () => {
		it('should fetch count()', async () => {
			mysqlMock.pushResponse({
				results: [{ foundRows: 3 }],
				fields: [{ name: 'foundRows' }],
			});
			const query = new Select();
			const { results } = await query.foundRows();
			expect(results).toEqual(3);
		});
	});
});
