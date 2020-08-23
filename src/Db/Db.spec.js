jest.mock('mysql2');
const mysqlMock = require('mysql2');
jest.mock('ssh2');
const ssh2Mock = require('ssh2');
const Db = require('./Db.js');
const Ssh = require('../Ssh/Ssh.js');

describe('Db', () => {
	let db;
	beforeEach(() => {
		Db.instances.length = 0;
		db = Db.factory();
	});
	describe('class', () => {
		it('should be instantiable', () => {
			expect(db).toBeInstanceOf(Db);
		});
		it('should allow factory()', () => {
			const db = Db.factory();
			expect(db).toBeInstanceOf(Db);
		});
		it('should work as singleton', () => {
			const db1 = Db.factory();
			const db2 = Db.factory();
			expect(db1).toBe(db2);
		});
		it('should work with "new"', () => {
			const db = new Db();
			expect(db).toBeInstanceOf(Db);
		});
		it('should connect via SSH', () => {
			const db = new Db(
				{
					password: '',
				},
				{
					user: 'ubuntu',
					password: 'moo',
				}
			);
			expect(db.ssh).toBeInstanceOf(Ssh);
		});
	});
	describe('binding', () => {
		it('should bind numbers', () => {
			const bound = db.bindArgs('WHERE a = ? AND b = ?', [1, 2]);
			expect(bound.sql).toBe('WHERE a = 1 AND b = 2');
		});
		it('should bind true', () => {
			const bound = db.bindArgs('WHERE is_success = :isSuccess', [
				{
					isSuccess: true,
				},
			]);
			expect(bound.sql).toBe('WHERE is_success = true');
		});
		it('should bind false', () => {
			const bound = db.bindArgs('WHERE is_active = ?', [false]);
			expect(bound.sql).toBe('WHERE is_active = false');
		});
		it('should bind arrays', () => {
			const bound = db.bindArgs('WHERE id IN(?)', [[1, 2, 3]]);
			expect(bound.sql).toBe('WHERE id IN(1, 2, 3)');
		});
		it('should bind nulls', () => {
			const bound = db.bindArgs('SET a = ?', [null]);
			expect(bound.sql).toBe('SET a = NULL');
		});
		it('should do nothing on empty arrays', () => {
			const bound = db.bindArgs('SET a = 1', []);
			expect(bound.sql).toBe('SET a = 1');
		});
		it('should do nothing on undefined', () => {
			const bound = db.bindArgs('SET a = 1', undefined);
			expect(bound.sql).toBe('SET a = 1');
		});
		it('should throw errors if SQL is empty string', () => {
			const bindEmpty = () => {
				db.bindArgs('', []);
			};
			expect(bindEmpty).toThrow();
		});
		it('should throw errors if SQL is empty object', () => {
			const bindEmpty = () => {
				db.bindArgs({}, []);
			};
			expect(bindEmpty).toThrow();
		});
	});
	describe('connect()', () => {
		it('should handle errors', async () => {
			mysqlMock.pushConnect({
				fatal: 'Error!',
			});
			try {
				await db.connect();
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}
		});
	});
	describe('select()', () => {
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
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
			const { query, results, fields } = await db.select(sql);
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
			expect(fields).toEqual(mockFields);
		});
		it('should bind on question marks', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
			const { query } = await db.select(sql, 101, 199);
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should bind on colons', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const { query } = await db.select(sql, { min: 101, max: 199 });
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle options', async () => {
			const sql = 'SELECT * FROM users';
			const { query } = await db.select({ sql, timeout: 30000 });
			expect(query).toBe('SELECT * FROM users');
		});
		it('should handle array values bound in options', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
			const { query } = await db.select({ sql, values: [101, 199] });
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle array options binding and param binding', async () => {
			const sql =
				'SELECT * FROM users WHERE id BETWEEN ? AND ? AND department_id = ?';
			const { query } = await db.select({ sql, values: [101, 199] }, 1);
			expect(query).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department_id = 1'
			);
		});
		it('should handle objects bound in options', async () => {
			const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
			const { query } = await db.select({
				sql,
				values: { min: 101, max: 199 },
			});
			expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		});
		it('should handle object options binding and param binding', async () => {
			const sql =
				'SELECT * FROM users WHERE id BETWEEN :min AND :max AND department = ?';
			const { query } = await db.select(
				{ sql, values: { min: 101, max: 199 } },
				1
			);
			expect(query).toBe(
				'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department = 1'
			);
		});
		it('should tunnel via SSH', async () => {
			const stream = {};
			ssh2Mock.pushResponse({
				err: null,
				stream,
			});
			mysqlMock.pushResponse({ results: [] });
			const db = new Db(
				{
					password: '',
				},
				{
					user: 'ubuntu',
					password: 'moo',
				}
			);
			const { results } = await db.select('SELECT * FROM foo');
			expect(results).toEqual([]);
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
			const { results } = await db.selectHash(sql);
			expect(results).toEqual(hash);
		});
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.selectHash('SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('selectList()', () => {
		it('should return item list', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { results } = await db.selectList(sql);
			expect(results).toEqual([mockResults[0].name, mockResults[1].name]);
		});
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.selectList('SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
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
			const { results } = await db.selectGrouped('department_id', sql);
			expect(results).toEqual(hash);
		});
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.selectGrouped('department_id', 'SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
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
			const { results } = await db.selectIndexed('email', sql);
			expect(results).toEqual(hash);
		});
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.selectIndexed('id', 'SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
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
			const { results } = await db.selectFirst(sql);
			expect(results).toEqual(mockResults[0]);
		});
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.selectFirst('SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('selectValue()', () => {
		it('should return the first field from the first row', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { results } = await db.selectValue(sql);
			expect(results).toEqual(mockResults[0].name);
		});
		it('should return undefined on empty results', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { results } = await db.selectValue(sql);
			expect(results).toBe(undefined);
		});
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.selectValue('SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('selectExists()', () => {
		it('should construct a SELECT EXISTS query', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { results } = await db.selectExists(sql);
			expect(results).toBe(true);
		});
		it('should handle errors', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.selectExists('SELECT * FROM users');
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('insert()', () => {
		it('should return the id of the inserted record', async () => {
			const sql = 'INSERT INTO users VALUES(?)';
			const mockResults = { insertId: 1 };
			mysqlMock.pushResponse({ results: mockResults });
			const { insertId } = await db.insert(sql, 'John Doe');
			expect(insertId).toBe(1);
		});
		it('should reject on error', async () => {
			const sql = 'INSERT INTO foo VALUES (1);';
			mysqlMock.pushResponse({ error: new Error('bar') });
			try {
				await db.insert(sql);
			} catch (e) {
				expect(e.message).toBe('bar');
			}
		});
	});
	describe('update()', () => {
		it('should return the number of changed rows', async () => {
			const sql = 'UPDATE users SET department_id = 2 WHERE department_id = 1';
			const mockResults = { changedRows: 3 };
			mysqlMock.pushResponse({ results: mockResults });
			const { changedRows } = await db.update(sql);
			expect(changedRows).toBe(3);
		});
		it('should reject on error', async () => {
			const sql = 'UPDATE users SET is_active = true';
			mysqlMock.pushResponse({ error: new Error('foo') });
			try {
				await db.update(sql);
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('delete()', () => {
		it('should return the number of deleted rows', async () => {
			const sql = 'DELETE FROM users WHERE department_id = 1';
			const mockResults = { changedRows: 3 };
			mysqlMock.pushResponse({ results: mockResults });
			const { changedRows } = await db.delete(sql);
			expect(changedRows).toBe(3);
		});
	});
	describe('selectFrom()', () => {
		it('should handle empty fields and criteria', async () => {
			const { query } = await db.selectFrom('users');
			expect(query).toBe('SELECT * FROM `users` WHERE 1');
		});
		it('should handle named fields', async () => {
			const { query } = await db.selectFrom('users', ['id', 'name']);
			expect(query).toBe('SELECT `id`, `name` FROM `users` WHERE 1');
		});
		it('should handle expression fields', async () => {
			const { query } = await db.selectFrom('users', [
				'id',
				"CONCAT(fname, ' ', lname)",
			]);
			expect(query).toBe(
				"SELECT `id`, CONCAT(fname, ' ', lname) FROM `users` WHERE 1"
			);
		});
		it('should handle numeric criteria', async () => {
			const { query } = await db.selectFrom('users', [], { id: 1 });
			expect(query).toBe('SELECT * FROM `users` WHERE `id` = 1');
		});
		it('should handle boolean criteria', async () => {
			const { query } = await db.selectFrom('users', [], { is_active: false });
			expect(query).toBe('SELECT * FROM `users` WHERE `is_active` = false');
		});
		it('should handle null criteria', async () => {
			const { query } = await db.selectFrom('users', [], { deleted_at: null });
			expect(query).toBe('SELECT * FROM `users` WHERE `deleted_at` IS NULL');
		});
		it('should handle string criteria', async () => {
			const { query } = await db.selectFrom('users', [], {
				email: 'john@example.com',
			});
			expect(query).toBe(
				"SELECT * FROM `users` WHERE `email` = 'john@example.com'"
			);
		});
		it('should handle array criteria', async () => {
			const { query } = await db.selectFrom('users', [], { id: [1, 2] });
			expect(query).toBe('SELECT * FROM `users` WHERE `id` IN(1,2)');
		});
		it('should handle "extra"', async () => {
			const { query } = await db.selectFrom('users', [], {}, 'LIMIT 5');
			expect(query).toBe('SELECT * FROM `users` WHERE 1 LIMIT 5');
		});
		it('should error when fields are not an array', () => {
			const tryNumber = () => {
				db.selectFrom('users', 2, {});
			};
			expect(tryNumber).toThrow();
		});
		it('should error when criteria is not an object', () => {
			const tryNumber = () => {
				db.selectFrom('users', [], 7);
			};
			expect(tryNumber).toThrow();
		});
	});
	describe('selectId()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [{ id: 2, name: 'Jane Doe' }];
			mysqlMock.pushResponse({ results: mockResults });
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
			const { insertId } = await db.selectOrCreate(
				'users',
				{ sso_ref: 'A123456' },
				{ sso_ref: 'A123456', name: 'Jane Doe' }
			);
			expect(insertId).toBe(5);
		});
		it('should error mysql errors', async () => {
			mysqlMock.pushResponse({ error: new Error('foo') });
			try {
				return await db.selectOrCreate(
					'users',
					{ sso_ref: 'A123456' },
					{ sso_ref: 'A123456', name: 'Jane Doe' }
				);
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
				expect(e.message).toBeInstanceOf('Foo');
			}
		});
	});
	describe('insertInto()', () => {
		it('should return the id of the inserted record', async () => {
			const mockResults = { insertId: 5 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, insertId } = await db.insertInto('users', {
				sso_ref: 'A123456',
				name: 'Jane Doe',
			});
			expect(insertId).toBe(5);
			expect(query).toBe(
				"INSERT INTO `users` SET `sso_ref`='A123456', `name`='Jane Doe'"
			);
		});
		it('should error if data is empty', () => {
			const doInsert = () => {
				db.insertInto('users', {});
			};
			expect(doInsert).toThrow();
		});
	});
	describe('insertIntoOnDuplicateKeyUpdate()', () => {
		it('should return last insert and affected', async () => {
			const mockResults = { insertId: 5, affectedRows: 1 };
			mysqlMock.pushResponse({ results: mockResults });
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
		it('should error if inserts are empty', async () => {
			try {
				await db.insertIntoOnDuplicateKeyUpdate('test', {}, { a: 1 });
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}
		});
		it('should error if inserts are undefined', async () => {
			try {
				await db.insertIntoOnDuplicateKeyUpdate('test', undefined, { a: 1 });
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}
		});
		it('should error if sets are empty', async () => {
			try {
				await db.insertIntoOnDuplicateKeyUpdate('test', { a: 1 }, {});
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}
		});
		it('should error if sets are undefined', async () => {
			try {
				await db.insertIntoOnDuplicateKeyUpdate('test', { a: 1 });
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}
		});
		it('should error if sets are undefined', async () => {
			mysqlMock.pushResponse({
				error: new Error('foo'),
			});
			try {
				await db.insertIntoOnDuplicateKeyUpdate('test', { a: 1 }, { b: 2 });
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('insertExtended()', () => {
		it('should return last insert and affected', async () => {
			const mockResults = { insertId: 5, affectedRows: 2 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, insertId, affectedRows } = await db.insertExtended(
				'users',
				[
					{ name: 'John Doe', email: 'john@example.com' },
					{ name: 'Jane Doe', email: 'jane@example.com' },
				]
			);
			expect(insertId).toBe(5);
			expect(affectedRows).toBe(2);
			expect(query).toBe(
				"INSERT INTO `users` (`name`, `email`) VALUES ('John Doe', 'john@example.com'), ('Jane Doe', 'jane@example.com')"
			);
		});
		it('should error if inserts are empty', async () => {
			const useEmpty = () => {
				db.insertExtended('users', []);
			};
			expect(useEmpty).toThrow();
		});
		it('should error if inserts are undefined', async () => {
			const useUndefined = () => {
				db.insertExtended('users', undefined);
			};
			expect(useUndefined).toThrow();
		});
	});
	describe('updateTable()', () => {
		it('should return affected', async () => {
			const mockResults = { affectedRows: 1 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, affectedRows } = await db.updateTable(
				'users',
				{ email: 'john@example.com', foo: undefined },
				{ id: 5 }
			);
			expect(affectedRows).toBe(1);
			expect(query).toBe(
				"UPDATE `users` SET `email`='john@example.com' WHERE `id` = 5"
			);
		});
		it('should work without criteria', async () => {
			const mockResults = { affectedRows: 100 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, affectedRows } = await db.updateTable('users', {
				is_active: true,
			});
			expect(affectedRows).toBe(100);
			expect(query).toBe('UPDATE `users` SET `is_active`=true WHERE 1');
		});
		it('should error on empty object', async () => {
			const tryUpdate = () => {
				db.updateTable('users', {});
			};
			expect(tryUpdate).toThrow();
		});
		it('should error on undefined', async () => {
			const tryUpdate = () => {
				db.updateTable('users');
			};
			expect(tryUpdate).toThrow();
		});
	});
	describe('deleteFrom()', () => {
		it('should return affected', async () => {
			const mockResults = { affectedRows: 1 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, affectedRows } = await db.deleteFrom('users', {
				email: 'john@example.com',
			});
			expect(affectedRows).toBe(1);
			expect(query).toBe(
				"DELETE FROM `users` WHERE `email` = 'john@example.com'"
			);
		});
		it('should return affected (with limit)', async () => {
			const mockResults = { affectedRows: 1 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, affectedRows } = await db.deleteFrom(
				'users',
				{ email: 'john@example.com' },
				1
			);
			expect(affectedRows).toBe(1);
			expect(query).toBe(
				"DELETE FROM `users` WHERE `email` = 'john@example.com' LIMIT 1"
			);
		});
	});
	describe('buildWhere()', () => {
		it('should handle single strings', async () => {
			const sql = db.buildWhere('status = 5');
			expect(sql).toBe('status = 5');
		});
		it('should handle single values', async () => {
			const sql = db.buildWhere('status', 5);
			expect(sql).toBe('`status` = 5');
		});
		it('should handle single strings with expressions', async () => {
			const sql = db.buildWhere('SUM(size) < 1024');
			expect(sql).toBe('SUM(size) < 1024');
		});
		it('should handle between', async () => {
			const sql = db.buildWhere('status BETWEEN', [1, 3]);
			expect(sql).toBe('`status` BETWEEN 1 AND 3');
		});
		it('should handle expressions', async () => {
			const sql = db.buildWhere('COUNT(*) BETWEEN', [1, 3]);
			expect(sql).toBe('COUNT(*) BETWEEN 1 AND 3');
		});
		it('should handle >', async () => {
			const sql = db.buildWhere('id >', 5);
			expect(sql).toBe('`id` > 5');
		});
		it('should handle !=', async () => {
			const sql = db.buildWhere('id !=', 5);
			expect(sql).toBe('`id` != 5');
		});
		it('should handle null', async () => {
			const sql = db.buildWhere('deleted_at', null);
			expect(sql).toBe('`deleted_at` IS NULL');
		});
		it('should handle implicit IN()', async () => {
			const sql = db.buildWhere('status', [1, 3]);
			expect(sql).toBe('`status` IN(1,3)');
		});
		it('should handle explicit IN()', async () => {
			const sql = db.buildWhere('status IN', [1, 3]);
			expect(sql).toBe('`status` IN(1,3)');
		});
		it('should handle implicit NOT IN()', async () => {
			const sql = db.buildWhere('status !=', [1, 3]);
			expect(sql).toBe('`status` NOT IN(1,3)');
		});
		it('should handle explicit NOT IN()', async () => {
			const sql = db.buildWhere('status NOT IN', [1, 3]);
			expect(sql).toBe('`status` NOT IN(1,3)');
		});
		it('should handle IS NULL', async () => {
			const sql = db.buildWhere('status', null);
			expect(sql).toBe('`status` IS NULL');
		});
		it('should handle equals IS NULL', async () => {
			const sql = db.buildWhere('status =', null);
			expect(sql).toBe('`status` IS NULL');
		});
		it('should handle IS NOT NULL', async () => {
			const sql = db.buildWhere('status !=', null);
			expect(sql).toBe('`status` IS NOT NULL');
		});
		it('should check hasOwnProperty', async () => {
			const obj = Object.create({
				a: 1,
			});
			obj.b = 2;
			const sql = db.buildWheres(obj);
			expect(sql).toBe('`b` = 2');
		});
	});
	describe('tpl() escaping', () => {
		it('should template Numbers', async () => {
			const { select } = db.tpl();
			const id = 4;
			const { query } = await select`SELECT * FROM users WHERE id = ${id}`;
			expect(query).toBe('SELECT * FROM users WHERE id = 4');
		});
		it('should template Strings', async () => {
			const { select } = db.tpl();
			const email = 'john@example.com';
			const {
				query,
			} = await select`SELECT * FROM users WHERE email = ${email}`;
			expect(query).toBe(
				"SELECT * FROM users WHERE email = 'john@example.com'"
			);
		});
		it('should template Booleans', async () => {
			const { select } = db.tpl();
			const isActive = true;
			const {
				query,
			} = await select`SELECT * FROM users WHERE is_active = ${isActive}`;
			expect(query).toBe('SELECT * FROM users WHERE is_active = true');
		});
		it('should template Arrays', async () => {
			const { select } = db.tpl();
			const ids = [1, 3];
			const { query } = await select`SELECT * FROM users WHERE id IN(${ids})`;
			expect(query).toBe('SELECT * FROM users WHERE id IN(1, 3)');
		});
	});
	describe('tpl() functions', () => {
		it('should allow selectFirst', async () => {
			const { selectFirst } = db.tpl();
			const id = 4;
			const { query } = await selectFirst`SELECT * FROM users WHERE id = ${id}`;
			expect(query).toBe('SELECT * FROM users WHERE id = 4');
		});
		it('should allow selectList', async () => {
			const mockResults = [
				{ email: 'john@example.com' },
				{ email: 'jane@example.com' },
			];
			const mockFields = [{ name: 'email' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { selectList } = db.tpl();
			const id = 4;
			const {
				query,
			} = await selectList`SELECT email FROM users WHERE id > ${id}`;
			expect(query).toBe('SELECT email FROM users WHERE id > 4');
		});
		it('should allow selectHash', async () => {
			const mockResults = [
				{ id: 4, name: 'John Doe' },
				{ id: 5, name: 'Jane Doe' },
			];
			const mockFields = [{ name: 'id' }, { name: 'name' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { selectHash } = db.tpl();
			const id = 4;
			const {
				query,
			} = await selectHash`SELECT id, name FROM users WHERE id > ${id}`;
			expect(query).toBe('SELECT id, name FROM users WHERE id > 4');
		});
		it('should allow selectValue', async () => {
			const mockResults = [{ email: 'jane@example.com' }];
			const mockFields = [{ name: 'email' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { selectValue } = db.tpl();
			const id = 4;
			const {
				query,
			} = await selectValue`SELECT email FROM users WHERE id = ${id}`;
			expect(query).toBe('SELECT email FROM users WHERE id = 4');
		});
		it('should allow insert', async () => {
			const { insert } = db.tpl();
			const name = 'Jane Doe';
			const email = 'jane@example.com';
			const {
				query,
			} = await insert`INSERT INTO users VALUES (${name}, ${email})`;
			expect(query).toBe(
				"INSERT INTO users VALUES ('Jane Doe', 'jane@example.com')"
			);
		});
		it('should allow update', async () => {
			const { update } = db.tpl();
			const name = 'Jane Doe';
			const email = 'jane@example.com';
			const {
				query,
			} = await update`UPDATE users SET name = ${name} WHERE email = ${email}`;
			expect(query).toBe(
				"UPDATE users SET name = 'Jane Doe' WHERE email = 'jane@example.com'"
			);
		});
		it('should allow delete', async () => {
			const { delete: del } = db.tpl();
			const id = 4;
			const { query } = await del`DELETE FROM users WHERE id = ${id}`;
			expect(query).toBe('DELETE FROM users WHERE id = 4');
		});
	});
	describe('query()', () => {
		it('should return results', async () => {
			const sql = 'UPDATE users SET is_active = true';
			const mockResults = { affectedRows: 1 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, results } = await db.query(sql);
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
		});
		it('should return fields', async () => {
			const sql = 'UPDATE users SET is_active = true';
			const mockResults = [{ id: 1 }, { id: 2 }];
			const mockFields = [{ name: 'id' }];
			mysqlMock.pushResponse({ results: mockResults, fields: mockFields });
			const { results, fields } = await db.query(sql);
			expect(results).toEqual(mockResults);
			expect(fields).toEqual(mockFields);
		});
		it('should reject on error', async () => {
			const sql = 'UPDATE users SET is_active = true';
			mysqlMock.pushResponse({ error: new Error('foo') });
			try {
				await db.query(sql);
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('multiQuery()', () => {
		it('should return multiple results', async () => {
			const sql = 'UPDATE users SET is_active = true; SELECT * FROM users';
			const mockResults = [{ affectedRows: 1 }, { id: 1, name: 'John' }];
			mysqlMock.pushResponse({ results: mockResults });
			const { query, results } = await db.multiQuery(sql);
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
		});
		it('should reject on error', async () => {
			const sql = 'UPDATE users SET is_active = true; SELECT * FROM posts';
			mysqlMock.pushResponse({ error: new Error('foo') });
			try {
				await db.query(sql);
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
	});
	describe('end()', () => {
		it('should not error on query', async () => {
			const sql = 'UPDATE posts SET is_active = true';
			const mockResults = { affectedRows: 2 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, results } = await db.query(sql);
			await db.end();
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
		});
		it('should allow endAll', async () => {
			const sql = 'UPDATE users SET is_active = true';
			const mockResults = { affectedRows: 3 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, results } = await db.query(sql);
			await Db.endAll();
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
		});
		it('should not error even if not connected', async () => {
			let err = undefined;
			try {
				await db.end();
			} catch (e) {
				err = e;
			}
			expect(err).toBe(undefined);
		});
		it('should not error if Db.instances is already empty', async () => {
			let err = undefined;
			try {
				await db.connect();
				Db.instances.length = 0;
				await db.end();
			} catch (e) {
				err = e;
			}
			expect(err).toBe(undefined);
		});
		it('should end when db.ssh is defined', async () => {
			const spy = jest.fn();
			ssh2Mock.onNextEnd(spy);
			ssh2Mock.pushResponse({
				err: null,
				stream: {},
			});
			const db = new Db(
				{
					password: '',
				},
				{
					user: 'ubuntu',
					password: 'moo',
				}
			);
			await db.connect();
			await db.end();
			expect(spy).toHaveBeenCalled();
		});
		it('should end when db.ssh is defined', async () => {
			mysqlMock.pushEnd(new Error('foo'));
			ssh2Mock.pushResponse({
				err: null,
				stream: {},
			});
			const db = new Db(
				{
					password: '',
				},
				{
					user: 'ubuntu',
					password: 'moo',
				}
			);
			await db.connect();
			try {
				await db.end();
			} catch (e) {
				expect(e.message).toBe('foo');
			}
		});
		it('should end db.ssh when connection is undefined', async () => {
			ssh2Mock.pushResponse({
				err: null,
				stream: {},
			});
			const db = new Db(
				{
					password: '',
				},
				{
					user: 'ubuntu',
					password: 'moo',
				}
			);
			await db.connect();
			db.connection = undefined;
			db.ssh.connection.end = jest.fn();
			await db.end();
			expect(db.ssh.connection.end).toHaveBeenCalled();
		});
	});
	describe('destroy()', () => {
		it('should not error', async () => {
			const sql = "UPDATE posts SET status = 'new'";
			const mockResults = { affectedRows: 4 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, results } = await db.query(sql);
			db.destroy();
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
		});
		it('should allow destroyAll', async () => {
			const sql = "UPDATE posts SET status = 'new'";
			const mockResults = { affectedRows: 5 };
			mysqlMock.pushResponse({ results: mockResults });
			const { query, results } = await db.query(sql);
			Db.destroyAll();
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
		});
		it('should destroy when Ssh', async () => {
			const stream = {};
			ssh2Mock.pushResponse({
				err: null,
				stream,
			});
			const db = new Db(
				{
					password: '',
				},
				{
					user: 'ubuntu',
					password: 'moo',
				}
			);
			db.destroy();
		});
		it('should not error if Db.instances is already empty', async () => {
			let err = undefined;
			try {
				await db.connect();
				Db.instances.length = 0;
				db.destroy();
			} catch (e) {
				err = e;
			}
			expect(err).toBe(undefined);
		});
	});
	describe('escape()', () => {
		it('should handle numbers', () => {
			expect(db.escape(5)).toBe('5');
		});
		it('should handle strings', () => {
			expect(db.escape('abc')).toBe("'abc'");
		});
		it('should handle null', () => {
			expect(db.escape(null)).toMatch(/^NULL$/i);
		});
		it('should handle true', () => {
			expect(db.escape(true)).toBe('true');
		});
		it('should handle true', () => {
			expect(db.escape(false)).toBe('false');
		});
	});
	describe('escapeQuoteless()', () => {
		it('should handle numbers', () => {
			expect(db.escapeQuoteless(5)).toBe('5');
		});
		it('should handle strings', () => {
			expect(db.escapeQuoteless('abc')).toBe('abc');
		});
		it('should handle null', () => {
			expect(db.escapeQuoteless(null)).toMatch(/^NULL$/i);
		});
		it('should handle true', () => {
			expect(db.escapeQuoteless(true)).toBe('true');
		});
		it('should handle false', () => {
			expect(db.escapeQuoteless(false)).toBe('false');
		});
	});
	describe('quote()', () => {
		it('should add backticks to table or column names', () => {
			expect(db.quote('posts')).toBe('`posts`');
		});
		it('should add backticks to table.column', () => {
			expect(db.quote('posts.id')).toBe('`posts`.`id`');
		});
		it('should properly add backticks to table.*', () => {
			expect(db.quote('posts.*')).toBe('`posts`.*');
		});
		it('should avoid backticks if already present', () => {
			expect(db.quote('`invalid')).toBe('`invalid');
		});
		it('should avoid backticks on functions', () => {
			expect(db.quote('COUNT(*)')).toBe('COUNT(*)');
		});
		it('should avoid backticks on *', () => {
			expect(db.quote('*')).toBe('*');
		});
	});
});
