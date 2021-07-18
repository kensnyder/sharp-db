const ConnectionPoolManager = require('../ConnectionPoolManager/ConnectionPoolManager.js');
const ConnectionSingleManager = require('../ConnectionSingleManager/ConnectionSingleManager.js');

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
		if (config.connectionLimit > 1) {
			this._manager = new ConnectionPoolManager(config);
		} else {
			this._manager = new ConnectionSingleManager(config);
		}
	}

	/**
	 * Acquire a MySQL connection object from the manager
	 * @returns {Promise<Object>}
	 */
	acquire() {
		return this._manager.acquire();
	}

	/**
	 * Release the given handle
	 * @param {Object} handle  Connection returned from acquire()
	 * @returns {Boolean}  True if release was successful
	 * @throws {Error}  When release fails
	 */
	release(handle) {
		return this._manager.release(handle);
	}

	end() {
		return this._manager.end();
	}
	destroy() {
		return this._manager.destroy();
	}
}

module.exports = ConnectionManager;
