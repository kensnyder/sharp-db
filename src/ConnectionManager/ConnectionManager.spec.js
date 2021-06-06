const ConnectionManager = require('./ConnectionManager.js');

describe('ConnectionManager', () => {
	it('should allow acquisition', async () => {
		const mgr = new ConnectionManager();
		const conn = await mgr.acquire();
		expect(conn.query).toBeInstanceOf(Function);
		expect(conn.execute).toBeInstanceOf(Function);
	});
	it('should acquire from the same pool', async () => {
		const mgr = new ConnectionManager({
			connectionLimit: 3,
		});
		const conn1 = await mgr.acquire();
		const conn2 = await mgr.acquire();
		expect(mgr._pools).toHaveLength(1);
		expect(mgr._pools[0].available()).toBe(1);
	});
	it('should initialize a new pool if needed', async () => {
		const mgr = new ConnectionManager({
			connectionLimit: 2,
		});
		const conn1 = await mgr.acquire();
		const conn2 = await mgr.acquire();
		const conn3 = await mgr.acquire();
		expect(mgr._pools).toHaveLength(2);
		expect(mgr._pools[0]).not.toBe(mgr._pools[1]);
		expect(mgr._pools[0].isFull()).toBe(true);
		expect(mgr._pools[1].available()).toBe(1);
	});
	it('should release a connection', async () => {
		const mgr = new ConnectionManager();
		const conn1 = await mgr.acquire();
		mgr.release(conn1);
		expect(mgr._pools[0].isEmpty()).toBe(true);
	});
	it('should remove pool on idle', async () => {
		expect.assertions(2);
		const mgr = new ConnectionManager({
			connectionLimit: 2,
			timeout: 3,
		});
		const conn1 = await mgr.acquire();
		const conn2 = await mgr.acquire();
		const conn3 = await mgr.acquire();
		expect(mgr._pools).toHaveLength(2);
		mgr.release(conn3);
		await new Promise((resolve, reject) => {
			setTimeout(() => {
				expect(mgr._pools).toHaveLength(1);
				resolve();
			}, 1200);
		});
	});
});
