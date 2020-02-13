jest.mock('mysql2');
const mysqlMock = require('mysql2');
const { Db } = require('../../index.js');

describe('Db', () => {
	describe('class', () => {
		it('should be instantiable', () => {
			const db = Db.factory();
			expect(db).toBeInstanceOf(Db);
		});
		it('should work as singleton', () => {
			const db1 = Db.factory();
			const db2 = Db.factory();
			expect(db1).toBe(db2);
		});
	});

	describe('binding', () => {
		it('should bind numbers', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE a = ? AND b = ?', [1, 2]);
			expect(bound.sql).toBe('WHERE a = 1 AND b = 2');
		});
		it('should bind true', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE is_success = :isSuccess', [
				{
					isSuccess: true,
				},
			]);
			expect(bound.sql).toBe('WHERE is_success = true');
		});
		it('should bind false', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE is_active = ?', [false]);
			expect(bound.sql).toBe('WHERE is_active = false');
		});
		it('should bind arrays', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE id IN(?)', [[1, 2, 3]]);
			expect(bound.sql).toBe('WHERE id IN(1, 2, 3)');
		});
		it('should bind nulls', () => {
			const db = Db.factory();
			const bound = db.bindArgs('SET a = ?', [null]);
			expect(bound.sql).toBe('SET a = NULL');
		});
	});
	describe('select()', () => {
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo')
			});
			const db = Db.factory();
			try {
				await db.select('SELECT * FROM users');
			}
			catch (e) {
				expect(e.message).toBe('foo');
			}
		});
		it('should return result arrays', async () => {
			const sql = 'SELECT * FROM users';
			const results = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const fields = [
				{ name: 'name' },
				{ name: 'email'},
			];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.select(sql);
			expect(res).toEqual(results);
			expect(db.lastFields).toEqual(fields);
			expect(db.lastQuery).toBe(sql);
		});
		it('should bind on question marks', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
			const db = Db.factory();
			await db.select(sql, 101, 199);
			expect(db.lastQuery).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should bind on colons', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const db = Db.factory();
			await db.select(sql, { min: 101, max: 199 });
			expect(db.lastQuery).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle options', async () => {
			const sql = 'SELECT * FROM users';
			const db = Db.factory();
			await db.select({ sql, timeout: 30000 });
			expect(db.lastQuery).toBe('SELECT * FROM users');
		});
		it('should handle array values bound in options', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
			const db = Db.factory();
			await db.select({ sql, values: [101, 199] });
			expect(db.lastQuery).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle array options binding and param binding', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ? AND department_id = ?';
			const db = Db.factory();
			await db.select({ sql, values: [101, 199] }, 1);
			expect(db.lastQuery).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department_id = 1');
		});
		it('should handle objects bound in options', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const db = Db.factory();
			await db.select({ sql, values: { min: 101, max: 199 } });
			expect(db.lastQuery).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle object options binding and param binding', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max AND department = ?';
			const db = Db.factory();
			await db.select({ sql, values: { min: 101, max: 199 } }, 1);
			expect(db.lastQuery).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department = 1');
		});
	});
	describe('selectHash()', () => {
		it('should return result object', async () => {
			const sql = 'SELECT email, name FROM users';
			const results = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const fields = [
				{ name: 'email'},
				{ name: 'name' },
			];
			const hash = {
				'john@example.com': 'John Doe',
				'jane@example.com': 'Jane Doe',
			};
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectHash(sql);
			expect(res).toEqual(hash);
		});
	});
	describe('selectList()', () => {
		it('should return item list', async () => {
			const sql = 'SELECT name FROM users';
			const results = [
				{ name: 'John Doe' },
				{ name: 'Jane Doe' },
			];
			const fields = [
				{ name: 'name' },
			];
			const list = ['John Doe', 'Jane Doe'];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectList(sql);
			expect(res).toEqual(list);
		});
	});
	describe('selectGrouped()', () => {
		it('should return result object with lists', async () => {
			const sql = 'SELECT email, name FROM users';
			const results = [
				{ name: 'John Doe', department_id: 1 },
				{ name: 'Jane Doe', department_id: 2 },
				{ name: 'Josh Doe', department_id: 1 },
			];
			const hash = {
				'1': [results[0], results[2]],
				'2': [results[1]],
			};
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const res = await db.selectGrouped('department_id', sql);
			expect(res).toEqual(hash);
		});
	});
	describe('selectIndexed()', () => {
		it('should return result object', async () => {
			const sql = 'SELECT email, name FROM users';
			const results = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const hash = {
				'john@example.com': results[0],
				'jane@example.com': results[1],
			};
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const res = await db.selectIndexed('email', sql);
			expect(res).toEqual(hash);
		});
	});
	describe('selectFirst()', () => {
		it('should return first result object', async () => {
			const sql = 'SELECT email, name FROM users';
			const results = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const res = await db.selectFirst(sql);
			expect(res).toEqual(results[0]);
		});
	});
	describe('selectValue()', () => {
		it('should return the first field from the first row', async () => {
			const sql = 'SELECT name FROM users';
			const results = [
				{ name: 'John Doe' },
				{ name: 'Jane Doe' },
			];
			const fields = [
				{ name: 'name' },
			];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectValue(sql);
			expect(res).toEqual('John Doe');
		});
		it('should return undefined on empty results', async () => {
			const sql = 'SELECT name FROM users';
			const results = [];
			const fields = [
				{ name: 'name' },
			];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectValue(sql);
			expect(res).toBe(undefined);
		});
	});
	describe('selectExists()', () => {
		it('should construct a SELECT EXISTS query', async () => {
			const sql = 'SELECT name FROM users';
			const results = [
				{ name: 'John Doe' },
				{ name: 'Jane Doe' },
			];
			const fields = [
				{ name: 'name' },
			];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectExists(sql);
			expect(res).toBe(true);
		});
	});
	//
	// describe('multi-queries', () => {
	// 	it('should run with SELECT', function()  {
	// 		const db = Db.factory();
	// 		$sql = 'SELECT COUNT(*) AS acount FROM affiliations; SELECT COUNT(*) AS ccount FROM clients;';
	// 		$res = $db->multiQuery($sql);
	// 		expect($db->error()).toBe('');
	// 		expect($res)->to->have->size(2);
	// 		expect($res[0][0]->acount)->to->be->gt(0);
	// 		expect($res[1][0]->ccount)->to->be->gt(0);
	// 	});
	// 	it('should run with INSERT, SELECT, DELETE', function()  {
	// 		const db = Db.factory();
	// 		$rand = uniqid('unit-test-domain-');
	// 		$sql = '
	// 		INSERT INTO domain_names VALUES (NULL, :rand);
	// 		SELECT * FROM domain_names WHERE name = :rand;
	// 		DELETE FROM domain_names WHERE name = :rand;
	// 		SELECT COUNT(*) AS cnt FROM domain_names WHERE name = :rand;
	// 		';
	// 		$res = $db->multiQuery($sql, compact('rand'));
	// 		expect($res)->to->have->size(4);
	// 		expect($res[1][0]->name).toBe($rand);
	// 		expect($res[3][0]->cnt)->to->be->oneOf([0, "0"]);
	// 	});
	// });
});
