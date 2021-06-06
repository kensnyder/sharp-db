const ConnectionPool = require('../ConnectionPool/ConnectionPool.js');

/**
 * Manages an array of ConnectionPool objects
 */
class ConnectionManager {
	/**
	 * @param {Object} [config]  MySQL connection details such as host, login, password, encoding, database
	 * @see https://github.com/mysqljs/mysql#connection-options
	 */
	constructor(config = {}) {
		/**
		 * MySQL connection details
		 * @type {Object}
		 */
		this._config = config;
		/**
		 * The array of ConnectionPool objects
		 * @type {Object[]}
		 * @private
		 */
		this._pools = [];
	}

	/**
	 * Create a new ConnectionPool object and add it to _pools
	 * @returns {ConnectionPool}
	 * @private
	 */
	_initializeNewPool() {
		const pool = new ConnectionPool(this._config, {
			onIdle: this._onIdle.bind(this),
		});
		this._pools.push(pool);
		return pool;
	}

	/**
	 * The function to handle an idle pool.
	 * If it is the only pool, ping it to keep it alive.
	 * If there are other pools, let this one die.
	 * @param pool
	 * @private
	 */
	_onIdle(pool) {
		if (this._pools.length === 1) {
			// only pool; keep alive
			pool.ping();
		} else {
			// let pool expire if we have other working pools
			const idx = this._pools.indexOf(pool);
			if (idx > -1) {
				this._pools[idx].end();
				this._pools.splice(idx, 1);
			}
		}
	}

	/**
	 * Acquire a MySQL connection object from the first non-full ConnectionPool object
	 * @returns {Promise<Object>}
	 */
	acquire() {
		for (const pool of this._pools) {
			// acquire a connection from the first non-full pool
			if (!pool.isFull()) {
				return pool.acquire();
			}
		}
		// or if there are 0 pools or all pools are full, create a new one
		const newPool = this._initializeNewPool();
		return newPool.acquire();
	}

	/**
	 * Release the given MySQL connection object
	 * @param {Object} conn  Connection returned from acquire()
	 * @returns {Boolean}  True if release was successful
	 * @throws {Error}  When the given object is not from any pool
	 */
	release(conn) {
		for (const pool of this._pools) {
			if (pool.owns(conn)) {
				pool.release(conn);
				return true;
			}
		}
		throw new Error('ConnectionManager: Unable to release unknown connection');
	}
}

module.exports = ConnectionManager;
