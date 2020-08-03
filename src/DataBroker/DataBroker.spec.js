jest.mock('mysql2');
const mysqlMock = require('mysql2');
const Db = require('../Db/Db.js');
const DataBroker = require('./DataBroker.js');

describe('DataBroker', () => {
	let broker, db;
	beforeEach(() => {
		Db.instances.length = 0;
		db = Db.factory();
		broker = new DataBroker(db);
	});
	describe('insert', () => {
		it('should insert records', async () => {
			mysqlMock.pushResponse({ results: { insertId: 1 } });
			const id = await broker.insert('users', { name: 'joe' });
			expect(id).toBe(1);
			expect(broker.ids).toEqual({ users: [1] });
		});
		it('should clean up insertions', async () => {
			mysqlMock.pushResponse({ results: { insertId: 1 } });
			mysqlMock.pushResponse({ results: { affectedRows: 1 } });
			await broker.insert('users', { name: 'joe' });
			const spy = jest.spyOn(db, 'update');
			const affectedRows = await broker.cleanup();
			expect(broker.ids).toEqual({});
			expect(affectedRows).toBe(1);
			expect(spy.mock.calls).toHaveLength(1);
			expect(spy).toHaveBeenCalledWith(
				'DELETE FROM `users` WHERE `id` = 1 LIMIT 1'
			);
			spy.mockRestore();
		});
	});
	describe('delete', () => {
		it('should delete records', async () => {
			const deleted = [
				{ id: 1, name: 'joe' },
				{ id: 2, name: 'joe' },
			];
			mysqlMock.pushResponse({ results: deleted });
			const records = await broker.delete('users', { name: 'joe' });
			expect(deleted).toEqual(records);
			expect(broker.deleted.users).toEqual(records);
		});
		it('should keep all deleted records', async () => {
			const deleted1 = [
				{ id: 1, name: 'joe' },
				{ id: 2, name: 'joe' },
			];
			const deleted2 = [{ id: 3, name: 'jane' }];
			mysqlMock.pushResponse({ results: deleted1 });
			await broker.delete('users', { name: 'joe' });
			mysqlMock.pushResponse({ results: deleted2 });
			await broker.delete('users', { name: 'jane' });
			expect(broker.deleted.users).toEqual([...deleted1, ...deleted2]);
		});
		it('should clean up deletions', async () => {
			const deleted = [{ id: 1, name: 'joe' }];
			mysqlMock.pushResponse({ results: deleted });
			const spy = jest.spyOn(db, 'insertExtended');
			await broker.delete('users', { name: 'joe' });
			await broker.cleanup();
			expect(spy.mock.calls).toHaveLength(1);
			expect(spy).toHaveBeenCalledWith('users', deleted);
			spy.mockRestore();
		});
	});
	describe('created and modified', () => {
		it('should support camelCase', async () => {
			const userId = 2;
			const fields = broker.createdAndModified(2);
			expect(fields).toEqual({
				createdAt: broker.now,
				createdBy: userId,
				modifiedAt: broker.now,
				modifiedBy: userId,
			});
		});
		it('should support snake_case', async () => {
			const userId = 3;
			const fields = broker.created_and_modified(3);
			expect(fields).toEqual({
				created_at: broker.now,
				created_by: userId,
				modified_at: broker.now,
				modified_by: userId,
			});
		});
	});
});
