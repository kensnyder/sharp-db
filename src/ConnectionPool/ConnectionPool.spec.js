// npx jest --watch ConnectionPool
const ConnectionPool = require('./ConnectionPool.js');

describe('ConnectionPool', () => {
	it('should return size', () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		expect(pool.size()).toBe(5);
	});
	it('should require size to be greater than 0', () => {
		function attempt0() {
			const pool = new ConnectionPool({ connectionLimit: 0 });
		}
		expect(attempt0).toThrow(Error);
	});
	it('should know if empty', () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		expect(pool.isEmpty()).toBe(true);
	});
	it('should return availability', () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		expect(pool.available()).toBe(5);
	});
	it('should allow acquisition', async () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		await pool.acquire();
		expect(pool.available()).toBe(4);
	});
	it('should allow release', async () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		const conn1 = await pool.acquire();
		const conn2 = await pool.acquire();
		pool.release(conn1);
		expect(pool.available()).toBe(4);
	});
	it('should allow pinging', async () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		const result = await pool.ping();
		expect(result).toBeTruthy();
	});
	it('should tell if full', async () => {
		const pool = new ConnectionPool({ connectionLimit: 3 });
		const conn1 = await pool.acquire();
		const conn2 = await pool.acquire();
		expect(pool.isFull()).toBe(false);
		const conn3 = await pool.acquire();
		expect(pool.isFull()).toBe(true);
		pool.release(conn1);
		expect(pool.isFull()).toBe(false);
	});
	it('should fail to acquire if full', async () => {
		expect.assertions(1);
		const pool = new ConnectionPool({ connectionLimit: 2 });
		async function acquire3() {
			try {
				await pool.acquire();
				await pool.acquire();
				await pool.acquire();
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}
		}
		await acquire3();
	});
	it('should acquire a connection', async () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		const conn = await pool.acquire();
		expect(conn.query).toBeInstanceOf(Function);
		expect(conn.execute).toBeInstanceOf(Function);
	});
	it('should release a connection', async () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		const conn = await pool.acquire();
		pool.release(conn);
		expect(pool._connections).toEqual(Array(5));
	});
	it('should throw if releasing an unknown a connection', () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		function attemptRelease() {
			pool.release({});
		}
		expect(attemptRelease).toThrow(Error);
	});
	it('should know if pool owns a connection', async () => {
		const pool = new ConnectionPool({ connectionLimit: 5 });
		const conn = await pool.acquire();
		expect(pool.owns(conn)).toBe(true);
		expect(pool.owns({})).toBe(false);
	});
	it('should call onIdle', done => {
		expect.assertions(1);
		const onIdle = jest.fn();
		const pool = new ConnectionPool({ timeout: 3 }, { onIdle });
		setTimeout(() => {
			expect(onIdle).toHaveBeenCalledWith(pool);
			done();
		}, 3200);
	});
});
