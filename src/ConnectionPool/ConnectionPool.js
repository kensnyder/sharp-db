const mysql = require('mysql2');

/**
 * Class to manage a pool returned from mysql.createPool().
 * It knows if it is full and executes a callback 2 seconds before the idle timeout
 */
class ConnectionPool {
	/**
	 * Pass ALL mysql connection parameters plus the following
	 * @param {Object} config
	 * @see https://github.com/mysqljs/mysql#connection-options
	 * @property {Number} [connectionLimit=10]
	 * @property {Number} [timeout=28800]  Number of seconds after which mysql times out
	 *    Can be obtained by running SHOW VARIABLES LIKE 'interactive_timeout';
	 * @param {Object} callbacks
	 * @property {Function} [onIdle]  Function to call 2 seconds before idle timeout
	 *   so that the instantiator can call ping() if desired
	 * @throws {Error}  If connectionLimit is not an integer
	 * @throws {Error}  If connectionLimit is less than 1
	 * @throws {Error}  If timeout is less than 3
	 * @throws {Error}  If onIdle is not a function
	 */
	constructor(
		{ connectionLimit = 10, timeout = 28800, ...config } = {},
		{ onIdle = () => {} } = {}
	) {
		if (
			typeof connectionLimit !== 'number' ||
			Math.round(connectionLimit) !== connectionLimit
		) {
			throw new Error('ConnectionPool connectionLimit must be an integer');
		}
		if (connectionLimit < 1) {
			throw new Error(
				'ConnectionPool connectionLimit must be greater than or equal to 1'
			);
		}
		if (timeout < 3) {
			throw new Error(
				'ConnectionPool timeout must be greater than or equal to 3 seconds'
			);
		}
		if (typeof onIdle !== 'function') {
			throw new Error('ConnectionPool onIdle must be a function');
		}
		/**
		 * A list of collection slots
		 * @type {Array}  Each item can be undefined or a MySQL connection object
		 * @private
		 */
		this._connections = Array(connectionLimit);

		/**
		 * A count of slots in use
		 * @type {Number}
		 * @private
		 */
		this._numUsed = 0;

		/**
		 * The MySQL pool object we are wrapping
		 * @type {Pool}
		 * @private
		 */
		this._pool = mysql.createPool({
			...config,
			waitForConnections: false,
			connectionLimit,
			queueLimit: 0,
		});

		/**
		 * The callback for onIdle
		 * @returns {*}
		 * @private
		 */
		this._onIdle = () => onIdle(this);
		/**
		 * The onIdle timeout returned from setTimeout()
		 * @see SHOW VARIABLES LIKE 'interactive_timeout'; // 28800 (8 hours)
		 * @type {Number}
		 * @private
		 */
		this._timeout = Math.round(timeout - 2) * 1000; // give 2 seconds to keep connection alive
		this._startIdleTimer();
	}

	/**
	 * Start the timeout timer
	 * @private
	 */
	_startIdleTimer() {
		clearTimeout(this._timer);
		/**
		 * A handle to the timeout function
		 * @type {Number}
		 * @private
		 */
		this._timer = setTimeout(this._onIdle, this._timeout);
	}

	/**
	 * Get the max number of connections
	 * @returns {Number}
	 */
	size() {
		return this._connections.length;
	}

	/**
	 * Get the number of connections that are unused
	 * @returns {Number}
	 */
	available() {
		return this._connections.length - this._numUsed;
	}

	/**
	 * True if there are currently no connections
	 * @returns {Boolean}
	 */
	isEmpty() {
		return this._numUsed === 0;
	}

	/**
	 * True if all connection slots are in use
	 * @returns {boolean}
	 */
	isFull() {
		return this._connections.length === this._numUsed;
	}

	/**
	 * Grab a connection from an unused slot
	 * @returns {Promise<Object>}
	 * @throws {Error}  When there are no unused slots
	 */
	acquire() {
		if (this.isFull()) {
			throw new Error('Unable to acquire from a full pool');
		}
		this._numUsed++;
		return new Promise((resolve, reject) => {
			for (let i = 0, len = this._connections.length; i < len; i++) {
				if (!this._connections[i]) {
					this._initializeConnection(i, resolve, reject);
					break;
				}
			}
		});
	}

	/**
	 * Actually requisition a connection from the MySQL pool
	 * @param {Number} i  The index of the open slot
	 * @param {Function} resolve  Function to call when connection is ready
	 * @param {Function} reject  Function to call when there is an error requisitioning the connection
	 * @private
	 */
	_initializeConnection(i, resolve, reject) {
		this._pool.getConnection((err, conn) => {
			clearTimeout(this._timer);
			if (err) {
				reject(new Error('Unable to get connection from pool'));
			} else {
				this._startIdleTimer();
				this._connections[i] = conn;
				resolve(conn);
			}
		});
		this._connections[i] = {};
	}

	/**
	 * Release the MySQL connection and empty the slot
	 * @param {Object} conn  A MySQL connection object returned from this.acquire()
	 * @returns {Boolean}  True on success
	 * @throws {Error}  If connection was unrecognized
	 */
	release(conn) {
		for (let i = 0, len = this._connections.length; i < len; i++) {
			if (this._connections[i] === conn) {
				this._pool.releaseConnection(this._connections[i]);
				this._connections[i] = undefined;
				this._numUsed--;
				this._startIdleTimer();
				return true;
			}
		}
		throw new Error('ConnectionPool: Unable to release unknown connection');
	}

	/**
	 * Check to see if the given connection object is in a slot
	 * @param {Object} conn  The object to check
	 * @returns {Boolean}  True if we recognize that connection
	 */
	owns(conn) {
		for (const existingConn of this._connections) {
			if (existingConn === conn) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Ping one of the connections to keep pool alive
	 * @returns {Promise}  The error or result from conn.query()
	 */
	async ping() {
		this._startIdleTimer();
		const conn = await this.acquire();
		return new Promise((resolve, reject) => {
			conn.query('/* ping */ SELECT 1', (err, results) => {
				this.release(conn);
				if (err) {
					reject(err);
				} else {
					resolve(results);
				}
			});
		});
	}

	/**
	 * Close the entire connection pool
	 * @returns {Promise<String>}  The error string or empty string on success
	 */
	end() {
		return new Promise((resolve, reject) => {
			this._pool.end(err => {
				if (err) {
					reject(err);
				} else {
					resolve('');
				}
			});
		});
	}

	destroy() {}
}

module.exports = ConnectionPool;
