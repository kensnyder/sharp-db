vitest.mock('mysql2');
import mysqlMock from 'mysql2';
import Db from '../Db/Db';
import DataBroker from './DataBroker';

describe('DataBroker', () => {
	let broker, db;
	beforeEach(() => {
		Db.instances.length = 0;
		db = Db.factory();
		broker = new DataBroker(db);
	});
	describe('instance', () => {
		it('should populate some properties', async () => {
			expect(broker.db).toBeInstanceOf(Db);
			expect(broker.now).toBeInstanceOf(Date);
			expect(typeof broker.uniqid).toBe('string');
			expect(broker.deleted).toEqual({});
			expect(broker.ids).toEqual({});
		});
	});
	describe('without Db instance', () => {
		it('should fallback to Db.factory()', async () => {
			const broker2 = new DataBroker();
			expect(broker2.db).toBeInstanceOf(Db);
		});
	});
	describe('insert', () => {
		it('should insert 1 record', async () => {
			mysqlMock.pushResponse({ results: { insertId: 1 } });
			const id = await broker.insert('users', { name: 'joe' });
			expect(id).toBe(1);
			expect(broker.ids).toEqual({ users: [1] });
		});
		it('should insert 2 records', async () => {
			mysqlMock.pushResponse({ results: { insertId: 1 } });
			mysqlMock.pushResponse({ results: { insertId: 2 } });
			const id1 = await broker.insert('users', { name: 'joe' });
			const id2 = await broker.insert('users', { name: 'jane' });
			expect(id1).toBe(1);
			expect(id2).toBe(2);
			expect(broker.ids).toEqual({ users: [1, 2] });
		});
		it('should clean up insertions', async () => {
			mysqlMock.pushResponse({ results: { insertId: 1 } });
			mysqlMock.pushResponse({ results: { affectedRows: 1 } });
			await broker.insert('users', { name: 'joe' });
			const spy = vi.spyOn(db, 'delete');
			const affectedRows = await broker.cleanup();
			expect(broker.ids).toEqual({});
			expect(affectedRows).toBe(1);
			expect(spy.mock.calls).toHaveLength(1);
			expect(spy).toHaveBeenCalledWith(
				'DELETE FROM `users` WHERE `id` = 1 LIMIT 1'
			);
			spy.mockRestore();
		});
		it('should handle composite keys', async () => {
			mysqlMock.pushResponse({ results: { insertId: 0 } });
			const compositeKey = await broker.insert(
				'posts_images',
				{
					post_id: 1,
					image_id: 2,
					sort: 1,
				},
				{ compositeKey: ['post_id', 'image_id'] }
			);
			expect(compositeKey).toEqual({
				post_id: 1,
				image_id: 2,
			});
			expect(broker.ids).toEqual({
				posts_images: [{ post_id: 1, image_id: 2 }],
			});
		});
		it('should cleanup insertions with composite keys', async () => {
			mysqlMock.pushResponse({ results: { insertId: 0 } });
			mysqlMock.pushResponse({ results: { affectedRows: 1 } });
			await broker.insert(
				'posts_images',
				{
					post_id: 1,
					image_id: 2,
					sort: 1,
				},
				{ compositeKey: ['post_id', 'image_id'] }
			);
			const spy = vi.spyOn(db, 'delete');
			const affectedRows = await broker.cleanup();
			expect(broker.ids).toEqual({});
			expect(affectedRows).toBe(1);
			expect(spy.mock.calls).toHaveLength(1);
			expect(spy).toHaveBeenCalledWith(
				'DELETE FROM `posts_images` WHERE `post_id` = 1 AND `image_id` = 2 LIMIT 1'
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
			const spy = vi.spyOn(db, 'insertExtended');
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
		it('should default user to 0 (camelCase)', async () => {
			const userId = 0;
			const fields = broker.createdAndModified();
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
		it('should default user to 0 (snake_case)', async () => {
			const userId = 0;
			const fields = broker.created_and_modified();
			expect(fields).toEqual({
				created_at: broker.now,
				created_by: userId,
				modified_at: broker.now,
				modified_by: userId,
			});
		});
	});
});
