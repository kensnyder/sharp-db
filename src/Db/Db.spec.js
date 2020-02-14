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
				error: new Error('foo'),
			});
			const db = Db.factory();
			try {
				await db.select('SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
		it('should return result arrays', async () => {
			const sql = 'SELECT * FROM users';
			const mockResults = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const mockFields = [{ name: 'name' }, { name: 'email' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const db = Db.factory();
			const { query, results, fields } = await db.select(sql);
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
			expect(fields).toEqual(mockFields);
		});
		it('should bind on question marks', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
			const db = Db.factory();
			const { query } = await db.select(sql, 101, 199);
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should bind on colons', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const db = Db.factory();
			const { query } = await db.select(sql, { min: 101, max: 199 });
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle options', async () => {
			const sql = 'SELECT * FROM users';
			const db = Db.factory();
			const { query } = await db.select({ sql, timeout: 30000 });
			expect(query).toBe('SELECT * FROM users');
		});
		it('should handle array values bound in options', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
			const db = Db.factory();
			const { query } = await db.select({ sql, values: [101, 199] });
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle array options binding and param binding', async () => {
			const sql =
				'SELECT * FROM users WHERE id BETWEEN ? AND ? AND department_id = ?';
			const db = Db.factory();
			const { query } = await db.select({ sql, values: [101, 199] }, 1);
			expect(query).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department_id = 1'
			);
		});
		it('should handle objects bound in options', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const db = Db.factory();
			const { query } = await db.select({
				sql,
				values: { min: 101, max: 199 },
			});
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle object options binding and param binding', async () => {
			const sql =
				'SELECT * FROM users WHERE id BETWEEN :min AND :max AND department = ?';
			const db = Db.factory();
			const { query } = await db.select(
				{ sql, values: { min: 101, max: 199 } },
				1
			);
			expect(query).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department = 1'
			);
		});
	});
	describe('selectHash()', () => {
		it('should return result object', async () => {
			const sql = 'SELECT email, name FROM users';
			const mockResults = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const mockFields = [{ name: 'email' }, { name: 'name' }];
			const hash = {
				'john@example.com': 'John Doe',
				'jane@example.com': 'Jane Doe',
			};
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const db = Db.factory();
			const { results } = await db.selectHash(sql);
			expect(results).toEqual(hash);
		});
	});
	describe('selectList()', () => {
		it('should return item list', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const db = Db.factory();
			const { results } = await db.selectList(sql);
			expect(results).toEqual([mockResults[0].name, mockResults[1].name]);
		});
	});
	describe('selectGrouped()', () => {
		it('should return result object with lists', async () => {
			const sql = 'SELECT email, name FROM users';
			const mockResults = [
				{ name: 'John Doe', department_id: 1 },
				{ name: 'Jane Doe', department_id: 2 },
				{ name: 'Josh Doe', department_id: 1 },
			];
			const hash = {
				'1': [mockResults[0], mockResults[2]],
				'2': [mockResults[1]],
			};
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { results } = await db.selectGrouped('department_id', sql);
			expect(results).toEqual(hash);
		});
	});
	describe('selectIndexed()', () => {
		it('should return result object', async () => {
			const sql = 'SELECT email, name FROM users';
			const mockResults = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const hash = {
				'john@example.com': mockResults[0],
				'jane@example.com': mockResults[1],
			};
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { results } = await db.selectIndexed('email', sql);
			expect(results).toEqual(hash);
		});
	});
	describe('selectFirst()', () => {
		it('should return first result object', async () => {
			const sql = 'SELECT email, name FROM users';
			const mockResults = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { results } = await db.selectFirst(sql);
			expect(results).toEqual(mockResults[0]);
		});
	});
	describe('selectValue()', () => {
		it('should return the first field from the first row', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const db = Db.factory();
			const { results } = await db.selectValue(sql);
			expect(results).toEqual(mockResults[0].name);
		});
		it('should return undefined on empty results', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const db = Db.factory();
			const { results } = await db.selectValue(sql);
			expect(results).toBe(undefined);
		});
	});
	describe('selectExists()', () => {
		it('should construct a SELECT EXISTS query', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const db = Db.factory();
			const { results } = await db.selectExists(sql);
			expect(results).toBe(true);
		});
	});
	describe('insert()', () => {
		it('should return the id of the inserted record', async () => {
			const sql = 'INSERT INTO users VALUES(?)';
			const mockResults = { insertId: 1 };
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { insertId } = await db.insert(sql, 'John Doe');
			expect(insertId).toBe(1);
		});
	});
	describe('update()', () => {
		it('should return the number of changed rows', async () => {
			const sql = 'UPDATE users SET department_id = 2 WHERE department_id = 1';
			const mockResults = { changedRows: 3 };
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { changedRows } = await db.update(sql);
			expect(changedRows).toBe(3);
		});
	});
	describe('delete()', () => {
		it('should return the number of deleted rows', async () => {
			const sql = 'DELETE FROM users WHERE department_id = 1';
			const mockResults = { changedRows: 3 };
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { changedRows } = await db.delete(sql);
			expect(changedRows).toBe(3);
		});
	});
	describe('selectFrom()', () => {
		it('should handle empty fields and criteria', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users');
			expect(query).toBe('SELECT * FROM `users` WHERE 1');
		});
		it('should handle named fields', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', ['id', 'name']);
			expect(query).toBe('SELECT `id`, `name` FROM `users` WHERE 1');
		});
		it('should handle expression fields', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', [
				'id',
				"CONCAT(fname, ' ', lname)",
			]);
			expect(query).toBe(
				"SELECT `id`, CONCAT(fname, ' ', lname) FROM `users` WHERE 1"
			);
		});
		it('should handle numeric criteria', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', [], { id: 1 });
			expect(query).toBe('SELECT * FROM `users` WHERE `id` = 1');
		});
		it('should handle boolean criteria', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', [], { is_active: false });
			expect(query).toBe('SELECT * FROM `users` WHERE `is_active` = false');
		});
		it('should handle null criteria', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', [], { deleted_at: null });
			expect(query).toBe('SELECT * FROM `users` WHERE `deleted_at` IS NULL');
		});
		it('should handle string criteria', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', [], {
				email: 'john@example.com',
			});
			expect(query).toBe(
				"SELECT * FROM `users` WHERE `email` = 'john@example.com'"
			);
		});
		it('should handle array criteria', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', [], { id: [1, 2] });
			expect(query).toBe('SELECT * FROM `users` WHERE `id` IN(1,2)');
		});
		it('should handle "extra"', async () => {
			const db = Db.factory();
			const { query } = await db.selectFrom('users', [], {}, 'LIMIT 5');
			expect(query).toBe('SELECT * FROM `users` WHERE 1 LIMIT 5');
		});
	});
	describe('selectId()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [{ id: 2, name: 'Jane Doe' }];
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { query, results } = await db.selectId('users', mockResults[0].id);
			expect(results).toEqual(mockResults[0]);
			expect(query).toBe('SELECT * FROM `users` WHERE `id` = 2');
		});
	});
	describe('selectUuid()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [
				{ uuid: '4baf1860-cf2b-4037-8ad3-6e043cc144d9', name: 'Jane Doe' },
			];
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { results, query } = await db.selectUuid(
				'users',
				mockResults[0].uuid
			);
			expect(results).toBe(mockResults[0]);
			expect(query).toBe(
				"SELECT * FROM `users` WHERE `uuid` = '4baf1860-cf2b-4037-8ad3-6e043cc144d9'"
			);
		});
	});
	describe('selectByKey()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [{ sso_ref: 'A123456', name: 'Jane Doe' }];
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { query, results } = await db.selectByKey(
				'users',
				'sso_ref',
				mockResults[0].sso_ref
			);
			expect(results).toEqual(mockResults[0]);
			expect(query).toBe("SELECT * FROM `users` WHERE `sso_ref` = 'A123456'");
		});
	});
	describe('selectOrCreate()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [{ sso_ref: 'A123456', name: 'Jane Doe' }];
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { results } = await db.selectOrCreate(
				'users',
				{ sso_ref: mockResults[0].sso_ref },
				mockResults[0]
			);
			expect(results).toEqual(mockResults[0]);
		});
		it('should insert a new record', async () => {
			mysqlMock.pushResponse({ results: [] });
			mysqlMock.pushResponse({ results: { insertId: 5 } });
			const db = Db.factory();
			const { insertId } = await db.selectOrCreate(
				'users',
				{ sso_ref: 'A123456' },
				{ sso_ref: 'A123456', name: 'Jane Doe' }
			);
			expect(insertId).toBe(5);
		});
	});
	describe('insertInto()', () => {
		it('should return the id of the inserted record', async () => {
			const mockResults = { insertId: 5 };
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const { query, insertId } = await db.insertInto('users', {
				sso_ref: 'A123456',
				name: 'Jane Doe',
			});
			expect(insertId).toBe(5);
			expect(query).toBe(
				"INSERT INTO `users` SET `sso_ref`='A123456', `name`='Jane Doe'"
			);
		});
	});
	describe('insertIntoOnDuplicateKeyUpdate()', () => {
		it('should return last insert and affected', async () => {
			const mockResults = { insertId: 5, affectedRows: 1 };
			mysqlMock.pushResponse({ results: mockResults });
			const db = Db.factory();
			const {
				query,
				insertId,
				affectedRows,
			} = await db.insertIntoOnDuplicateKeyUpdate(
				'users',
				{
					sso_ref: 'A123456',
					name: 'Jane Doe',
					created_at: '2020-02-02',
				},
				{
					name: 'Jane Doe',
					modified_at: '2020-02-02',
				}
			);
			expect(insertId).toBe(5);
			expect(affectedRows).toBe(1);
			expect(query).toBe(
				"INSERT INTO `users` SET `sso_ref`='A123456', `name`='Jane Doe', `created_at`='2020-02-02' ON DUPLICATE KEY UPDATE `name`='Jane Doe', `modified_at`='2020-02-02'"
			);
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
