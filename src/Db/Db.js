import mysql from 'mysql';

/**
 * Simple database class for mysql
 */
export class Db {
	/**
	 * Connection options including host, login, password, encoding, database
	 * @param {Object} config  Configuration object
	 */
	constructor(config = {}) {
		const env =
			typeof process === 'object' && typeof process.env === 'object'
				? process.env
				: {};
		this.config = {
			host: config.hostname || env.DB_HOSTNAME || '127.0.0.1',
			user: config.username || env.DB_USERNAME || 'root',
			password: config.password || env.DB_PASSWORD || '',
			database: config.database || env.DB_DATABASE || 'platform',
			port: config.port || env.DB_PORT || 3306,
			encoding: config.encoding || env.DB_ENCODING || 'utf-8',
		};
	}

	/**
	 * Create a new QuickDb instance or return the last used one
	 * @param {Object} [config]  In the format required by mysql js
	 * @return {Db}
	 */
	static factory(config = {}) {
		if (!Db.instance) {
			Db.instance = new Db(config);
		}
		return Db.instance;
	}

	/**
	 * Make a new connection to MySQL
	 */
	connect() {
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

	// /**
	//  * Run a list of semicolon-delimited queries
	//  * @see https://www.npmjs.com/package/mysql#multiple-statement-queries
	//  * @param {String} sql
	//  * @param int|string $bindVar1  The value to bind to the first question mark
	//  * @param int|string $bindVarN  The value to bind to the nth question mark
	//  * @return {Array}|bool
	//  */
	// multiQuery(/*$sql, $bindVar1, $bindVarN*/) {
	// 	if (!$this->_connectOnce()) {
	// 		return false;
	// 	}
	// 	$sql = $this->bindArgs(func_get_args());
	// 	$ok = mysqli_multi_query($this->_dbh, $sql);
	// 	if (!$ok) {
	// 		return false;
	// 	}
	// 	$fetch = "mysqli_fetch_$this->fetchMode";
	// 	$resultSets = [];
	// 	while(1) {
	// 		/* get first result set */
	// 		$resultSet = [];
	// 		if (($result = mysqli_store_result($this->_dbh))) {
	// 			while (($row = $fetch($result))) {
	// 				$resultSet[] = $row;
	// 			}
	// 			mysqli_free_result($result);
	// 		}
	// 		$resultSets[] = $resultSet;
	// 		if (!mysqli_next_result($this->_dbh)) {
	// 			break;
	// 		}
	// 	}
	// 	return $resultSets;
	// }

	/**
	 * Return result rows for the given SELECT statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Object[]>}
	 */
	select(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(
				options,
				(error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						this.lastFields = fields;
						resolve(results);
					}
				}
			);
		});
	}

	/**
	 * Return result array as col1 => col2 pairs for the given SELECT statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 */
	selectHash(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(
				options,
				bindVars,
				(error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						this.lastFields = fields;
						const key = fields[0].name;
						const val = fields[1].name;
						const hash = {};
						results.forEach(result => {
							hash[result[key]] = result[val];
						});
						resolve(hash);
					}
				}
			);
		});
	}

	/**
	 * Return result array as col1 => col2 pairs for the given SELECT statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 */
	selectList(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(
				options,
				(error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						this.lastFields = fields;
						const name = fields[0].name;
						const list = [];
						results.forEach(result => list.push(result[name]));
						resolve(list);
					}
				}
			);
		});
	}

	/**
	 * Return records all grouped by one of the column's values
	 * @param {String} groupField  The name of the field to group by
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Array>}
	 */
	selectGrouped(groupField, sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(
				options,
				(error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						this.lastFields = fields;
						const hash = {};
						results.forEach(result => {
							if (!hash[result[groupField]]) {
								hash[result[groupField]] = [];
							}
							hash[result[groupField]].push(result);
						});
						resolve(hash);
					}
				}
			);
		});
	}

	/**
	 * Return records all indexed by one of the column's values
	 * @param {String} indexField  The name of the field to index by
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Array>}
	 */
	selectIndexed(indexField, sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(
				options,
				(error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						this.lastFields = fields;
						const hash = {};
						results.forEach(result => {
							hash[result[indexField]] = result;
						});
						resolve(hash);
					}
				}
			);
		});
	}

	/**
	 * Return first result row for the given SELECT statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Object>}
	 */
	selectFirst(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(
				options,
				(error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						this.lastFields = fields;
						resolve(results[0]);
					}
				}
			);
		});
	}

	/**
	 * Return first column value for the first result row for the given SELECT statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Number|String>}
	 */
	selectValue(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(
				options,
				(error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						this.lastFields = fields;
						const name = fields[0].name;
						resolve(results[0][name]);
					}
				}
			);
		});
	}

	/**
	 * Run the given SELECT statement wrapped in a SELECT EXISTS query
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Boolean>}  True if it exists, false otherwise
	 */
	selectExists(sql, ...bindVars) {
		const options = this.bindArgs(sql, bindVars);
		options.sql = `SELECT EXISTS (${options.sql}) AS does_it_exist`;
		return this.selectValue(options).then(Boolean);
	}

	/**
	 * Run the given INSERT statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Number>}  The id of the last inserted record
	 */
	insert(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(options, (error, results) => {
				if (error) {
					reject(error);
				} else {
					resolve(results.insertId);
				}
			});
		});
	}

	/**
	 * Run the given UPDATE statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Number>}  The number of rows affected by the statement
	 */
	update(sql, ...bindVars) {
		this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			this.lastQuery = this.connection.query(options, (error, results) => {
				if (error) {
					reject(error);
				} else {
					resolve(results.changedRows);
				}
			});
		});
	}

	/**
	 * Run the given DELETE statement
	 * @param {String} sql  The SQL to run
	 * @param {...*} bindVars  The values to bind to the each question mark or named binding
	 * @return {Promise<Array>}
	 */
	delete(sql, ...bindVars) {
		return this.update(sql, ...bindVars);
	}

	/**
	 * Build a SELECT statement and return result rows
	 * @param {String} table  The name of the table
	 * @param {Array} fields  An array of field names to select
	 * @param {Object} params  Params to construct the WHERE clause
	 * @param {String} extra  Additional raw SQL such as GROUP BY, ORDER BY, or LIMIT
	 * @return {Promise<Array>}  The result rows
	 */
	selectFrom(table, fields = [], params = {}, extra = '') {
		this.connectOnce();
		const escFields = fields.map(field => mysql.escapeId(field));
		const escFieldsString = fields.length ? escFields.join(', ') : '*';
		const escTable = mysql.escapeId(table);
		const escWhere = this.buildWheres(params) || '1';
		const sql = `SELECT ${escFieldsString} FROM ${escTable} WHERE ${escWhere} ${extra}`.trim();
		return this.select(sql);
	}

	/**
	 * Select the record with the given id
	 * @param {String} table  The name of the table from which to select
	 * @param {String} id  The value of the id column
	 * @return {Promise<Number>}
	 */
	selectId(table, id) {
		return this.selectRecordByKey(table, 'id', id);
	}

	/**
	 * Select the record with the given UUID
	 * @param {String} table  The name of the table from which to select
	 * @param {String} uuid  The value of the uuid column
	 * @return {Promise<String>}
	 */
	selectUuid(table, uuid) {
		return this.selectRecordByKey(table, 'uuid', uuid);
	}

	/**
	 * Select the record with the given UUID
	 * @param {String} table  The name of the table from which to select
	 * @param {String} column  The name of the column from which to select
	 * @param {String} value  The value of the record for that column
	 * @return {Promise<Object>}
	 */
	selectRecordByKey(table, column, value) {
		const escTable = mysql.escapeId(table);
		const escColumn = mysql.escapeId(column);
		return this.selectFirst(
			`SELECT * FROM ${escTable} WHERE ${escColumn} = ?`,
			value
		);
	}

	/**
	 * Find a record or add a new one
	 * @param {String} table  The name of the table from which to select
	 * @param {String} column  The name of the column from which to select
	 * @param {String} value  The value of the record for that column
	 * @param {Object} newValues  The values to use to insert if the record doesn't exist
	 * @return {Promise<Number>}  The existing id or the new id
	 */
	findIdOrCreate(table, column, value, newValues = {}) {
		const escTable = mysql.escapeId(table);
		const escColumn = mysql.escapeId(column);
		return this.selectFirst(
			`SELECT id FROM ${escTable} WHERE ${escColumn} = ?`,
			value
		).then(id => {
			if (id) {
				return id;
			}
			return this.insertInto(table, { [column]: value, ...newValues });
		});
	}

	/**
	 * Build an INSERT statement and run it
	 * @param {String} table  The name of the table
	 * @param {Object} values  column-value pairs to insert
	 * @return {Promise<Number>}  Id of the last inserted record
	 */
	insertInto(table, values) {
		this.connectOnce();
		return new Promise((resolve, reject) => {
			const escTable = mysql.escapeId(table);
			// see https://www.npmjs.com/package/mysql#escaping-query-values
			const sql = `INSERT INTO ${escTable} SET ?`;
			this.lastQuery = this.connection.query(sql, values, error => {
				if (error) {
					reject(error);
				} else {
					this.connection.query(
						'SELECT LAST_INSERT_ID() AS id',
						(insertError, insertResults) => {
							if (insertError) {
								reject(insertError);
							} else {
								resolve(insertResults[0].id);
							}
						}
					);
				}
			});
		});
	}

	/**
	 * Build an UPDATE statement and run it
	 * @param {String} table  The name of the table
	 * @param {Object} set  An array of column => value pairs to update
	 * @param {Object} where  Params to construct the WHERE clause
	 * @return {Promise<Number>}  Number of rows affected
	 */
	updateTable(table, set, where = {}) {
		this.connectOnce();
		const escTable = mysql.escapeId(table);
		const escWhere = this.buildWheres(where);
		const sql = `UPDATE ${escTable} SET ? WHERE ${escWhere}`;
		return this.select(sql, set);
	}

	/**
	 * Construct a delete query and run
	 * @param {String} table  The name of the table from which to delete
	 * @param {Object} where  WHERE conditions on which to delete
	 * @param {Number} limit  Limit deletion to this many records
	 * @return {Promise<Number>}  Number of affected rows
	 */
	deleteFrom(table, where, limit = null) {
		this.connectOnce();
		const escTable = mysql.escapeId(table);
		const escWhere = this.buildWheres(where);
		let sql = `DELETE FROM ${escTable} WHERE ${escWhere}`;
		if (limit > 0) {
			sql = `${sql}LIMIT ${limit}`;
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
	 * db.buildWhere('start_date BETWEEN', array('2012-01-01','2013-01-01'));
	 * db.buildWhere('start_date >', '2013-01-01');
	 * db.buildWhere('start_date !=', '2013-01-01');
	 * db.buildWhere('start_date', null); // `start_date` IS NULL
	 * db.buildWhere('start_date !=', null); // `start_date` IS NOT NULL
	 * db.buildWhere('id', array(1,2,3)); // id IN (1,2,3)
	 * db.buildWhere('id !=', array(1,2,3)); // id NOT IN (1,2,3)
	 */
	buildWhere(field, value) {
		let [name, operator] = field.split(' ');
		name = mysql.escapeId(name);
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
	 * @param {String} sql  The base SQL query
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
			return options;
		}
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
}
