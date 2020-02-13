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
			const results = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const fields = [{ name: 'name' }, { name: 'email' }];
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
			expect(db.lastQuery).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199'
			);
		});
		it('should bind on colons', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const db = Db.factory();
			await db.select(sql, { min: 101, max: 199 });
			expect(db.lastQuery).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199'
			);
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
			expect(db.lastQuery).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199'
			);
		});
		it('should handle array options binding and param binding', async () => {
			const sql =
				'SELECT * FROM users WHERE id BETWEEN ? AND ? AND department_id = ?';
			const db = Db.factory();
			await db.select({ sql, values: [101, 199] }, 1);
			expect(db.lastQuery).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department_id = 1'
			);
		});
		it('should handle objects bound in options', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const db = Db.factory();
			await db.select({ sql, values: { min: 101, max: 199 } });
			expect(db.lastQuery).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199'
			);
		});
		it('should handle object options binding and param binding', async () => {
			const sql =
				'SELECT * FROM users WHERE id BETWEEN :min AND :max AND department = ?';
			const db = Db.factory();
			await db.select({ sql, values: { min: 101, max: 199 } }, 1);
			expect(db.lastQuery).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department = 1'
			);
		});
	});
	describe('selectHash()', () => {
		it('should return result object', async () => {
			const sql = 'SELECT email, name FROM users';
			const results = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const fields = [{ name: 'email' }, { name: 'name' }];
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
			const results = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const fields = [{ name: 'name' }];
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
			const results = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const fields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectValue(sql);
			expect(res).toEqual('John Doe');
		});
		it('should return undefined on empty results', async () => {
			const sql = 'SELECT name FROM users';
			const results = [];
			const fields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectValue(sql);
			expect(res).toBe(undefined);
		});
	});
	describe('selectExists()', () => {
		it('should construct a SELECT EXISTS query', async () => {
			const sql = 'SELECT name FROM users';
			const results = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const fields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results, fields });
			const db = Db.factory();
			const res = await db.selectExists(sql);
			expect(res).toBe(true);
		});
	});
	describe('insert()', () => {
		it('should return the id of the inserted record', async () => {
			const sql = 'INSERT INTO users VALUES(?)';
			const results = { insertId: 1 };
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const res = await db.insert(sql, 'John Doe');
			expect(res).toBe(results.insertId);
		});
	});
	describe('update()', () => {
		it('should return the number of changed rows', async () => {
			const sql = 'UPDATE users SET department_id = 2 WHERE department_id = 1';
			const results = { changedRows: 3 };
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const res = await db.update(sql);
			expect(res).toBe(results.changedRows);
		});
	});
	describe('delete()', () => {
		it('should return the number of deleted rows', async () => {
			const sql = 'DELETE FROM users WHERE department_id = 1';
			const results = { changedRows: 3 };
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const res = await db.delete(sql);
			expect(res).toBe(results.changedRows);
		});
	});
	describe('selectFrom()', () => {
		it('should handle empty fields and criteria', async () => {
			const db = Db.factory();
			await db.selectFrom('users');
			expect(db.lastQuery).toBe('SELECT * FROM `users` WHERE 1');
		});
		it('should handle named fields', async () => {
			const db = Db.factory();
			await db.selectFrom('users', ['id', 'name']);
			expect(db.lastQuery).toBe('SELECT `id`, `name` FROM `users` WHERE 1');
		});
		it('should handle expression fields', async () => {
			const db = Db.factory();
			await db.selectFrom('users', ['id', "CONCAT(fname, ' ', lname)"]);
			expect(db.lastQuery).toBe(
				"SELECT `id`, CONCAT(fname, ' ', lname) FROM `users` WHERE 1"
			);
		});
		it('should handle numeric criteria', async () => {
			const db = Db.factory();
			await db.selectFrom('users', [], { id: 1 });
			expect(db.lastQuery).toBe('SELECT * FROM `users` WHERE `id` = 1');
		});
		it('should handle boolean criteria', async () => {
			const db = Db.factory();
			await db.selectFrom('users', [], { is_active: false });
			expect(db.lastQuery).toBe(
				'SELECT * FROM `users` WHERE `is_active` = false'
			);
		});
		it('should handle null criteria', async () => {
			const db = Db.factory();
			await db.selectFrom('users', [], { deleted_at: null });
			expect(db.lastQuery).toBe(
				'SELECT * FROM `users` WHERE `deleted_at` IS NULL'
			);
		});
		it('should handle string criteria', async () => {
			const db = Db.factory();
			await db.selectFrom('users', [], { email: 'john@example.com' });
			expect(db.lastQuery).toBe(
				"SELECT * FROM `users` WHERE `email` = 'john@example.com'"
			);
		});
		it('should handle array criteria', async () => {
			const db = Db.factory();
			await db.selectFrom('users', [], { id: [1, 2] });
			expect(db.lastQuery).toBe('SELECT * FROM `users` WHERE `id` IN(1,2)');
		});
		it('should handle "extra"', async () => {
			const db = Db.factory();
			await db.selectFrom('users', [], {}, 'LIMIT 5');
			expect(db.lastQuery).toBe('SELECT * FROM `users` WHERE 1 LIMIT 5');
		});
	});
	describe('selectId()', () => {
		it('should return the correct result object', async () => {
			const results = [{ id: 2, name: 'Jane Doe' }];
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const user = await db.selectId('users', results[0].id);
			expect(user).toBe(results[0]);
			expect(db.lastQuery).toBe('SELECT * FROM `users` WHERE `id` = 2');
		});
	});
	describe('selectUuid()', () => {
		it('should return the correct result object', async () => {
			const results = [
				{ uuid: '4baf1860-cf2b-4037-8ad3-6e043cc144d9', name: 'Jane Doe' },
			];
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const user = await db.selectUuid('users', results[0].uuid);
			expect(user).toBe(results[0]);
			expect(db.lastQuery).toBe(
				"SELECT * FROM `users` WHERE `uuid` = '4baf1860-cf2b-4037-8ad3-6e043cc144d9'"
			);
		});
	});
	describe('selectByKey()', () => {
		it('should return the correct result object', async () => {
			const results = [{ sso_ref: 'A123456', name: 'Jane Doe' }];
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const user = await db.selectByKey('users', 'sso_ref', results[0].sso_ref);
			expect(user).toBe(results[0]);
			expect(db.lastQuery).toBe(
				"SELECT * FROM `users` WHERE `sso_ref` = 'A123456'"
			);
		});
	});
	describe('selectOrCreate()', () => {
		it('should return the correct result object', async () => {
			const results = [{ sso_ref: 'A123456', name: 'Jane Doe' }];
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const user = await db.selectOrCreate(
				'users',
				{ sso_ref: results[0].sso_ref },
				results[0]
			);
			expect(user).toBe(results[0]);
		});
		it('should insert a new record', async () => {
			mysqlMock.pushResponse({ results: [] });
			mysqlMock.pushResponse({ results: { insertId: 5 } });
			const db = Db.factory();
			const newId = await db.selectOrCreate(
				'users',
				{ sso_ref: 'A123456' },
				{ sso_ref: 'A123456', name: 'Jane Doe' }
			);
			expect(newId).toBe(5);
		});
	});
	describe('insertInto()', () => {
		it('should return the id of the inserted record', async () => {
			const results = { insertId: 5 };
			mysqlMock.pushResponse({ results });
			const db = Db.factory();
			const newId = await db.insertInto('users', {
				sso_ref: 'A123456',
				name: 'Jane Doe',
			});
			expect(newId).toBe(results.insertId);
			expect(db.lastQuery).toBe(
				"INSERT INTO `users` SET `sso_ref`='A123456', `name`='Jane Doe'"
			);
		});
	});
	describe('insertIntoOnDuplicateKeyUpdate()', () => {
		it('should return last insert and affected', async () => {
			const results = { insertId: 5, affectedRows: 1 };
			mysqlMock.pushResponse({ results });
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
			expect(insertId).toBe(results.insertId);
			expect(affectedRows).toBe(results.affectedRows);
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
