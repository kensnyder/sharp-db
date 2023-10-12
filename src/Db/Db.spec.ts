import Db from './Db';
import { MockAdapter } from '../Adapters/MockAdapter';

describe('Db', () => {
	let db, mockAdapter;
	beforeEach(() => {
		mockAdapter = new MockAdapter(null);
		Db.instances.length = 0;
		db = new Db(mockAdapter);
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
	});
	// describe('binding', () => {
	// 	it('should bind strings', () => {
	// 		const bound = db.bindArgs('WHERE a = ?', ['foo']);
	// 		expect(bound.sql).toBe("WHERE a = 'foo'");
	// 	});
	// 	it('should bind String object', () => {
	// 		const bound = db.bindArgs('WHERE a = ?', [new String('foo')]);
	// 		expect(bound.sql).toBe("WHERE a = 'foo'");
	// 	});
	// 	it('should bind numbers', () => {
	// 		const bound = db.bindArgs('WHERE a = ? AND b = ?', [1, 2]);
	// 		expect(bound.sql).toBe('WHERE a = 1 AND b = 2');
	// 	});
	// 	it('should bind Number object', () => {
	// 		const bound = db.bindArgs('WHERE a = ? AND b = ?', [
	// 			new Number(1),
	// 			new Number(2),
	// 		]);
	// 		expect(bound.sql).toBe('WHERE a = 1 AND b = 2');
	// 	});
	// 	it('should bind true', () => {
	// 		const bound = db.bindArgs('WHERE is_success = :isSuccess', [
	// 			{
	// 				isSuccess: true,
	// 			},
	// 		]);
	// 		expect(bound.sql).toBe('WHERE is_success = true');
	// 	});
	// 	it('should bind false', () => {
	// 		const bound = db.bindArgs('WHERE is_active = ?', [false]);
	// 		expect(bound.sql).toBe('WHERE is_active = false');
	// 	});
	// 	it('should bind Boolean true Object', () => {
	// 		const bound = db.bindArgs('WHERE is_active = ?', [new Boolean(true)]);
	// 		expect(bound.sql).toBe('WHERE is_active = true');
	// 	});
	// 	it('should bind Boolean false Object', () => {
	// 		const bound = db.bindArgs('WHERE is_active = ?', [new Boolean(false)]);
	// 		expect(bound.sql).toBe('WHERE is_active = false');
	// 	});
	// 	it('should bind arrays', () => {
	// 		const bound = db.bindArgs('WHERE id IN(?)', [[1, 2, 3]]);
	// 		expect(bound.sql).toBe('WHERE id IN(1, 2, 3)');
	// 	});
	// 	it('should bind nulls', () => {
	// 		const bound = db.bindArgs('SET a = ?', [null]);
	// 		expect(bound.sql).toBe('SET a = NULL');
	// 	});
	// 	it('should bind Date Objects', () => {
	// 		const now = '2021-01-25 10:34:36.472';
	// 		const date = new Date('2021-01-25 10:34:36.472');
	// 		const bound = db.bindArgs('SET at = ?', [date]);
	// 		expect(bound.sql).toBe(`SET at = '${now}'`);
	// 	});
	// 	it('should do nothing on empty arrays', () => {
	// 		const bound = db.bindArgs('SET a = 1', []);
	// 		expect(bound.sql).toBe('SET a = 1');
	// 	});
	// 	it('should do nothing on undefined', () => {
	// 		const bound = db.bindArgs('SET a = ?', undefined);
	// 		expect(bound.sql).toBe('SET a = ?');
	// 	});
	// 	it('should throw errors if SQL is empty string', () => {
	// 		const bindEmpty = () => {
	// 			db.bindArgs('', []);
	// 		};
	// 		expect(bindEmpty).toThrow();
	// 	});
	// 	it('should throw errors if SQL is empty object', () => {
	// 		const bindEmpty = () => {
	// 			db.bindArgs({}, []);
	// 		};
	// 		expect(bindEmpty).toThrow();
	// 	});
	// });
	// describe('connect()', () => {
	// 	it('should handle errors', async () => {
	// 		const error = new Error('foo');
	// 		error.fatal = true;
	// 		mysqlMock.pushConnect(error);
	// 		try {
	// 			await db.connect();
	// 		} catch (e) {
	// 			expect(e).toBeInstanceOf(Error);
	// 			expect(e.fatal).toBe(true);
	// 		}
	// 	});
	// });
	describe('select()', () => {
		it('should handle errors', async () => {
			mockAdapter.mockQueryResult({
				error: new Error('foo'),
			});
			try {
				await db.select('SELECT * FROM users');
			} catch (e) {
				expect(e.message).toContain('foo');
			}
		});
		it('should return result arrays', async () => {
			const sql = 'SELECT * FROM users';
			const mockResults = [
				{ name: 'John Doe', email: 'john@example.com' },
				{ name: 'Jane Doe', email: 'jane@example.com' },
			];
			const mockFields = [{ name: 'name' }, { name: 'email' }];
			mockAdapter.mockQueryResult({
				results: mockResults,
				fields: mockFields,
				query: sql,
			});
			const { query, results, fields } = await db.select(sql);
			expect(query).toBe(sql);
			expect(results).toEqual(mockResults);
			expect(fields).toEqual(mockFields);
		});
		// it('should bind on question marks', async () => {
		// 	const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
		// 	const { query } = await db.select(sql, 101, 199);
		// 	expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		// });
		// it('should bind on colons', async () => {
		// 	const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
		// 	const { query } = await db.select(sql, { min: 101, max: 199 });
		// 	expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		// });
		// it('should handle options', async () => {
		// 	const sql = 'SELECT * FROM users';
		// 	const { query } = await db.select({ sql, timeout: 30000 });
		// 	expect(query).toBe('SELECT * FROM users');
		// });
		// it('should handle array values bound in options', async () => {
		// 	const sql = 'SELECT * FROM users WHERE id BETWEEN ? AND ?';
		// 	const { query } = await db.select({ sql, values: [101, 199] });
		// 	expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		// });
		// it('should handle array options binding and param binding', async () => {
		// 	const sql =
		// 		'SELECT * FROM users WHERE id BETWEEN ? AND ? AND department_id = ?';
		// 	const { query } = await db.select({ sql, values: [101, 199] }, 1);
		// 	expect(query).toBe(
		// 		'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department_id = 1'
		// 	);
		// });
		// it('should handle objects bound in options', async () => {
		// 	const sql = 'SELECT * FROM users WHERE id BETWEEN :min AND :max';
		// 	const { query } = await db.select({
		// 		sql,
		// 		values: { min: 101, max: 199 },
		// 	});
		// 	expect(query).toBe('SELECT * FROM users WHERE id BETWEEN 101 AND 199');
		// });
		// it('should handle object options binding and param binding', async () => {
		// 	const sql =
		// 		'SELECT * FROM users WHERE id BETWEEN :min AND :max AND department = ?';
		// 	const { query } = await db.select(
		// 		{ sql, values: { min: 101, max: 199 } },
		// 		1
		// 	);
		// 	expect(query).toBe(
		// 		'SELECT * FROM users WHERE id BETWEEN 101 AND 199 AND department = 1'
		// 	);
		// });
		// it('should tunnel via SSH', async () => {
		// 	const stream = {};
		// 	ssh2Mock.pushResponse({
		// 		err: null,
		// 		stream,
		// 	});
		// 	mockAdapter.mockQueryResult({ results: [] });
		// 	const db = new Db(
		// 		{
		// 			password: '',
		// 		},
		// 		{
		// 			user: 'ubuntu',
		// 			password: 'moo',
		// 		}
		// 	);
		// 	const { results } = await db.select('SELECT * FROM foo');
		// 	expect(results).toEqual([]);
		// });
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
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.selectHash(sql);
			expect(results).toEqual(hash);
		});
	});
	describe('selectList()', () => {
		it('should return item list', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
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
				1: [mockResults[0], mockResults[2]],
				2: [mockResults[1]],
			};
			mockAdapter.mockQueryResult({ results: mockResults });
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
			mockAdapter.mockQueryResult({ results: mockResults });
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
			mockAdapter.mockQueryResult({ results: mockResults });
			const { results } = await db.selectFirst(sql);
			expect(results).toEqual(mockResults[0]);
		});
	});
	describe('selectValue()', () => {
		it('should return the first field from the first row', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ name: 'John Doe' }, { name: 'Jane Doe' }];
			const mockFields = [{ name: 'name' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.selectValue(sql);
			expect(results).toEqual(mockResults[0].name);
		});
		it('should return undefined on empty results', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [];
			const mockFields = [{ name: 'name' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.selectValue(sql);
			expect(results).toBe(undefined);
		});
	});
	describe('selectExists()', () => {
		it('should construct a SELECT EXISTS query', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ does_it_exist: true }];
			const mockFields = [];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.selectExists(sql);
			expect(results).toBe(true);
		});
		it('should return false if there are no results', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [];
			const mockFields = [];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.selectExists(sql);
			expect(results).toBe(false);
		});
		it('should construct a SELECT EXISTS query from object', async () => {
			const sql = 'SELECT name FROM users';
			const mockResults = [{ does_it_exist: true }];
			const mockFields = [];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.selectExists({ sql });
			expect(results).toBe(true);
		});
	});
	describe('insert()', () => {
		it('should return the id of the inserted record', async () => {
			const sql = 'INSERT INTO users VALUES(?)';
			const mockResults = { insertId: 1 };
			mockAdapter.mockQueryResult({ results: mockResults });
			const { insertId } = await db.insert(sql, 'John Doe');
			expect(insertId).toBe(1);
		});
	});
	describe('update()', () => {
		it('should return the number of changed rows', async () => {
			const sql = 'UPDATE users SET department_id = 2 WHERE department_id = 1';
			const mockResults = { changedRows: 3 };
			mockAdapter.mockQueryResult({ results: mockResults });
			const { changedRows } = await db.update(sql);
			expect(changedRows).toBe(3);
		});
	});
	describe('delete()', () => {
		it('should return the number of deleted rows', async () => {
			const sql = 'DELETE FROM users WHERE department_id = 1';
			const mockResults = { changedRows: 3 };
			mockAdapter.mockQueryResult({ results: mockResults });
			const { changedRows } = await db.delete(sql);
			expect(changedRows).toBe(3);
		});
	});
	describe('selectFrom()', () => {
		it('should handle empty fields and criteria', async () => {
			const { query } = await db.selectFrom('users');
			expect(query).toBe('SELECT * FROM `users` WHERE 1 = 1');
		});
		it('should handle named fields', async () => {
			const { query } = await db.selectFrom('users', ['id', 'name']);
			expect(query).toBe('SELECT `id`, `name` FROM `users` WHERE 1 = 1');
		});
		it('should handle expression fields', async () => {
			const { query } = await db.selectFrom('users', [
				'id',
				"CONCAT(fname, ' ', lname)",
			]);
			expect(query).toBe(
				"SELECT `id`, CONCAT(fname, ' ', lname) FROM `users` WHERE 1 = 1"
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
			expect(query).toBe('SELECT * FROM `users` WHERE 1 = 1 LIMIT 5');
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
			mockAdapter.mockQueryResult({ results: mockResults });
			const { results } = await db.selectId('users', mockResults[0].id);
			expect(results).toEqual(mockResults[0]);
		});
	});
	describe('selectUuid()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [
				{ uuid: '4baf1860-cf2b-4037-8ad3-6e043cc144d9', name: 'Jane Doe' },
			];
			mockAdapter.mockQueryResult({ results: mockResults });
			const { results } = await db.selectUuid('users', mockResults[0].uuid);
			expect(results).toBe(mockResults[0]);
		});
	});
	describe('selectByKey()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [{ sso_ref: 'A123456', name: 'Jane Doe' }];
			mockAdapter.mockQueryResult({ results: mockResults });
			const { query, results } = await db.selectByKey(
				'users',
				'sso_ref',
				mockResults[0].sso_ref
			);
			expect(results).toEqual(mockResults[0]);
		});
	});
	describe('selectOrCreate()', () => {
		it('should return the correct result object', async () => {
			const mockResults = [{ sso_ref: 'A123456', name: 'Jane Doe' }];
			mockAdapter.mockQueryResult({ results: mockResults });
			const { results } = await db.selectOrCreate(
				'users',
				{ sso_ref: mockResults[0].sso_ref },
				mockResults[0]
			);
			expect(results).toEqual(mockResults[0]);
		});
		it('should insert a new record', async () => {
			const newRow = {
				sso_ref: 'A123456',
				name: 'Jane Doe',
				id: 5,
			};
			mockAdapter.mockQueryResult({ results: [] });
			mockAdapter.mockQueryResult({ results: { insertId: 5 } });
			mockAdapter.mockQueryResult({ results: [newRow] });
			const { insertId } = await db.selectOrCreate(
				'users',
				{ sso_ref: 'A123456' },
				{ sso_ref: 'A123456', name: 'Jane Doe' }
			);
			expect(insertId).toBe(5);
		});
		it('should throw error if insertId is falsy', async () => {
			let error;
			try {
				mockAdapter.mockQueryResult({ results: [] });
				mockAdapter.mockQueryResult({ results: {} });
				await db.selectOrCreate(
					'users',
					{ sso_ref: 'A123456' },
					{ sso_ref: 'A123456', name: 'Jane Doe' }
				);
			} catch (e) {
				error = e;
			}
			expect(error).toBeInstanceOf(Error);
		});
		it('should return new row', async () => {
			const newRow = {
				sso_ref: 'A123456',
				name: 'Jane Doe',
				id: 5,
			};
			mockAdapter.mockQueryResult({ results: [] });
			mockAdapter.mockQueryResult({ results: { insertId: 5 } });
			mockAdapter.mockQueryResult({ results: [newRow] });
			const { results, insertId } = await db.selectOrCreate(
				'users',
				{ sso_ref: 'A123456' },
				{ sso_ref: 'A123456', name: 'Jane Doe' }
			);
			expect(insertId).toBe(5);
			expect(results).toEqual(newRow);
		});
		it('should throw error if new row is falsy', async () => {
			let error;
			try {
				mockAdapter.mockQueryResult({ results: [] });
				mockAdapter.mockQueryResult({ results: { insertId: 5 } });
				mockAdapter.mockQueryResult({
					results: false,
				});
				await db.selectOrCreate(
					'users',
					{ sso_ref: 'A123456' },
					{ sso_ref: 'A123456', name: 'Jane Doe' }
				);
			} catch (e) {
				error = e;
			}
			expect(error).toBeInstanceOf(Error);
		});
		it('should throw error if initial select fails', async () => {
			let error;
			try {
				await db.selectOrCreate('users', 'invalid', {
					sso_ref: 'A123456',
					name: 'Jane Doe',
				});
			} catch (e) {
				error = e;
			}
			expect(error).toBeInstanceOf(Error);
		});
	});
	describe('selectOrCreateId()', () => {
		it('should return the id of the new record', async () => {
			mockAdapter.mockQueryResult({ results: [] });
			mockAdapter.mockQueryResult({ results: { insertId: 5 } });
			const { results } = await db.selectOrCreateId(
				'users',
				{ sso_ref: 'A123456' },
				{ sso_ref: 'A123456', name: 'Jane Doe' }
			);
			expect(results).toBe(5);
		});
		it('should return the record if existing', async () => {
			mockAdapter.mockQueryResult({ results: [{ a: 1, b: 2, id: 5 }] });
			const { results } = await db.selectOrCreateId(
				'users',
				{ a: 1 },
				{ a: 1, b: 2 }
			);
			expect(results).toBe(5);
		});
		it('should throw error if initial select fails', async () => {
			let error;
			try {
				mockAdapter.mockQueryResult({ results: null });
				await db.selectOrCreateId(
					'users',
					{ sso_ref: 'A123456' },
					{ sso_ref: 'A123456', name: 'Jane Doe' }
				);
			} catch (e) {
				error = e;
			}
			expect(error).toBeInstanceOf(Error);
		});
	});
	describe('insertInto()', () => {
		it('should return the id of the inserted record', async () => {
			const mockResults = { insertId: 5 };
			mockAdapter.mockQueryResult({ results: mockResults });
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
			mockAdapter.mockQueryResult({ results: mockResults });
			const { insertId, affectedRows } =
				await db.insertIntoOnDuplicateKeyUpdate(
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
			mockAdapter.mockQueryResult({
				error: new Error('foo'),
			});
			try {
				await db.insertIntoOnDuplicateKeyUpdate('test', { a: 1 }, { b: 2 });
			} catch (e) {
				expect(e.message).toContain('foo');
			}
		});
	});
	describe('insertExtended()', () => {
		it('should return last insert and affected', async () => {
			const mockResults = { insertId: 5, affectedRows: 2 };
			mockAdapter.mockQueryResult({ results: mockResults });
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
			mockAdapter.mockQueryResult({ results: mockResults });
			const { query, affectedRows } = await db.updateTable(
				'users',
				{ foo: undefined, email: 'john@example.com' },
				{ id: 5 }
			);
			expect(affectedRows).toBe(1);
			expect(query).toBe(
				"UPDATE `users` SET `email`='john@example.com' WHERE `id` = 5"
			);
		});
		it('should work without criteria', async () => {
			const mockResults = { affectedRows: 100 };
			mockAdapter.mockQueryResult({ results: mockResults });
			const { query, affectedRows } = await db.updateTable('users', {
				is_active: true,
			});
			expect(affectedRows).toBe(100);
			expect(query).toBe('UPDATE `users` SET `is_active`=true WHERE 1 = 1');
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
			mockAdapter.mockQueryResult({ results: mockResults });
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
			mockAdapter.mockQueryResult({ results: mockResults });
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
	// describe('tpl() escaping', () => {
	// 	it('should template Numbers', async () => {
	// 		const { select } = db.tpl();
	// 		const id = 4;
	// 		const { query } = await select`SELECT * FROM users WHERE id = ${id}`;
	// 		expect(query).toBe('SELECT * FROM users WHERE id = 4');
	// 	});
	// 	it('should template Strings', async () => {
	// 		const { select } = db.tpl();
	// 		const email = 'john@example.com';
	// 		const { query } =
	// 			await select`SELECT * FROM users WHERE email = ${email}`;
	// 		expect(query).toBe(
	// 			"SELECT * FROM users WHERE email = 'john@example.com'"
	// 		);
	// 	});
	// 	it('should template Booleans', async () => {
	// 		const { select } = db.tpl();
	// 		const isActive = true;
	// 		const { query } =
	// 			await select`SELECT * FROM users WHERE is_active = ${isActive}`;
	// 		expect(query).toBe('SELECT * FROM users WHERE is_active = true');
	// 	});
	// 	it('should template Arrays', async () => {
	// 		const { select } = db.tpl();
	// 		const ids = [1, 3];
	// 		const { query } = await select`SELECT * FROM users WHERE id IN(${ids})`;
	// 		expect(query).toBe('SELECT * FROM users WHERE id IN(1, 3)');
	// 	});
	// 	it('should cache templating', async () => {
	// 		const { select: select1 } = db.tpl();
	// 		const { select: select2 } = db.tpl();
	// 		expect(select1).toBe(select2);
	// 	});
	// });
	// describe('tpl() functions', () => {
	// 	it('should allow selectFirst', async () => {
	// 		const { selectFirst } = db.tpl();
	// 		const id = 4;
	// 		const { query } = await selectFirst`SELECT * FROM users WHERE id = ${id}`;
	// 		expect(query).toBe('SELECT * FROM users WHERE id = 4');
	// 	});
	// 	it('should allow selectList', async () => {
	// 		const mockResults = [
	// 			{ email: 'john@example.com' },
	// 			{ email: 'jane@example.com' },
	// 		];
	// 		const mockFields = [{ name: 'email' }];
	// 		mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
	// 		const { selectList } = db.tpl();
	// 		const id = 4;
	// 		const { query } =
	// 			await selectList`SELECT email FROM users WHERE id > ${id}`;
	// 		expect(query).toBe('SELECT email FROM users WHERE id > 4');
	// 	});
	// 	it('should allow selectHash', async () => {
	// 		const mockResults = [
	// 			{ id: 4, name: 'John Doe' },
	// 			{ id: 5, name: 'Jane Doe' },
	// 		];
	// 		const mockFields = [{ name: 'id' }, { name: 'name' }];
	// 		mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
	// 		const { selectHash } = db.tpl();
	// 		const id = 4;
	// 		const { query } =
	// 			await selectHash`SELECT id, name FROM users WHERE id > ${id}`;
	// 		expect(query).toBe('SELECT id, name FROM users WHERE id > 4');
	// 	});
	// 	it('should allow selectValue', async () => {
	// 		const mockResults = [{ email: 'jane@example.com' }];
	// 		const mockFields = [{ name: 'email' }];
	// 		mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
	// 		const { selectValue } = db.tpl();
	// 		const id = 4;
	// 		const { query } =
	// 			await selectValue`SELECT email FROM users WHERE id = ${id}`;
	// 		expect(query).toBe('SELECT email FROM users WHERE id = 4');
	// 	});
	// 	it('should allow insert', async () => {
	// 		const { insert } = db.tpl();
	// 		const name = 'Jane Doe';
	// 		const email = 'jane@example.com';
	// 		const { query } =
	// 			await insert`INSERT INTO users VALUES (${name}, ${email})`;
	// 		expect(query).toBe(
	// 			"INSERT INTO users VALUES ('Jane Doe', 'jane@example.com')"
	// 		);
	// 	});
	// 	it('should allow update', async () => {
	// 		const { update } = db.tpl();
	// 		const name = 'Jane Doe';
	// 		const email = 'jane@example.com';
	// 		const { query } =
	// 			await update`UPDATE users SET name = ${name} WHERE email = ${email}`;
	// 		expect(query).toBe(
	// 			"UPDATE users SET name = 'Jane Doe' WHERE email = 'jane@example.com'"
	// 		);
	// 	});
	// 	it('should allow delete', async () => {
	// 		const { delete: del } = db.tpl();
	// 		const id = 4;
	// 		const { query } = await del`DELETE FROM users WHERE id = ${id}`;
	// 		expect(query).toBe('DELETE FROM users WHERE id = 4');
	// 	});
	// });
	describe('query()', () => {
		it('should return results', async () => {
			const sql = 'UPDATE users SET is_active = true';
			const mockResults = { affectedRows: 1 };
			mockAdapter.mockQueryResult({ results: mockResults });
			const { query, results } = await db.query(sql);
			expect(results).toEqual(mockResults);
		});
		it('should return fields', async () => {
			const sql = 'UPDATE users SET is_active = true';
			const mockResults = [{ id: 1 }, { id: 2 }];
			const mockFields = [{ name: 'id' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results, fields } = await db.query(sql);
			expect(results).toEqual(mockResults);
			expect(fields).toEqual(mockFields);
		});
		it('should reject on error', async () => {
			const sql = 'UPDATE users SET is_active = true';
			mockAdapter.mockQueryResult({ error: new Error('foo') });
			try {
				await db.query(sql);
			} catch (e) {
				expect(e.message).toContain('foo');
			}
		});
	});
	describe('multiQuery()', () => {
		it('should return multiple results', async () => {
			const sql = 'UPDATE users SET is_active = true; SELECT * FROM users';
			const mockResults = [{ affectedRows: 1 }, { id: 1, name: 'John' }];
			mockAdapter.mockQueryResult({ results: mockResults });
			const { query, results } = await db.multiQuery(sql);
			expect(results).toEqual(mockResults);
		});
		it('should reject on error', async () => {
			const sql = 'UPDATE users SET is_active = true; SELECT * FROM posts';
			mockAdapter.mockQueryResult({ error: new Error('foo') });
			try {
				await db.query(sql);
			} catch (e) {
				expect(e.message).toContain('foo');
			}
		});
	});
	describe('exportAsSql()', () => {
		it('should build export string', async () => {
			const mockResults = [
				{ id: 1, fname: 'John' },
				{ id: 2, fname: 'Jane' },
			];
			const mockFields = [{ name: 'id' }, { name: 'fname' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results, fields, query, affectedRows, chunks } =
				await db.exportAsSql('users');
			expect(results).toBe(
				`
INSERT INTO \`users\` (\`id\`,\`fname\`) VALUES
(1,'John'),
(2,'Jane');
			`.trim()
			);
			expect(fields).toEqual(mockFields);
			expect(affectedRows).toBe(2);
			expect(chunks).toBe(1);
		});
		it('should export 0 records', async () => {
			const mockResults = [];
			const mockFields = [{ name: 'id' }, { name: 'fname' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results, fields, query, affectedRows, chunks } =
				await db.exportAsSql('users');
			expect(results).toBe('');
			expect(fields).toEqual(mockFields);
			expect(affectedRows).toBe(0);
			expect(chunks).toBe(0);
		});
		it('should discard ids', async () => {
			const mockResults = [
				{ id: 1, fname: 'John' },
				{ id: 2, fname: 'Jane' },
			];
			const mockFields = [{ name: 'id' }, { name: 'fname' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.exportAsSql(
				'users',
				{},
				{ discardIds: true, limit: 5 }
			);
			expect(results).toBe(
				`
INSERT INTO \`users\` (\`id\`,\`fname\`) VALUES
(NULL,'John'),
(NULL,'Jane');
			`.trim()
			);
		});
		it('should add truncate statement', async () => {
			const mockResults = [
				{ id: 1, fname: 'John' },
				{ id: 2, fname: 'Jane' },
			];
			const mockFields = [{ name: 'id' }, { name: 'fname' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.exportAsSql(
				'users',
				{},
				{ truncateTable: true }
			);
			expect(results).toBe(
				`
TRUNCATE TABLE \`users\`;
INSERT INTO \`users\` (\`id\`,\`fname\`) VALUES
(1,'John'),
(2,'Jane');
			`.trim()
			);
		});
		it('should add lock tables statement', async () => {
			const mockResults = [
				{ id: 1, fname: 'John' },
				{ id: 2, fname: 'Jane' },
			];
			const mockFields = [{ name: 'id' }, { name: 'fname' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.exportAsSql(
				'users',
				{},
				{ lockTables: true }
			);
			expect(results).toBe(
				`
LOCK TABLES \`users\` WRITE;
INSERT INTO \`users\` (\`id\`,\`fname\`) VALUES
(1,'John'),
(2,'Jane');
UNLOCK TABLES;
			`.trim()
			);
		});
		it('should disable and re-enable foreign key checks', async () => {
			const mockResults = [
				{ id: 1, fname: 'John' },
				{ id: 2, fname: 'Jane' },
			];
			const mockFields = [{ name: 'id' }, { name: 'fname' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.exportAsSql(
				'users',
				{},
				{ disableForeignKeyChecks: true }
			);
			expect(results).toBe(
				`
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
INSERT INTO \`users\` (\`id\`,\`fname\`) VALUES
(1,'John'),
(2,'Jane');
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
			`.trim()
			);
		});
		it('should split inserts into chunks', async () => {
			const mockResults = [
				{ id: 1, fname: 'John' },
				{ id: 2, fname: 'Jane' },
			];
			const mockFields = [{ name: 'id' }, { name: 'fname' }];
			mockAdapter.mockQueryResult({ results: mockResults, fields: mockFields });
			const { results } = await db.exportAsSql('users', {}, { chunkSize: 1 });
			expect(results).toBe(
				`
INSERT INTO \`users\` (\`id\`,\`fname\`) VALUES
(1,'John');
INSERT INTO \`users\` (\`id\`,\`fname\`) VALUES
(2,'Jane');
			`.trim()
			);
		});
	});
	// describe('transactions', () => {
	// 	it('should start transaction', async () => {
	// 		mockAdapter.mockQueryResult({});
	// 		const { query } = await db.startTransaction();
	// 		await db.end();
	// 		expect(query).toBe('START TRANSACTION');
	// 	});
	// 	it('should begin transaction', async () => {
	// 		mockAdapter.mockQueryResult({});
	// 		const { query } = await db.beginTransaction();
	// 		await db.end();
	// 		expect(query).toBe('START TRANSACTION');
	// 	});
	// 	it('should commit', async () => {
	// 		mockAdapter.mockQueryResult({});
	// 		const { query } = await db.commit();
	// 		await db.end();
	// 		expect(query).toBe('COMMIT');
	// 	});
	// 	it('should rollback', async () => {
	// 		mockAdapter.mockQueryResult({ query: 'ROLLBACK' });
	// 		const { query } = await db.rollback();
	// 		await db.end();
	// 		expect(query).toBe('ROLLBACK');
	// 	});
	// });
	// describe('end()', () => {
	// 	it('should not error on query', async () => {
	// 		const sql = 'UPDATE posts SET is_active = true';
	// 		const mockResults = { affectedRows: 2 };
	// 		mockAdapter.mockQueryResult({ results: mockResults });
	// 		const { query, results } = await db.query(sql);
	// 		await db.end();
	// 		expect(query).toBe(sql);
	// 		expect(results).toEqual(mockResults);
	// 	});
	// 	it('should allow endAll', async () => {
	// 		const sql = 'UPDATE users SET is_active = true';
	// 		const mockResults = { affectedRows: 3 };
	// 		mockAdapter.mockQueryResult({ results: mockResults });
	// 		const { query, results } = await db.query(sql);
	// 		await Db.endAll();
	// 		expect(query).toBe(sql);
	// 		expect(results).toEqual(mockResults);
	// 	});
	// 	it('should not error even if not connected', async () => {
	// 		let err = undefined;
	// 		try {
	// 			await db.end();
	// 		} catch (e) {
	// 			err = e;
	// 		}
	// 		expect(err).toBe(undefined);
	// 	});
	// 	it('should not error if Db.instances is already empty', async () => {
	// 		let err = undefined;
	// 		try {
	// 			await db.connect();
	// 			Db.instances.length = 0;
	// 			await db.end();
	// 		} catch (e) {
	// 			err = e;
	// 		}
	// 		expect(err).toBe(undefined);
	// 	});
	// 	it('should end when db.ssh is defined', async () => {
	// 		const spy = vitest.fn();
	// 		ssh2Mock.onNextEnd(spy);
	// 		ssh2Mock.pushResponse({
	// 			err: null,
	// 			stream: {},
	// 		});
	// 		const db = new Db(
	// 			{
	// 				password: '',
	// 			},
	// 			{
	// 				user: 'ubuntu',
	// 				password: 'moo',
	// 			}
	// 		);
	// 		await db.connect();
	// 		await db.end();
	// 		expect(spy).toHaveBeenCalled();
	// 	});
	// 	it('should end when db.ssh is defined', async () => {
	// 		mysqlMock.pushEnd(new Error('foo'));
	// 		ssh2Mock.pushResponse({
	// 			err: null,
	// 			stream: {},
	// 		});
	// 		const db = new Db(
	// 			{
	// 				password: '',
	// 			},
	// 			{
	// 				user: 'ubuntu',
	// 				password: 'moo',
	// 			}
	// 		);
	// 		await db.connect();
	// 		try {
	// 			await db.end();
	// 		} catch (e) {
	// 			expect(e.message).toContain('foo');
	// 		}
	// 	});
	// 	it('should end db.ssh when connection is undefined', async () => {
	// 		ssh2Mock.pushResponse({
	// 			err: null,
	// 			stream: {},
	// 		});
	// 		const db = new Db(
	// 			{
	// 				password: '',
	// 			},
	// 			{
	// 				user: 'ubuntu',
	// 				password: 'moo',
	// 			}
	// 		);
	// 		await db.connect();
	// 		db.connection = undefined;
	// 		db.ssh.connection.end = vitest.fn();
	// 		await db.end();
	// 		expect(db.ssh.connection.end).toHaveBeenCalled();
	// 	});
	// });
	// describe('destroy()', () => {
	// 	it('should not error', async () => {
	// 		const sql = "UPDATE posts SET status = 'new'";
	// 		const mockResults = { affectedRows: 4 };
	// 		mockAdapter.mockQueryResult({ results: mockResults });
	// 		const { query, results } = await db.query(sql);
	// 		db.destroy();
	// 		expect(query).toBe(sql);
	// 		expect(results).toEqual(mockResults);
	// 	});
	// 	it('should allow destroyAll', async () => {
	// 		const sql = "UPDATE posts SET status = 'new'";
	// 		const mockResults = { affectedRows: 5 };
	// 		mockAdapter.mockQueryResult({ results: mockResults });
	// 		const { query, results } = await db.query(sql);
	// 		Db.destroyAll();
	// 		expect(query).toBe(sql);
	// 		expect(results).toEqual(mockResults);
	// 	});
	// 	it('should destroy when Ssh', async () => {
	// 		const stream = {};
	// 		ssh2Mock.pushResponse({
	// 			err: null,
	// 			stream,
	// 		});
	// 		const db = new Db(
	// 			{
	// 				password: '',
	// 			},
	// 			{
	// 				user: 'ubuntu',
	// 				password: 'moo',
	// 			}
	// 		);
	// 		db.destroy();
	// 	});
	// 	it('should not error if Db.instances is already empty', async () => {
	// 		let err = undefined;
	// 		try {
	// 			await db.connect();
	// 			Db.instances.length = 0;
	// 			db.destroy();
	// 		} catch (e) {
	// 			err = e;
	// 		}
	// 		expect(err).toBe(undefined);
	// 	});
	// });
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
	// describe('quote()', () => {
	// 	it('should add backticks to table or column names', () => {
	// 		expect(db.quote('posts')).toBe('`posts`');
	// 	});
	// 	it('should add backticks to table.column', () => {
	// 		expect(db.quote('posts.id')).toBe('`posts`.`id`');
	// 	});
	// 	it('should properly add backticks to table.*', () => {
	// 		expect(db.quote('posts.*')).toBe('`posts`.*');
	// 	});
	// 	it('should avoid backticks if already present', () => {
	// 		expect(db.quote('`invalid')).toBe('`invalid');
	// 	});
	// 	it('should avoid backticks on functions', () => {
	// 		expect(db.quote('COUNT(*)')).toBe('COUNT(*)');
	// 	});
	// 	it('should avoid backticks on *', () => {
	// 		expect(db.quote('*')).toBe('*');
	// 	});
	// });
	// describe('withInstance()', () => {
	// 	it('should run handler', async () => {
	// 		const mockResults = [{ foo: 1 }, { foo: 2 }];
	// 		mockAdapter.mockQueryResult({ results: mockResults });
	// 		const { results } = await Db.withInstance(db => {
	// 			return db.select('SELECT foo FROM bar');
	// 		});
	// 		expect(results).toEqual(mockResults);
	// 	});
	// 	it('should accept mysql config', async () => {
	// 		const mysqlConfig = { user: 'root' };
	// 		const results = await Db.withInstance(mysqlConfig, db => {
	// 			return db;
	// 		});
	// 		expect(results).toBeInstanceOf(Db);
	// 		expect(results.config.user).toBe('root');
	// 	});
	// 	it('should accept ssh config', async () => {
	// 		const mysqlConfig = {};
	// 		const sshConfig = { user: 'ubuntu' };
	// 		const results = await Db.withInstance(mysqlConfig, sshConfig, db => {
	// 			return db;
	// 		});
	// 		expect(results).toBeInstanceOf(Db);
	// 		expect(results.ssh.config.user).toBe('ubuntu');
	// 	});
	// 	it('should call db.end()', async () => {
	// 		const spy = vitest.fn(() => Promise.resolve(1));
	// 		await Db.withInstance(db => {
	// 			db.end = spy;
	// 		});
	// 		expect(spy).toHaveBeenCalled();
	// 	});
	// 	it('should return Error on handler failure', async () => {
	// 		const spy = vitest.fn(() => Promise.resolve(1));
	// 		const res = await Db.withInstance(db => {
	// 			db.end = spy;
	// 			throw new Error('foo');
	// 		});
	// 		expect(spy).toHaveBeenCalled();
	// 		expect(res.error).toBeInstanceOf(Error);
	// 	});
	// 	it('should ignore error on db.end() failure', async () => {
	// 		const spy = vitest.fn(() => Promise.reject('foobar'));
	// 		const res = await Db.withInstance(db => {
	// 			db.end = spy;
	// 			return 17;
	// 		});
	// 		expect(spy).toHaveBeenCalled();
	// 		expect(res).toBe(17);
	// 	});
	// });
});
