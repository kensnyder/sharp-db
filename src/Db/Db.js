const forOwn = require('lodash.forown');
const mysql = require('mysql2');

/**
 * A list of all the Db Instances that have been created
 * @type {Array}
 */
const instances = [];

/**
 * Simple database class for mysql
 */
class Db {
	/**
	 * Connection options including host, login, password, encoding, database
	 * @param {Object} config  Configuration object
	 */
	constructor(config = {}) {
		const env =
			typeof process === 'object' && typeof process.env === 'object'
				? process.env
				: {};
		/**
		 * The config used for this instance
		 * @type {Object}
		 */
		this.config = {
			...config,
			host: config.host || env.DB_HOST || '127.0.0.1',
			user: config.user || env.DB_USER || 'root',
			password: config.password || env.DB_PASSWORD || '',
			database: config.database || env.DB_DATABASE || undefined,
			port: config.port || env.DB_PORT || 3306,
			charset: config.charset || env.DB_CHARSET || 'utf8mb4',
		};
		instances.push(this);
	}

	/**
	 * Create a new QuickDb instance or return the last used one
	 * @param {Object} [config]  In the format required by mysql js
	 * @return {Db}
	 */
	static factory(config = {}) {
		if (instances.length === 0) {
			return new Db(config);
		}
		return instances[instances.length - 1];
	}

	/**
	 * Make a new connection to MySQL
	 */
	connect() {
		/**
		 * The mysql2 library connection object
		 * @type {Object}
		 */
		this.connection = mysql.createConnection(this.config);
		this.connection.connect(err => {
			if (err && err.fatal) {
				throw new Error(`[${err.code}] ${err.sqlMessage}`);
			}
		});
	}

	/**
	 * Make a new connection to MySQL if not already connected
	 */
	connectOnce() {
		if (!this.connection) {
			this.connect();
		}
	}

	/**
	 * Close this connection to the database
	 * @return {Promise}  Resolves when connection has been closed
	 */
	end() {
		return new Promise((resolve, reject) => {
			if (this.connection && this.connection.end) {
				this.connection.end(err => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			} else {
				resolve();
			}
		});
	}

	/**
	 * Destroy the connection to the database
	 * @return {Db}
	 */
	destroy() {
		if (this.connection && this.connection.destroy) {
			this.connection.destroy();
		}
		return this;
	}

	/**
	 * Close all connections to the database
	 * @return {Promise}  Resolves when all connections have been closed
	 */
	static endAll() {
		return Promise.all(instances.map(db => db.end()));
	}

	/**
	 * Destroy all connections to the database
	 * @return {Db}
	 */
	static destroyAll() {
		instances.forEach(db => db.destroy());
		return Db;
	}

	/**
	 * Run a statement of any type
	 * @param {String|Object} sql  The sql to run
	 * @param {*} ...bindVars  Values to bind to the sql placeholders
	 * @returns {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result rows
	 * @property {Object[]} fields  Info about the selected fields
	 */
	query(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					resolve({ query, results, fields });
				}
			});
		});
	}

	/**
	 * Run multiple statements separated by semicolon
	 * @param {String|Object} sql  The sql to run
	 * @param {*} ...bindVars Values to bind to the sql placeholders
	 * @returns {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  One element for every statement in the query
	 * @property {Object[]} fields  Info about the selected fields
	 */
	multiQuery(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		options.multipleStatements = true;
		return this.query(options);
	}

	/**
	 * Return result rows for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result rows
	 * @property {Object[]} fields  Info about the selected fields
	 */
	select(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					resolve({ query, results, fields });
				}
			});
		});
	}

	/**
	 * Return result array as col1 => col2 pairs for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object} results  The result object with key-value pairs
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectHash(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					const key = fields[0].name;
					const val = fields[1].name;
					const hash = {};
					results.forEach(result => {
						hash[result[key]] = result[val];
					});
					resolve({
						query,
						results: hash,
						fields,
					});
				}
			});
		});
	}

	/**
	 * Return result array as col1 for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result list
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectList(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					const name = fields[0].name;
					const list = results.map(result => result[name]);
					resolve({
						query,
						results: list,
						fields,
					});
				}
			});
		});
	}

	/**
	 * Return records all grouped by one of the column's values
	 * @param {String} groupField  The name of the field to group by
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object} results  Result rows grouped by groupField
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectGrouped(groupField, sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					const groups = {};
					results.forEach(result => {
						if (!groups[result[groupField]]) {
							groups[result[groupField]] = [];
						}
						groups[result[groupField]].push(result);
					});
					resolve({
						query,
						results: groups,
						fields,
					});
				}
			});
		});
	}

	/**
	 * Return records all indexed by one of the column's values
	 * @param {String} indexField  The name of the field to index by
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object} results  The results indexed by indexField
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectIndexed(indexField, sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					const hash = {};
					results.forEach(result => {
						hash[result[indexField]] = result;
					});
					resolve({
						query,
						results: hash,
						fields,
					});
				}
			});
		});
	}

	/**
	 * Return first result row for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object|undefined} results  The result row or undefined
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectFirst(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						query,
						results: results[0],
						fields,
					});
				}
			});
		});
	}

	/**
	 * Return first column value for the first result row for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {*} results  The value returned in the first field of the first row
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectValue(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					let value = undefined;
					if (results.length > 0) {
						const name = fields[0].name;
						value = results[0][name];
					}
					resolve({
						query,
						results: value,
						fields,
					});
				}
			});
		});
	}

	/**
	 * Run the given SELECT statement wrapped in a SELECT EXISTS query
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Boolean} results  True if any records match query
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectExists(sql, ...bindVars) {
		const options = this.bindArgs(sql, bindVars);
		options.sql = `SELECT EXISTS (${options.sql}) AS does_it_exist`;
		return this.selectValue(options).then(
			({ query, results, fields }) => {
				return {
					query,
					results: Boolean(results),
					fields,
				};
			},
			err => err
		);
	}

	/**
	 * Run the given INSERT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} insertId  The id of the last inserted record
	 */
	insert(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						query,
						insertId: results.insertId,
						affectedRows: results.affectedRows,
						changedRows: results.changedRows,
					});
				}
			});
		});
	}

	/**
	 * Run the given UPDATE statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} changedRows  The number of rows affected by the statement
	 */
	update(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						query,
						affectedRows: results.affectedRows,
						changedRows: results.changedRows,
					});
				}
			});
		});
	}

	/**
	 * Run the given DELETE statement
	 * @param {String|Object} sql  The SQL to run
	 * @param {*} ...bindVars The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} changedRows  The number of rows affected by the statement
	 */
	delete(sql, ...bindVars) {
		return this.update(sql, ...bindVars);
	}

	/**
	 * Build a SELECT statement and return result rows
	 * @param {String} table  The name of the table
	 * @param {Array} fields  An array of field names to select
	 * @param {Object} criteria  Params to construct the WHERE clause
	 * @param {String} extra  Additional raw SQL such as GROUP BY, ORDER BY, or LIMIT
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result rows
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectFrom(table, fields = [], criteria = {}, extra = '') {
		if (!Array.isArray(fields)) {
			throw new Error('Db.selectFrom fields must be an array');
		}
		if (typeof criteria !== 'object') {
			throw new Error('Db.selectFrom criteria must be an array');
		}
		this.connectOnce();
		const escFields = fields.map(field => this.quote(field));
		const escFieldsString = fields.length ? escFields.join(', ') : '*';
		const escTable = this.quote(table);
		const escWhere = this.buildWheres(criteria) || '1';
		const sql = `SELECT ${escFieldsString} FROM ${escTable} WHERE ${escWhere} ${extra}`.trim();
		return this.select(sql);
	}

	/**
	 * Select the record with the given UUID
	 * @param {String} table  The name of the table from which to select
	 * @param {String} column  The name of the column from which to select
	 * @param {String} value  The value of the record for that column
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object|undefined} results  The result row or undefined
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectByKey(table, column, value) {
		const escTable = this.quote(table);
		const escColumn = this.quote(column);
		return this.selectFirst(
			`SELECT * FROM ${escTable} WHERE ${escColumn} = ?`,
			value
		);
	}

	/**
	 * Select the record with the given id
	 * @param {String} table  The name of the table from which to select
	 * @param {String} id  The value of the id column
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object|undefined} results  The result row or undefined
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectId(table, id) {
		return this.selectByKey(table, 'id', id);
	}

	/**
	 * Select the record with the given UUID
	 * @param {String} table  The name of the table from which to select
	 * @param {String} uuid  The value of the uuid column
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object|undefined} results  The result row or undefined
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectUuid(table, uuid) {
		return this.selectByKey(table, 'uuid', uuid);
	}

	/**
	 * Find a record or add a new one
	 * @param {String} table  The name of the table from which to select
	 * @param {Object} criteria  Criteria by which to find the row
	 * @param {Object} newValues  The values to use to insert if the record doesn't exist
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object|undefined} results  The result row or undefined
	 * @property {Object[]} fields  Info about the selected fields
	 * @property {Number} insertId  The id of the last inserted record
	 */
	selectOrCreate(table, criteria, newValues = {}) {
		return this.selectFrom(table, [], criteria).then(
			({ query, results, fields }) => {
				if (results.length > 0) {
					return {
						query,
						results: results[0],
						fields,
					};
				} else {
					return this.insertInto(table, newValues);
				}
			},
			err => err
		);
	}

	/**
	 * Build an INSERT statement and run it
	 * @param {String} table  The name of the table
	 * @param {Object} insert  column-value pairs to insert
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} insertId  The id of the last inserted record
	 */
	insertInto(table, insert) {
		// build insert expression
		const sets = [];
		forOwn(insert, (value, field) => {
			sets.push(this.quote(field) + '=' + mysql.escape(value));
		});
		if (sets.length === 0) {
			throw new Error('Db.insertInto requires a non-empty insert Object');
		}
		const escTable = this.quote(table);
		const setSql = sets.join(', ');
		const insertSql = `INSERT INTO ${escTable} SET ${setSql}`;
		return this.insert(insertSql);
	}

	/**
	 * Run an "INSERT INTO ... ON DUPLICATE KEY UPDATE" query where
	 * if a key conflicts, update the given fields
	 * @param {String} table  The name of the table
	 * @param {Object} insert  An array with column => value pairs for insertion
	 * @param {Object} update  An array with column => value pairs for update
	 * @return {Promise<Object>}
	 * @property {Number} insertId  The id of the last inserted or updated record
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} changedRows  The number of rows affected by the statement
	 */
	insertIntoOnDuplicateKeyUpdate(table, insert, update) {
		this.connectOnce();
		// build insert expression
		const sets = [];
		forOwn(insert, (value, field) => {
			sets.push(this.quote(field) + '=' + mysql.escape(value));
		});
		if (sets.length === 0) {
			throw new Error(
				'Db.insertIntoOnDuplicateKeyUpdate requires a non-empty insert Object'
			);
		}
		// build update expression
		const updates = [];
		forOwn(update, (value, field) => {
			updates.push(this.quote(field) + '=' + mysql.escape(value));
		});
		if (updates.length === 0) {
			throw new Error(
				'Db.insertIntoOnDuplicateKeyUpdate requires a non-empty update Object'
			);
		}
		table = this.quote(table);
		const setSql = sets.join(', ');
		const updateSql = updates.join(', ');
		// combine
		const sql = `INSERT INTO ${table} SET ${setSql} ON DUPLICATE KEY UPDATE ${updateSql}`;
		// run
		return new Promise((resolve, reject) => {
			const query = this.connection.query(sql, (error, results) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						query,
						insertId: results.insertId,
						affectedRows: results.affectedRows,
						changedRows: results.changedRows,
					});
				}
			});
		});
	}

	/**
	 * Build an INSERT statement and run it
	 * @param {String} table  The name of the table
	 * @param {Array} inserts  list of column-value pairs to insert
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} insertId  The id of the last inserted record
	 */
	insertExtended(table, inserts) {
		// build insert expression
		if (!Array.isArray(inserts) || inserts.length === 0) {
			throw new Error('Db.insertExtended inserts must be a non-empty array');
		}
		const fields = [];
		forOwn(inserts[0], (value, field) => {
			fields.push(this.quote(field));
		});
		const batches = [];
		inserts.forEach(insert => {
			const values = [];
			forOwn(insert, value => {
				values.push(this.escape(value));
			});
			batches.push('(' + values.join(', ') + ')');
		});
		const escTable = this.quote(table);
		const fieldsSql = fields.join(', ');
		const batchesSql = batches.join(', ');
		const insertSql = `INSERT INTO ${escTable} (${fieldsSql}) VALUES ${batchesSql}`;
		return this.insert(insertSql);
	}

	/**
	 * Build an UPDATE statement and run it
	 * @param {String} table  The name of the table
	 * @param {Object} set  An array of column => value pairs to update
	 * @param {Object} where  Params to construct the WHERE clause
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} changedRows  The number of rows affected by the statement
	 */
	updateTable(table, set, where = {}) {
		this.connectOnce();
		const sets = [];
		forOwn(set, (value, field) => {
			sets.push(this.quote(field) + '=' + this.escape(value));
		});
		if (sets.length === 0) {
			throw new Error('Db.updateTable requires a non-empty set Object');
		}
		const escTable = this.quote(table);
		const setSql = sets.join(', ');
		const escWhere = this.buildWheres(where);
		const sql = `UPDATE ${escTable} SET ${setSql} WHERE ${escWhere}`;
		return this.update(sql, set);
	}

	/**
	 * Construct a delete query and run
	 * @param {String} table  The name of the table from which to delete
	 * @param {Object} where  WHERE conditions on which to delete
	 * @param {Number} limit  Limit deletion to this many records
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} changedRows  The number of rows affected by the statement
	 */
	deleteFrom(table, where, limit = null) {
		this.connectOnce();
		const escTable = this.quote(table);
		const escWhere = this.buildWheres(where);
		let sql = `DELETE FROM ${escTable} WHERE ${escWhere}`;
		if (limit > 0) {
			sql += ` LIMIT ${limit}`;
		}
		return this.delete(sql);
	}

	/**
	 * Build a where clause from an object of field-value pairs
	 * @param {Object} wheres  An object with field-value pairs (field may be field space operator)
	 * @return {String}
	 */
	buildWheres(wheres) {
		const clauses = [];
		for (const field in wheres) {
			if (!wheres.hasOwnProperty(field)) {
				continue;
			}
			clauses.push(this.buildWhere(field, wheres[field]));
		}
		return clauses.length ? clauses.join(' AND ') : '1';
	}

	/**
	 * Construct where clause element from the given field and value
	 * @param {String} field  The field or field space operator
	 * @param {*} value  The value to bind
	 * @return {String}
	 * @example
	 * db.buildWhere('start_date BETWEEN', ['2012-01-01','2013-01-01']);
	 * db.buildWhere('start_date >', '2013-01-01');
	 * db.buildWhere('start_date !=', '2013-01-01');
	 * db.buildWhere('start_date', null); // `start_date` IS NULL
	 * db.buildWhere('start_date !=', null); // `start_date` IS NOT NULL
	 * db.buildWhere('id', [1,2,3]); // `id` IN (1,2,3)
	 * db.buildWhere('id !=', [1,2,3]); // `id` NOT IN (1,2,3)
	 * db.buildWhere('id IN', [1,2,3]); // `id` IN (1,2,3)
	 * db.buildWhere('id NOT IN', [1,2,3]); // `id` NOT IN (1,2,3)
	 */
	buildWhere(field, value = undefined) {
		if (value === undefined) {
			return field;
		}
		let [name, operator] = field.split(/\s+/);
		name = this.quote(name);
		operator = operator ? operator.toUpperCase() : '=';
		if (operator === 'BETWEEN') {
			const val0 = mysql.escape(value[0]);
			const val1 = mysql.escape(value[1]);
			return `${name} BETWEEN ${val0} AND ${val1}`;
		} else if (value === null) {
			return operator === '=' ? `${name} IS NULL` : `${name} IS NOT NULL`;
		} else if (Array.isArray(value)) {
			const values = value.map(val => mysql.escape(val));
			return operator === '=' || operator === 'IN'
				? `${name} IN(${values})`
				: `${name} NOT IN(${values})`;
		}
		const escVal = mysql.escape(value);
		return `${name} ${operator} ${escVal}`;
	}

	/**
	 * Bind an array of arguments to a query
	 * @param {String|Object} sql  The base SQL query
	 * @param {Array} args  An array of values to bind
	 * @return {String}
	 * @example
	 * db.select('SELECT * FROM users WHERE id = ?', 100);
	 * db.bindArgs(array('SELECT * FROM users WHERE id = ?', 100)); // SELECT * FROM users WHERE id = '100'
	 * db.select('SELECT * FROM users WHERE id = :id', array('id'=>100));
	 * db.bindArgs(array('SELECT * FROM users WHERE id = :id', array('id'=>100))); // SELECT * FROM users WHERE id = '100'
	 */
	bindArgs(sql, args) {
		const options = typeof sql == 'object' ? sql : { sql };
		if (typeof options.sql !== 'string') {
			options.sql = '';
		}
		if (!Array.isArray(args)) {
			args = [];
		}
		if (Array.isArray(sql.values)) {
			args = sql.values.concat(args);
		} else if (sql.values) {
			args = [sql.values].concat(args);
		}
		options.values = undefined;
		args.forEach(arg => {
			if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
				options.sql = options.sql.replace(/:([\w_]+)/g, ($0, $1) => {
					if (arg.hasOwnProperty($1)) {
						return mysql.escape(arg[$1]);
					}
					return $0;
				});
			} else {
				options.sql = options.sql.replace('?', mysql.escape(arg));
			}
		});
		return options;
	}

	/**
	 * Escape a value for use in a raw query and surround with apostrophes
	 * @param {*} value  The value to escape
	 * @return {String}
	 */
	escape(value) {
		return mysql.escape(value);
	}

	/**
	 * Escape a value for use in a raw query without apostrophes
	 * @param {*} value  The value to escape
	 * @return {String}
	 */
	escapeQuoteless(value) {
		return mysql.escape(value).slice(1, -1);
	}

	/**
	 * Escape an identifier such as a table or column
	 * @param identifier
	 * @return {*}
	 */
	quote(identifier) {
		if (identifier === '*') {
			return identifier;
		}
		if (/[`()]/.test(identifier)) {
			return identifier;
		}
		let quoted = mysql.escapeId(identifier);
		if (/\.`\*`$/.test(quoted)) {
			quoted.slice(0, -3) + '*';
		}
		return quoted;
	}

	/**
	 * Return an object with query methods to run on template literals
	 * (backticked strings) where interpolated strings are automatically escaped
	 * @example
	 * const { select, selectValue } = Db.factory().tpl();
	 * const users = await select`SELECT * FROM users WHERE id IN(${userIds})`;
	 * const count = await selectValue`SELECT COUNT(*) FROM users WHERE is_active = ${isActive}`;
	 * @return {Object}  Object with query methods
	 * @property {Function} select  Same as Db#select()
	 * @property {Function} selectFirst  Same as Db#selectFirst()
	 * @property {Function} selectList  Same as Db#selectList()
	 * @property {Function} selectHash  Same as Db#selectHash()
	 * @property {Function} selectValue  Same as Db#selectValue()
	 * @property {Function} insert  Same as Db#insert()
	 * @property {Function} update  Same as Db#update()
	 * @property {Function} delete  Same as Db#delete()
	 */
	tpl() {
		function toSql(templateData, variables) {
			let s = templateData[0];
			variables.forEach((variable, i) => {
				s += mysql.escape(variable);
				s += templateData[i + 1];
			});
			return s;
		}
		const supported = [
			'select',
			'selectFirst',
			'selectList',
			'selectHash',
			'selectValue',
			'insert',
			'update',
			'delete',
		];
		const functions = {};
		supported.forEach(name => {
			functions[name] = (templateData, ...variables) => {
				return this[name](toSql(templateData, variables));
			};
		});
		return functions;
	}
}

module.exports = Db;
