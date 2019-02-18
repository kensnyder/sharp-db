// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function(modules, cache, entry, globalName) {
	// Save the require from previous bundle to this closure if any
	var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
	var nodeRequire = typeof require === 'function' && require;

	function newRequire(name, jumped) {
		if (!cache[name]) {
			if (!modules[name]) {
				// if we cannot find the module within our internal map or
				// cache jump to the current global require ie. the last bundle
				// that was added to the page.
				var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
				if (!jumped && currentRequire) {
					return currentRequire(name, true);
				}

				// If there are other bundles on this page the require from the
				// previous one is saved to 'previousRequire'. Repeat this as
				// many times as there are bundles until the module is found or
				// we exhaust the require chain.
				if (previousRequire) {
					return previousRequire(name, true);
				}

				// Try the node require function if it exists.
				if (nodeRequire && typeof name === 'string') {
					return nodeRequire(name);
				}

				var err = new Error("Cannot find module '" + name + "'");
				err.code = 'MODULE_NOT_FOUND';
				throw err;
			}

			localRequire.resolve = resolve;
			localRequire.cache = {};

			var module = (cache[name] = new newRequire.Module(name));

			modules[name][0].call(module.exports, localRequire, module, module.exports, this);
		}

		return cache[name].exports;

		function localRequire(x) {
			return newRequire(localRequire.resolve(x));
		}

		function resolve(x) {
			return modules[name][1][x] || x;
		}
	}

	function Module(moduleName) {
		this.id = moduleName;
		this.bundle = newRequire;
		this.exports = {};
	}

	newRequire.isParcelRequire = true;
	newRequire.Module = Module;
	newRequire.modules = modules;
	newRequire.cache = cache;
	newRequire.parent = previousRequire;
	newRequire.register = function(id, exports) {
		modules[id] = [
			function(require, module) {
				module.exports = exports;
			},
			{},
		];
	};

	for (var i = 0; i < entry.length; i++) {
		newRequire(entry[i]);
	}

	if (entry.length) {
		// Expose entry point to Node, AMD or browser globals
		// Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
		var mainExports = newRequire(entry[entry.length - 1]);

		// CommonJS
		if (typeof exports === 'object' && typeof module !== 'undefined') {
			module.exports = mainExports;

			// RequireJS
		} else if (typeof define === 'function' && define.amd) {
			define(function() {
				return mainExports;
			});

			// <script>
		} else if (globalName) {
			this[globalName] = mainExports;
		}
	}

	// Override the current require with this new one
	return newRequire;
})(
	{
		'Db/Db.js': [
			function(require, module, exports) {
				'use strict';

				Object.defineProperty(exports, '__esModule', {
					value: true,
				});
				exports.Db = void 0;

				var _mysql = _interopRequireDefault(require('mysql'));

				function _interopRequireDefault(obj) {
					return obj && obj.__esModule ? obj : { default: obj };
				}

				function _objectSpread(target) {
					for (var i = 1; i < arguments.length; i++) {
						var source = arguments[i] != null ? arguments[i] : {};
						var ownKeys = Object.keys(source);
						if (typeof Object.getOwnPropertySymbols === 'function') {
							ownKeys = ownKeys.concat(
								Object.getOwnPropertySymbols(source).filter(function(sym) {
									return Object.getOwnPropertyDescriptor(source, sym).enumerable;
								})
							);
						}
						ownKeys.forEach(function(key) {
							_defineProperty(target, key, source[key]);
						});
					}
					return target;
				}

				function _defineProperty(obj, key, value) {
					if (key in obj) {
						Object.defineProperty(obj, key, {
							value: value,
							enumerable: true,
							configurable: true,
							writable: true,
						});
					} else {
						obj[key] = value;
					}
					return obj;
				}

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
							typeof process === 'object' && typeof process.env === 'object' ? process.env : {};
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
						this.connection = _mysql.default.createConnection(this.config);
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
					} // /**
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
							this.lastQuery = this.connection.query(options, (error, results, fields) => {
								if (error) {
									reject(error);
								} else {
									this.lastFields = fields;
									resolve(results);
								}
							});
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
							this.lastQuery = this.connection.query(options, (error, results, fields) => {
								if (error) {
									reject(error);
								} else {
									this.lastFields = fields;
									const name = fields[0].name;
									const list = [];
									results.forEach(result => list.push(result[name]));
									resolve(list);
								}
							});
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
							this.lastQuery = this.connection.query(options, (error, results, fields) => {
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
							});
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
							this.lastQuery = this.connection.query(options, (error, results, fields) => {
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
							});
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
							this.lastQuery = this.connection.query(options, (error, results, fields) => {
								if (error) {
									reject(error);
								} else {
									this.lastFields = fields;
									resolve(results[0]);
								}
							});
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
							this.lastQuery = this.connection.query(options, (error, results, fields) => {
								if (error) {
									reject(error);
								} else {
									this.lastFields = fields;
									const name = fields[0].name;
									resolve(results[0][name]);
								}
							});
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
						const escFields = fields.map(field => _mysql.default.escapeId(field));
						const escFieldsString = fields.length ? escFields.join(', ') : '*';

						const escTable = _mysql.default.escapeId(table);

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
						const escTable = _mysql.default.escapeId(table);

						const escColumn = _mysql.default.escapeId(column);

						return this.selectFirst(`SELECT * FROM ${escTable} WHERE ${escColumn} = ?`, value);
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
						const escTable = _mysql.default.escapeId(table);

						const escColumn = _mysql.default.escapeId(column);

						return this.selectFirst(
							`SELECT id FROM ${escTable} WHERE ${escColumn} = ?`,
							value
						).then(id => {
							if (id) {
								return id;
							}

							return this.insertInto(
								table,
								_objectSpread(
									{
										[column]: value,
									},
									newValues
								)
							);
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
							const escTable = _mysql.default.escapeId(table); // see https://www.npmjs.com/package/mysql#escaping-query-values

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

						const escTable = _mysql.default.escapeId(table);

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

						const escTable = _mysql.default.escapeId(table);

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
						name = _mysql.default.escapeId(name);
						operator = operator ? operator.toUpperCase() : '=';

						if (operator === 'BETWEEN') {
							const val0 = _mysql.default.escape(value[0]);

							const val1 = _mysql.default.escape(value[1]);

							return `${name} BETWEEN ${val0} AND ${val1}`;
						} else if (value === null) {
							return operator === '=' ? `${name} IS NULL` : `${name} IS NOT NULL`;
						} else if (Array.isArray(value)) {
							const values = value.map(val => _mysql.default.escape(val));
							return operator === '=' || operator === 'IN'
								? `${name} IN(${values})`
								: `${name} NOT IN(${values})`;
						}

						const escVal = _mysql.default.escape(value);

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
						const options =
							typeof sql == 'object'
								? sql
								: {
										sql,
								  };

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
										return _mysql.default.escape(arg[$1]);
									}

									return $0;
								});
							} else {
								options.sql = options.sql.replace('?', _mysql.default.escape(arg));
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
						return _mysql.default.escape(value);
					}
					/**
					 * Escape a value for use in a raw query without apostrophes
					 * @param {*} value  The value to escape
					 * @return {String}
					 */

					escapeQuoteless(value) {
						return _mysql.default.escape(value).slice(1, -1);
					}
				}

				exports.Db = Db;
			},
			{},
		],
		'Parser/Parser.js': [
			function(require, module, exports) {
				'use strict';

				Object.defineProperty(exports, '__esModule', {
					value: true,
				});
				exports.Parser = void 0;

				var _lodash = _interopRequireDefault(require('lodash.capitalize'));

				var _lodash2 = _interopRequireDefault(require('lodash.trim'));

				function _interopRequireDefault(obj) {
					return obj && obj.__esModule ? obj : { default: obj };
				}

				/**
				 * Parse SQL and populate onto a Select query object
				 */
				class Parser {
					/**
					 * Create a new instance
					 * @param {Select} query  A Select object on which to build parsed conditions
					 */
					constructor(query) {
						this.query = query;
					}
					/**
					 * Strip single-line and multi-line comment blocks
					 * @param {String} sql  The SQL string
					 * @return {String}
					 */

					_stripComments(sql) {
						// multiline comments
						sql = sql.replace(/\/\*[\s\S]*?\*\//g, ''); // single line comments

						sql = sql.replace(/--([\r\n]|\s+[^\r\n]+[\r\n])/g, '');
						return sql;
					}
					/**
					 * Before splitting into SQL clauses, extract some regex-able subqueries
					 * @param {String} sql  The unparsed sql string
					 * @return {Object}  An array with new sql and subqueries
					 */

					_extractSubqueries(sql) {
						const subqueries = {};
						let i = 0;

						const extractor = $0 => {
							const placeholder = `'%SUBQUERY_${i++}'`;
							subqueries[placeholder] = $0;
							return placeholder;
						}; // subselect in FROM clause

						sql = sql.replace(/(s*SELECTs+.+)s+ASs+[^s,]+/, extractor); // IF() in FROM clause

						sql = sql.replace(/IF(.+)s+ASs+[^s,]+/, extractor);
						return {
							sql,
							subqueries,
						};
					}
					/**
					 * Inject column subqueries back into this object
					 * @param {Array} subqueries  The list of extracted subqueries
					 */

					_injectSubqueries(subqueries) {
						this.query._columns = this.query._columns.map(col => {
							return subqueries[col] || col;
						});
					}
					/**
					 * Split SQL into clauses (used by ::parse())
					 * @param {String} sql  The SQL to split
					 * @return {String[]}
					 */

					_split(sql) {
						const splitter = /\b(SELECT| TOP \d+| SQL_CALC_FOUND_ROWS|FROM|(?:INNER |LEFT OUTER |RIGHT OUTER |LEFT |RIGHT |CROSS |FULL |FULL OUTER )JOIN|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET)\b/i;
						return sql.split(splitter);
					}
					/**
					 * Get a QuickSelect object representing the given SQL SELECT statement
					 * @param {String} rawSql  The raw SQL for the SELECT statement
					 * @return {Boolean}
					 */

					parse(rawSql) {
						const stripped = this._stripComments(rawSql);

						let { sql, subqueries } = this._extractSubqueries(stripped);

						let exprs = this._split(sql);

						let expr;

						for (let i = 0, len = exprs.length; i < len; i++) {
							expr = exprs[i].trim();
							let upper = expr.toLocaleUpperCase();

							if (upper === 'SELECT') {
								i++;
								expr = exprs[i];
								upper = expr.toLocaleUpperCase();

								if (upper === 'SQL_CALC_FOUND_ROWS' || upper.slice(0, 3) === 'TOP') {
									this.query.options(expr);
									i++;
									expr = exprs[i];
								}

								let fragments = expr.split(/s*,s*/); // now handle parenthesis expressions that contain commas

								let buffer = '';
								fragments.forEach(fragment => {
									if (buffer.length) {
										// we are in the middle of an expression containing parenthesis
										buffer += fragment + ',';

										if (fragment.indexOf(')') > 0) {
											// we have an end parenthesis
											buffer = '';
										}
									} else if (fragment.match(/\([^)]+$/)) {
										buffer = fragment + ',';
									} else {
										const column = subqueries[fragment] || fragment;
										this.query.column(column.trim());
									}
								});
							} else if (upper === 'FROM') {
								i++;
								expr = exprs[i].trim();
								expr.split(/\s*,\s*/).forEach(table => this.query.table(table));
							} else if (upper.slice(-4) === 'JOIN') {
								i++;
								expr = exprs[i];

								switch (upper) {
									case 'JOIN':
									case 'INNER JOIN':
									default:
										this.query.innerJoin(expr);
										break;

									case 'LEFT JOIN':
										this.query.leftJoin(expr);
										break;

									case 'LEFT OUTER JOIN':
										this.query.leftOuterJoin(expr);
										break;

									case 'RIGHT JOIN':
										this.query.rightJoin(expr);
										break;

									case 'RIGHT OUTER JOIN':
										this.query.rightOuterJoin(expr);
										break;

									case 'CROSS JOIN':
										this.query.crossJoin(expr);
										break;

									case 'FULL JOIN':
										this.query.fullJoin(expr);
										break;

									case 'FULL OUTER JOIN':
										this.query.fullOuterJoin(expr);
										break;
								}
							} else if (upper === 'WHERE' || upper === 'HAVING') {
								this.handleConditions(upper, exprs[++i]);
							} else if (upper === 'GROUP BY' || upper === 'ORDER BY') {
								i++;
								let fn = upper.slice(0, 5).toLowerCase() + 'By';
								expr = exprs[i].trim();
								expr.split(/\s*,\s*/).forEach(this.query[fn].bind(this.query));
							} else if (upper === 'LIMIT' || upper === 'OFFSET') {
								i++;
								let fn = upper.toLowerCase();
								expr = exprs[i].trim();
								this.query[fn](expr);
							}
						}

						this._injectSubqueries(subqueries);

						return true;
					}
					/**
					 * Build a conditions list
					 * @param {String} type  Either WHERE or HAVING
					 * @param {String} clause  The expressions following the type keyword
					 */
					// handleConditions(type, clause) {
					// 	const chunks = clause.split(/\bOR\b/i);
					// 	const conditions = chunks.map(chunk => chunk.split(/\bAND\b/i).map(trim));
					// 	if (chunks.length === 1) {
					// 		// no OR operators
					// 		const fn = type.toLowerCase(); // either where or having
					// 		conditions[0].forEach(condition => this.query[fn](condition));
					// 	} else {
					// 		// some OR operators
					// 		const orFn = 'or' + capitalize(type); // either orWhere or orHaving
					// 		this.query[orFn](conditions);
					// 	}
					// }

					handleConditions(type, clause) {
						const andGroups = clause.split(/\bAND\b/i);
						andGroups.forEach(andGroup => {
							const orPieces = andGroup.split(/\bOR\b/i).map(_lodash2.default);

							if (orPieces.length === 1) {
								// no OR operators
								const fn = type.toLowerCase(); // either where or having

								this.query[fn](orPieces[0]);
							} else {
								// some OR operators
								const orFn = 'or' + (0, _lodash.default)(type); // either orWhere or orHaving

								this.query[orFn](orPieces);
							}
						});
					}
				}

				exports.Parser = Parser;
			},
			{},
		],
		'Select/Select.js': [
			function(require, module, exports) {
				'use strict';

				Object.defineProperty(exports, '__esModule', {
					value: true,
				});
				exports.Select = void 0;

				var _Parser = require('../Parser/Parser.js');

				var _Db = require('../Db/Db.js');

				var _lodash = _interopRequireDefault(require('lodash.clonedeep'));

				var _lodash2 = _interopRequireDefault(require('lodash.escaperegexp'));

				var _lodash3 = _interopRequireDefault(require('lodash.forown'));

				var _lodash4 = _interopRequireDefault(require('lodash.uniq'));

				var _quicklyCountSubstrings = _interopRequireDefault(require('quickly-count-substrings'));

				var _mysql = _interopRequireDefault(require('mysql'));

				function _interopRequireDefault(obj) {
					return obj && obj.__esModule ? obj : { default: obj };
				}

				/**
				 * Build a select query
				 * Class QuickSelect
				 */
				class Select {
					parse(sql) {
						this.reset();
						const parser = new _Parser.Parser(this);
						parser.parse(sql);
						return this;
					}

					static parse(sql) {
						return Select.init(_Db.Db.factory()).parse(sql);
					}
					/**
					 * QuickSelect constructor
					 */

					constructor(Db) {
						this.Db = Db;
						this.reset();
					}
					/**
					 * Shortcut to initialize without the `new` keyword
					 * @return {Select}
					 */

					static init(Db) {
						return new Select(Db);
					}
					/**
					 * Get the SQL as a pretty-printed string
					 * @return {String}
					 */

					toString() {
						const lines = [
							'SELECT',
							this._options.length ? `  ${this._options.join('\n  ')}` : null,
							this._columns.length ? `  ${this._columns.join(',\n  ')}` : '  *\n',
							`FROM ${this._tables.join(', ')}`,
							this._joins.length ? this._joins.join('\n') : null,
							this._wheres.length ? `WHERE ${this._wheres.join('\n  AND ')}` : null,
							this._groupBys.length ? `GROUP BY ${this._groupBys.join(',\n  ')}` : null,
							this._havings.length ? `HAVING ${this._havings.join('\n  AND ')}` : null,
							this._orderBys.length ? `ORDER BY ${this._orderBys.join(',\n  ')}` : null,
						];

						if (this._page > 0) {
							const offset = (this._page - 1) * this._limit;
							lines.push(`LIMIT ${this._limit}`);
							lines.push(`OFFSET ${offset}`);
						} else {
							if (this._limit > 0) {
								lines.push(`LIMIT ${this._limit}`);
							}

							if (this._offset > 0) {
								lines.push(`OFFSET ${this._offset}`);
							}
						}

						return lines
							.filter(Boolean)
							.join('\n')
							.trim();
					}
					/**
					 * Get the SQL as a one-line string
					 * @return {String}
					 */

					normalized() {
						const lines = [
							'SELECT',
							this._options.length ? this._options.join(' ') : null,
							this._columns.length ? this._columns.join(', ') : ' * ',
							`FROM ${this._tables.join(', ')} `,
							this._joins.length ? this._joins.join(' ') : null,
							this._wheres.length ? `WHERE ${this._wheres.join(' AND ')}` : null,
							this._groupBys.length ? `GROUP BY ${this._groupBys.join(', ')}` : null,
							this._havings.length ? `HAVING ${this._havings.join(' AND ')}` : null,
							this._orderBys.length ? `ORDER BY ${this._orderBys.join(', ')}` : null,
						];

						if (this._page > 0) {
							const offset = (this._page - 1) * this._limit;
							lines.push(`LIMIT ${this._limit}`);
							lines.push(`OFFSET ${offset}`);
						} else {
							if (this._limit > 0) {
								lines.push(`LIMIT ${this._limit}`);
							}

							if (this._offset > 0) {
								lines.push(`OFFSET ${this._offset}`);
							}
						}

						return lines
							.filter(Boolean)
							.join(' ')
							.trim();
					}
					/**
					 * @param {String|Array} [field]  If given, reset the given component(s), otherwise reset all query components
					 *     Valid components: option, column, table, where, orWhere, having, groupBy, orderBy, limit, offset, page
					 * @return {Select}
					 */

					reset(field = null) {
						if (Array.isArray(field)) {
							field.forEach(name => this.reset(name));
							return this;
						}

						if (field) {
							let prop = '_' + field.replace(/s$/, '');

							if (
								['option', 'column', 'table', 'where', 'having', 'groupBy', 'orderBy'].indexOf(
									field
								) > -1
							) {
								prop += 's';
							}

							this[prop] = ['limit', 'offset', 'page'].indexOf(field) > -1 ? null : [];
						} else {
							this._hasOne = [];
							this._belongsTo = [];
							this._hasMany = [];
							this._habtm = [];
							this._options = [];
							this._columns = [];
							this._tables = [];
							this._joins = [];
							this._wheres = [];
							this._havings = [];
							this._groupBys = [];
							this._orderBys = [];
							this._limit = null;
							this._offset = null;
							this._page = null;
							this._bound = [];
						}

						return this;
					} // 		/**
					// 		 * Internal function for defining a relationship for fetching dependent or related tate
					// 		 * @param {String} type  One of hasOne, hasMany, habtm
					// 		 * @param array $spec  The specification for the relationship
					// 		 * @return {Select}
					// 		 */
					// 		relate($type, $spec) {
					// 			if ($type == 'habtm' || $type == 'hasAndBelongsToMany') {
					// 				this.relationships[] = [
					// 					'key' => $spec['thisProperty'],
					// 					'type' => 'habtm',
					// 					'thisProperty' => @$spec['key'] ?: $spec['thisProperty'],
					// 					'options' => $spec
					// 			];
					// 			}
					// 			elseif ($type == 'hasOne') {
					// 				$spec['key'] = @$spec['key'] ?: preg_replace('/^\S+ as (\S+)$/i', '$1', $spec['thisProperty']);
					// 				$spec['type'] = 'hasOne';
					// 				this.relationships[] = $spec;
					// 			}
					// 		else {
					// 				$spec['key'] = @$spec['key'] ?: $spec['thisProperty'];
					// 				$spec['type'] = $type;
					// 				this.relationships[] = $spec;
					// 			}
					// 			return this;
					// 		}
					//
					// 		/**
					// 		 * Specify to fetch dependent data of the given type
					// 		 * @param {String} key  The name of the relationship as previously defined
					// 		 * @return {Select}
					// 		 */
					// 		contain($key) {
					// 			if ($key == 'ALL') {
					// 				foreach (this.relationships as $rel) {
					// 					this.{'_' . $rel['type']}[] = $rel;
					// 				}
					// 				return this;
					// 			}
					// 			foreach (this.relationships as $rel) {
					// 				if ($key == $rel['key']) {
					// 					this.{'_' . $rel['type']}[] = $rel;
					// 					return this;
					// 				}
					// 			}
					// //		QuickLogger::write('hasOne', pprt($key, this.relationships));
					// 			trigger_error("Unknown contain key `$key`", E_USER_WARNING);
					// 			return this;
					// 		}
					//

					hasOne(thisProperty, thatTableAndColumn) {
						this._hasOne.push({
							thisProperty,
							thatTableAndColumn,
						});

						return this;
					}

					belongsTo(thisProperty, thatTableAndColumn) {
						this._belongsTo.push({
							thisProperty,
							thatTableAndColumn,
						});

						return this;
					}

					hasMany(thisProperty, thatTableAndColumn) {
						this._hasMany.push({
							thisProperty,
							thatTableAndColumn,
						});

						return this;
					}

					habtm(thisProperty, idsColumn, join) {
						const matchJoinFirst = join.match(
							/(?:LEFT JOIN\s*)?(.+)\s+ON\s+\1\.id\s*=\s*(.+)\.(.+)/
						);
						const matchJoinSecond = join.match(
							/(?:LEFT JOIN\s*)?(.+)\s+ON\s+(.+)\.(.+)\s*=\s*\1\.id/
						);

						if (!matchJoinFirst && !matchJoinSecond) {
							throw new Error(
								`Select: Unknown join pattern: "${join}". Expecting format "joinTable ON joinTable.id = throughTable.foreignColumn"`
							);
						}

						let [_, joinTable, throughTable, foreignColumn] = matchJoinFirst || matchJoinSecond;

						this._habtm.push({
							thisProperty,
							idsColumn,
							join,
							joinTable,
							throughTable,
							foreignColumn,
						});

						return this;
					}

					hasAndBelongsToMany(thisProperty, idsColumn, join) {
						return this.habtm(thisProperty, idsColumn, join);
					}
					/**
					 * Bind values by name to the query
					 * @param {String} placeholder  The name of the placeholder
					 * @param mixed $value  The value to bind
					 * @example
					 *     query.bind('postId', 123); // replace :postId with '123'
					 * @return {Select}
					 */

					bind(placeholder, value = null) {
						if (typeof placeholder === 'object' && value === null) {
							(0, _lodash3.default)(placeholder, (val, field) => {
								this._bound[field] = val;
							});
							return this;
						}

						this._bound[placeholder] = value;
						return this;
					}
					/**
					 * Unbind a previously bound property
					 * @param {String} placeholder
					 * @return {Select}
					 */

					unbind(placeholder) {
						if (Array.isArray(placeholder)) {
							placeholder.forEach(p => this.unbind(p));
							return this;
						}

						this._bound[placeholder] = undefined;
						return this;
					}
					/**
					 * Fetch records and splice in related data
					 * @return {Promise<Array>}
					 */

					async fetch(options = {}) {
						options.sql = this.toString();
						const records = await _Db.Db.factory().select(options, this._bound);
						await this._spliceHasOnes(records);
						await this._spliceBelongsTos(records);
						await this._spliceHasManys(records);
						await this._spliceHabtms(records);
						return records;
					}
					/**
					 * Fetch the first matched record
					 * @return {Object|null}
					 */

					async fetchFirst() {
						this.limit(1);
						const records = await this.fetch();
						return Array.isArray(records) && records.length ? records[0] : null;
					}
					/**
					 * Fetch each record as an array of values or an array of key-value pairs
					 * @return {Promise<Object>}
					 */

					fetchHash() {
						return _Db.Db.factory().selectHash(this.toString(), this._bound);
					}
					/**
					 * Fetch the value of first column of the first record
					 * @return {Promise}
					 */

					fetchValue() {
						return _Db.Db.factory().selectValue(this.toString(), this._bound);
					}
					/**
					 * Fetch values and index by the given field name
					 * @param {String} byField  The field by which to index (e.g. id)
					 * @return {Promise<Object>}
					 */

					async fetchIndexed(byField) {
						const rs = await this.fetch();

						if (!Array.isArray(rs)) {
							return false;
						}

						const indexed = {};
						rs.forEach(r => (indexed[r[byField]] = r));
						return indexed;
					}
					/**
					 * Fetch values grouped by the given field name
					 * @param {String} byField  The field by which to group
					 * @example
					 *      $query = QuickSelect::parse('SELECT * FROM comments');
					 *      $byUser = query.fetchGrouped('user_id')
					 *      // a key for each user id with an array of comments for each key
					 * @return array|bool
					 */

					async fetchGrouped(byField) {
						const rs = await this.fetch();

						if (!Array.isArray(rs)) {
							return false;
						}

						const grouped = {};
						rs.forEach(r => {
							if (!grouped[r[byField]]) {
								grouped[r[byField]] = [];
							}

							grouped[r[byField]].push(r);
						});
						return grouped;
					}
					/**
					 * Clone this object
					 * @return {QuickSelect}
					 */

					getClone() {
						const copy = new Select();
						copy._hasOne = (0, _lodash.default)(this._hasOne);
						copy._belongsTo = (0, _lodash.default)(this._belongsTo);
						copy._hasMany = (0, _lodash.default)(this._hasMany);
						copy._habtm = (0, _lodash.default)(this._habtm);
						copy._options = (0, _lodash.default)(this._options);
						copy._columns = (0, _lodash.default)(this._columns);
						copy._tables = (0, _lodash.default)(this._tables);
						copy._joins = (0, _lodash.default)(this._joins);
						copy._wheres = (0, _lodash.default)(this._wheres);
						copy._havings = (0, _lodash.default)(this._havings);
						copy._groupBys = (0, _lodash.default)(this._groupBys);
						copy._orderBys = (0, _lodash.default)(this._orderBys);
						copy._limit = this._limit;
						copy._offset = this._offset;
						copy._page = this._page;
						copy._bound = (0, _lodash.default)(this._bound);
						return copy;
					}
					/**
					 * Build a version of this query that simply returns COUNT(*)
					 * @param {String} [countExpr="*"]  Use to specify `DISTINCT colname` if needed
					 * @return {String}  The SQL query
					 */

					getFoundRowsQuery(countExpr = '*') {
						if (this._havings.length === 0) {
							const query2 = this.getClone();
							query2._columns = [`COUNT(${countExpr}) AS foundRows`];
							query2._options = [];
							query2._groupBys = [];
							query2._orderBys = [];
							query2._limit = null;
							query2._offset = null;
							query2._page = null;
							return query2.toString();
						} else {
							const subquery = this.getClone();
							subquery._limit = null;
							subquery._offset = null;
							subquery._page = null;
							const subquerySql = subquery.toString().replace(/\n/g, '\n\t');
							const sql = `SELECT COUNT(*) AS foundRows FROM (\n\t${subquerySql}\n) AS subq`;
							return sql;
						}
					}
					/**
					 * Run a version of this query that simply returns COUNT(*)
					 * @param {String} [countExpr="*"]  Use to specify `DISTINCT colname` if needed
					 * @return {Promise<Number>}  The number of rows or false on error
					 */

					foundRows(countExpr = '*') {
						const sql = this.getFoundRowsQuery(countExpr);
						return _Db.Db.factory().selectValue(sql, this._bound);
					}
					/**
					 * Internal method to fetch hasOne dependent data and splice it into the given result set
					 * @param {Array} records  Records from .fetch()
					 */

					async _spliceHasOnes(records) {
						if (this._hasOne.length === 0 || records.length === 0) {
							return;
						}

						this._hasOne.forEach(async spec => {
							const match = spec.thisProperty.match(/^([\w_]+) AS ([\w_]+)$/i);
							let thisProperty;

							if (match) {
								thisProperty = match[2];
								spec.thisColumn = match[1];
							} else {
								thisProperty = spec.thisProperty.replace(/_id$/, '');
							}

							const [table, column] = spec.thatTableAndColumn.split('.');
							let ids = [];
							records.forEach(r => {
								if (r[spec.thisColumn]) {
									ids.push(r[spec.thisColumn]);
								}
							});

							if (ids.length === 0) {
								return;
							}

							ids = (0, _lodash4.default)(ids);
							const query = Select.init()
								.table(table)
								.where(column, 'IN', ids);
							const indexed = await query.fetchIndexed(column);
							records.forEach(r => {
								r[thisProperty] = indexed[r[spec.thisColumn]] || null;
							});
						});
					}
					/**
					 * Internal method to fetch belongTo dependent data and splice it into the given result set
					 * @param {Array} records  The records from fetch()
					 */

					async _spliceBelongsTos(records) {
						if (this._belongsTo.length === 0 || records.length === 0) {
							return;
						}

						const ids = (0, _lodash4.default)(records.map(r => r.id));

						this._belongsTo.forEach(async spec => {
							const [table, column] = spec.thatTableAndColumn.split('.');
							const indexed = await Select.init()
								.table(table)
								.where(column, 'IN', ids)
								.fetchIndexed(column);
							records.forEach(r => {
								r[spec.thisPropery] = indexed[r.id] || null;
							});
						});
					}
					/**
					 * Internal method to fetch hasMany dependent data and splice it into the given result set
					 * @param {Array} records  The records from fetch()
					 */

					async _spliceHasManys(records) {
						if (this._hasMany.length === 0 || records.length === 0) {
							return;
						}

						const ids = (0, _lodash4.default)(records.map(r => r.id));

						this._hasMany.forEach(async spec => {
							const [table, column] = spec.thatTableAndColumn.split('.');
							const query = Select.init()
								.table(table)
								.where(column, 'IN', ids);
							const grouped = await query.fetchGrouped(column);
							records.forEach(r => {
								r[spec.thisPropery] = grouped[r.id] || [];
							});
						});
					}
					/**
					 * Internal method to fetch habtm dependent data and splice it into the given result set
					 * @param {Array} records  The records from fetch()
					 * @example
					 * const query = Select.parse('SELECT * FROM users');
					 * query.habtm(
					 *   'hubs',
					 *   'SELECT user_id, client_id FROM clients_users WHERE user_id IN (?)',
					 *   'SELECT * FROM clients WHERE id IN(?)'
					 * );
					 */

					async _spliceHabtms(records) {
						if (this._habtm.length === 0 || records.length === 0) {
							return;
						}

						const ids = (0, _lodash4.default)(records.map(r => r.id));

						this._habtm.forEach(async spec => {
							// const { joinTableQuery, foreignTable } = spec;
							// const joinTableLookup = await Db.factory().selectGrouped('user_id', joinTableQuery, ids);
							// const foreignIds = uniq(values(joinTableLookup));
							// const foreignQuery = Select.init()
							// 	.table(foreignTable)
							// 	.where('id', 'IN', foreignIds);
							// const foreignRecords = await foreignQuery.fetchIndexed('id');
							// const { thisProperty, idsColumn, join, throughTable, subqueryHandler } = spec;
							// const subquery = Select.init()
							// 	.table(throughTable)
							// 	.leftJoin(join)
							// 	.where(`${throughTable}.${idsColumn}`, 'IN', ids);
							// if (subqueryHandler) {
							// 	subqueryHandler(subquery);
							// }
							// const grouped = await subquery.fetchIndexed(idsColumn);
							// records.forEach(r => {
							// 	r[thisProperty] = grouped[r.id] || [];
							// });
						});
					}
					/**
					 * Add an array of column names to fetch
					 * @param {String[]} columnNames  The names of columns
					 * @return {Select}
					 */

					columns(columnNames) {
						this._columns = [...this._columns, ...columnNames];
						return this;
					}
					/**
					 * Add a column name to fetch
					 * @param {String} columnName  The name of the column
					 * @return {Select}
					 */

					column(columnName) {
						this._columns.push(columnName);

						return this;
					}
					/**
					 * Add an option expression such as "TOP 10" or "SQL_CALC_FOUND_ROWS"
					 * @param {String} optionExpression  Expression to go after "SELECT" and before column list
					 * @return {Select}
					 */

					option(optionExpression) {
						this._options.push(optionExpression);

						return this;
					}
					/**
					 * Add a table to the "FROM" clause (same as .from())
					 * @param {String} tableName  The name of the table to query
					 * @return {Select}
					 */

					table(tableName) {
						this._tables.push(tableName);

						return this;
					}
					/**
					 * Add a table to the "FROM" clause (same as .table())
					 * @param {String} tableName  The name of the table to query
					 * @return {Select}
					 */

					from(tableName) {
						this._tables.push(tableName);

						return this;
					}
					/**
					 * Add an INNER JOIN expression (same as ->innerJoin())
					 * @param {String} expression  The expression following the INNER JOIN keyword
					 * @example query.join('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					join(expression) {
						this._joins.push(`INNER JOIN ${expression}`);

						return this;
					}
					/**
					 * Add a LEFT JOIN expression
					 * @param {String} expression  The expression following the LEFT JOIN keyword
					 * @example query.leftJoin('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					leftJoin(expression) {
						this._joins.push(`LEFT JOIN ${expression}`);

						return this;
					}
					/**
					 * Add a FULL JOIN expression
					 * @param {String} expression  The expression following the FULL JOIN keyword
					 * @example query.fullJoin('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					fullJoin(expression) {
						this._joins.push(`FULL JOIN ${expression}`);

						return this;
					}
					/**
					 * Add a RIGHT JOIN expression
					 * @param {String} expression  The expression following the RIGHT JOIN keyword
					 * @example query.rightJoin('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					rightJoin(expression) {
						this._joins.push(`RIGHT JOIN ${expression}`);

						return this;
					}
					/**
					 * Add a CROSS JOIN expression
					 * @param {String} expression  The expression following the CROSS JOIN keyword
					 * @example query.join('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					crossJoin(expression) {
						this._joins.push(`CROSS JOIN ${expression}`);

						return this;
					}
					/**
					 * Add an INNER JOIN expression (same as ->join())
					 * @param {String} expression  The expression following the INNER JOIN keyword
					 * @example query.innerJoin('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					innerJoin(expression) {
						this._joins.push(`INNER JOIN ${expression}`);

						return this;
					}
					/**
					 * Add a LEFT OUTER JOIN expression
					 * @param {String} expression  The expression following the LEFT OUTER JOIN keyword
					 * @example query.leftOuterJoin('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					leftOuterJoin(expression) {
						this._joins.push(`LEFT OUTER JOIN ${expression}`);

						return this;
					}
					/**
					 * Add a FULL OUTER JOIN expression
					 * @param {String} expression  The expression following the FULL OUTER JOIN keyword
					 * @example query.fullOuterJoin('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					fullOuterJoin(expression) {
						this._joins.push(`FULL OUTER JOIN ${expression}`);

						return this;
					}
					/**
					 * Add a RIGHT OUTER JOIN expression
					 * @param {String} expression  The expression following the RIGHT OUTER JOIN keyword
					 * @example query.rightOuterJoin('posts p ON p.id = c.post_id');
					 * @return {Select}
					 */

					rightOuterJoin(expression) {
						this._joins.push(`RIGHT OUTER JOIN ${expression}`);

						return this;
					}
					/**
					 * Remove a join condition with the specified table
					 * @param {String|String[]} table  The name of the table or tables in the first part of the join statement
					 * @return {Select}
					 */

					unjoin(table) {
						if (Array.isArray(table)) {
							table.forEach(t => this.unjoin(t));
							return this;
						}

						table = (0, _lodash2.default)(table);
						this._joins = this._joins.filter(join => {
							const regex = new RegExp(`^([A-Z]+) JOIN ${table}\\b`);
							return !regex.test(join);
						});
						return this;
					}
					/**
					 * Utility function to add conditions for a clause (WHERE, HAVING)
					 * @param {String} collection  The collection to add the clauses to
					 * @param {Array} criteria  A list of expressions to stringify
					 * @property {*} criteria[0]  The expression or name of the column on which to match
					 * @property {*} [criteria[1]]  The comparison operator; defaults to "="
					 * @property {*} [criteria[2]]  The value to test against
					 * @example  The following are equivalent
					 *     this._conditions(this._wheres, ['deleted_at IS NULL']);
					 *     this._conditions(this._wheres, ['deleted_at', null]);
					 *     this._conditions(this._wheres, ['deleted_at', '=', null]);
					 * @example  More examples
					 *     this._conditions(this._wheres, ['fname', 'LIKE', 'joe']); // fname LIKE 'joe'
					 *     this._conditions(this._wheres, ['fname', 'LIKE ?', 'joe']); // fname LIKE 'joe'
					 *     this._conditions(this._wheres, ['fname LIKE %?%', 'joe']); // fname LIKE '%joe%'
					 *     this._conditions(this._wheres, ['fname LIKE ?%', 'joe']); // fname LIKE 'joe%'
					 *     this._conditions(this._wheres, ['fname', 'LIKE ?%', 'joe']); // fname LIKE 'joe%'
					 *     this._conditions(this._wheres, ['price >', 10]); // price > '10'
					 *     this._conditions(this._wheres, ['price', '>', 10]); // price > '10'
					 *     this._conditions(this._wheres, ['price =', 10]); // price = '10'
					 *     this._conditions(this._wheres, ['price !=', 10]); // price != '10'
					 *     this._conditions(this._wheres, ['price', 10]); // price = '10'
					 *     this._conditions(this._wheres, ['price', '=', 10]); // price = '10'
					 *     this._conditions(this._wheres, ['price', '!=', 10]); // price != '10'
					 *     this._conditions(this._wheres, ['price', 'BETWEEN', [10,20]]); // price BETWEEN '10' AND '20'
					 *     this._conditions(this._wheres, ['price', 'NOT BETWEEN', [10,20]]); // price NOT BETWEEN '10' AND '20'
					 *     this._conditions(this._wheres, ['price', [10,20]]); // price IN('10','20')
					 *     this._conditions(this._wheres, ['price', '=', [10,20]]); // price IN('10','20')
					 *     this._conditions(this._wheres, ['price', 'IN', [10,20]]); // price IN('10','20')
					 *     this._conditions(this._wheres, ['price', 'NOT IN', [10,20]]); // price NOT IN('10','20')
					 * @return {Select}
					 */

					_conditions(collection, criteria) {
						if (typeof criteria === 'string') {
							collection.push(criteria);
							return this;
						}

						const numArgs = criteria.length;
						let [column, operator, value] = criteria;

						if (Array.isArray(column)) {
							column.forEach(val => {
								this._conditions(collection, [val]);
							});
							return this;
						} else if (typeof column === 'object') {
							(0, _lodash3.default)(column, (val, name) => {
								this._conditions(collection, [name, val]);
							});
							return this;
						}

						if (/^\w+$/.test(column)) {
							column = _mysql.default.escapeId(column);
						}

						if (numArgs === 1) {
							// condition is a stand-alone expression
							// e.g. "SUM(price) > 10"
							collection.push(column);
							return this;
						} else if (
							numArgs === 2 &&
							Array.isArray(operator) &&
							operator.length > 0 &&
							(0, _quicklyCountSubstrings.default)(column, '?') === operator.length
						) {
							const values = operator;
							let i = 0;
							const sql = column.replace(/(%)?\?(%)?/, ($0, $1, $2) => {
								const escNoQuotes = this.escapeQuoteless(values[i++]);
								return `'${$1}${escNoQuotes}${$2}'`;
							});
							collection.push(sql);
							return this;
						} else if (numArgs === 2) {
							// condition has pairs of "column + operator" => "value"
							// e.g. ["price >", 10]
							// e.g. ["status LIKE ?%", 10]
							value = operator;
							const parts = column.split(' ');
							column = parts.shift();
							operator = parts.join(' ');
						}

						if (!operator) {
							operator = '=';
						}

						operator = operator.toLocaleUpperCase();
						const likeMatch = operator.match(/^(LIKE|NOT LIKE)(?: (\?|\?%|%\?|%\?%))?$/);

						if (operator === 'NOT BETWEEN' || operator === 'BETWEEN') {
							// expect a two-item array
							const from = _mysql.default.escape(value[0]);

							const to = _mysql.default.escape(value[1]);

							collection.push(`${column} ${operator} ${from} AND ${to}`);
						} else if (likeMatch) {
							const quoteless = this.escapeQuoteless(value);
							let quoted;

							if (likeMatch[2] === '?' || !likeMatch[2]) {
								quoted = `'${quoteless}'`;
							} else if (likeMatch[2] === '?%') {
								quoted = `'${quoteless}%'`;
							} else if (likeMatch[2] === '%?') {
								quoted = `'%${quoteless}'`;
							} else if (likeMatch[2] === '%?%') {
								quoted = `'%${quoteless}%'`;
							}

							collection.push(`${column} ${likeMatch[1]} ${quoted}`);
						} else if (value === null) {
							collection.push(operator === '=' ? `${column} IS NULL` : `${column} IS NOT NULL`);
						} else if (Array.isArray(value)) {
							// an array of values should be IN or NOT IN
							const inVals = value.map(v => _mysql.default.escape(v));
							const joined = inVals.join(',');
							collection.push(
								operator === '=' || operator === 'IN'
									? `${column} IN(${joined})`
									: `${column} NOT IN(${joined})`
							);
						} else if (operator === 'IN' || operator === 'NOT IN') {
							// in clause that is not array
							value = _mysql.default.escape(value);
							collection.push(`${column} ${operator} (${value})`);
						} else {
							value = _mysql.default.escape(value);
							collection.push(`${column} ${operator} ${value}`);
						}

						return this;
					}
					/**
					 * Add a group by column or expression
					 * @param {String} column  The name of a column (or expression) to group by
					 * @return {Select}
					 */

					groupBy(column) {
						this._groupBys.push(column);

						return this;
					}
					/**
					 * Add WHERE clauses to conditions (See _conditions for usage)
					 * @param {String} column  The expression or name of the column on which to match
					 * @param {*} [operator]  The comparison operator; defaults to "="
					 * @param {*} [value]  The value to test against
					 * @return {Select}
					 */

					where(...args) {
						this._conditions(this._wheres, args);

						return this;
					}
					/**
					 * Add a WHERE clause with a BETWEEN condition
					 * @param {String} column  The column name
					 * @param {Array} twoValueArray  The two values to be between
					 * @return {Select}
					 */

					whereBetween(column, twoValueArray) {
						if (twoValueArray[0] && twoValueArray[1]) {
							this.where(column, 'BETWEEN', twoValueArray);
						} else if (twoValueArray[0]) {
							this.where(column, '>=', twoValueArray[0]);
						} else if (twoValueArray.length > 1) {
							this.where(column, '<=', twoValueArray[1]);
						}

						return this;
					}
					/**
					 * Add WHERE conditions to place inside an OR block (See _conditions for usage)
					 * @param {Array} conditions  A list where each item is an array with parameters that would be taken by where()
					 * @return {Select}
					 */

					orWhere(conditions) {
						const criteria = [];
						conditions.forEach(condition => {
							this._conditions(criteria, condition);
						});
						const joined = criteria.join(' OR ');

						if (joined.slice(0, 1) === '(' && joined.slice(-1) === ')') {
							this.where(joined);
						} else {
							this.where(`(${joined})`);
						}

						return this;
					}
					/**
					 * Add a HAVING condition (See _conditions for usage)
					 * @param {String} column  The expression or name of the column on which to match
					 * @param {*} [operator]  The comparison operator; defaults to "="
					 * @param {*} [value]  The value to test against
					 * @return {Select}
					 */

					having(...args) {
						this._conditions(this._havings, args);

						return this;
					}

					orHaving(conditions) {
						const criteria = [];
						conditions.forEach(condition => {
							this._conditions(criteria, condition);
						});
						const joined = criteria.join(' OR ');
						this.having(`(${joined})`);
						return this;
					}
					/**
					 * Add a column or expression to order by
					 * @param {String} column  The column name or expression to sort by. Include DESC or prefix with - to sort descending
					 * @return {Select}
					 */

					orderBy(column) {
						this._orderBys.push(column.replace(/^-(.+)/, '$1 DESC'));

						return this;
					}
					/**
					 * Sort by the given column, with a map of columns to translate
					 * @param {String} column  The column name such as "created_at" or "-created_at" for descending
					 * @param {Object} [mapNames={}]  Column names to translate from one name to another
					 * @example
					 *     query.sortField('-modified_at'); // ORDER BY modified_at DESC
					 *     query.sortField('created_at', ['created_at'=>'created']); // ORDER BY created
					 * @return {Select}
					 */

					sortField(column, mapNames = {}) {
						const direction = column.slice(0, 1) === '-' ? 'DESC' : 'ASC';
						column = column.replace(/^-/, '');
						column = mapNames[column] || column;
						this.orderBy(`${column} ${direction}`);
						return this;
					}
					/**
					 * Limit results to the given number
					 * @param {Number} num  The number to limit by
					 * @return {Select}
					 */

					limit(num) {
						this._limit = Number(num) || 0;
						return this;
					}
					/**
					 * Fetch results from the given offset
					 * @param {Number} num  The offset
					 * @return {Select}
					 */

					offset(num) {
						this._offset = Number(num) || 0;
						return this;
					}
					/**
					 * Set the offset based on the limit with the given number of pages
					 * @param {Number} num  The page number
					 * @return {Select}
					 */

					page(num) {
						this._page = Number(num) || 0;
						return this;
					}
					/**
					 * Manually escape a value
					 * @param {*} value  The value to escape
					 * @return {string}
					 */

					escape(value) {
						return _mysql.default.escape(value);
					}
					/**
					 * Manually escape a value without quotes
					 * @param {*} value  The value to escape without quotes
					 * @return {string}
					 */

					escapeQuoteless(value) {
						const escaped = _mysql.default.escape(value);

						if (escaped.slice(0, 1) === "'" && escaped.slice(-1) === "'") {
							return escaped.slice(1, -1);
						}

						return value;
					}
				}

				exports.Select = Select;
			},
			{ '../Parser/Parser.js': 'Parser/Parser.js', '../Db/Db.js': 'Db/Db.js' },
		],
		'entry.js': [
			function(require, module, exports) {
				'use strict';

				Object.defineProperty(exports, '__esModule', {
					value: true,
				});
				Object.defineProperty(exports, 'Db', {
					enumerable: true,
					get: function() {
						return _Db.Db;
					},
				});
				Object.defineProperty(exports, 'Parser', {
					enumerable: true,
					get: function() {
						return _Parser.Parser;
					},
				});
				Object.defineProperty(exports, 'Select', {
					enumerable: true,
					get: function() {
						return _Select.Select;
					},
				});

				var _Db = require('./Db/Db.js');

				var _Parser = require('./Parser/Parser.js');

				var _Select = require('./Select/Select.js');
			},
			{
				'./Db/Db.js': 'Db/Db.js',
				'./Parser/Parser.js': 'Parser/Parser.js',
				'./Select/Select.js': 'Select/Select.js',
			},
		],
	},
	{},
	['entry.js'],
	null
);
//# sourceMappingURL=/index.map
