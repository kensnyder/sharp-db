jest.mock('mysql2');
const mysqlMock = require('mysql2');
const Db = require('../Db/Db.js');
const QueryLogger = require('../QueryLogger/QueryLogger.js');

describe('QueryLogger', () => {
	let logger, db;
	beforeEach(() => {
		Db.instances.length = 0;
		db = Db.factory();
		logger = new QueryLogger();
		logger.watch(db, ['insert']);
	});
	it('should log a single query', async () => {
		mysqlMock.pushResponse({ results: { insertId: 0 } });
		await db.insertInto('posts', { title: 'Foobar' });
		const expectedSql = "INSERT INTO `posts` SET `title`='Foobar'";
		expect(logger.getQueries()).toEqual([expectedSql]);
		expect(logger.getLastQuery()).toBe(expectedSql);
		expect(logger.getLogs()).toHaveLength(1);
		logger.clear();
		expect(logger.getQueries()).toEqual([]);
		expect(logger.getLogs()).toHaveLength(0);
	});
	it('should ignore unwatched queries', async () => {
		mysqlMock.pushResponse({ results: { insertId: 0 } });
		await db.deleteFrom('posts', { title: 'Foobar' });
		expect(logger.getQueries()).toEqual([]);
		expect(logger.getLogs()).toHaveLength(0);
	});
	it('should filter queries', async () => {
		mysqlMock.pushResponse({ results: { insertId: 0 } });
		await db.insertInto('posts', { title: 'Foobar' });
		const expectedSql = "INSERT INTO `posts` SET `title`='Foobar'";
		const inserts = logger.getQueries(log => log.query.match(/`posts`/));
		expect(inserts).toEqual([expectedSql]);
		const deletes = logger.getQueries(log => log.type === 'delete');
		expect(deletes).toEqual([]);
	});
	it('should return lastQuery of null if there are no queries', async () => {
		expect(logger.getLastQuery()).toBe(null);
	});
	it('should stop watching', async () => {
		logger.unwatch(db);
		mysqlMock.pushResponse({ results: { insertId: 0 } });
		await db.insertInto('posts', { title: 'Foobar' });
		expect(logger.getQueries()).toEqual([]);
		expect(logger.getLogs()).toHaveLength(0);
	});
	it('should keep watching other dbs', async () => {
		const db2 = new Db();
		logger.watch(db2);
		mysqlMock.pushResponse({ results: { insertId: 0 } });
		await db.insertInto('posts', { title: 'Foobar' });
		expect(logger.getLogs()).toHaveLength(1);
		logger.unwatch(db);
		expect(logger._watching).toHaveLength(1);
	});
});
