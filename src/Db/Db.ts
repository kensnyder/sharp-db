import { EventEmitter } from 'node:events';
import mysql from 'mysql';
import Ssh from '../Ssh/Ssh';
import { isPlainObject } from 'is-plain-object';
import decorateError from '../decorateError/decorateError';
import SqlBuilder from '../SqlBuilder/SqlBuilder';
import {
	BindableType,
	DbConfigType,
	DbConnectionType,
	DbEventInterface,
	DeleteResponseInterface,
	EscapeInfixType,
	EventNameType,
	ExportSqlConfigType,
	ExportSqlResultInterface,
	InsertResponseInterface,
	QueryCriteria,
	QueryResponseInterface,
	SelectExistsResponseInterface,
	SelectFirstResponseInterface,
	SelectGroupedResponseInterface,
	SelectHashResponseInterface,
	SelectIndexedResponseInterface,
	SelectListResponseInterface,
	SelectOrCreateResponseInterface,
	SelectResponseInterface,
	SelectValueResponseInterface,
	SqlOptionsInterface,
	SshConfigType,
	TemplatizedInterface,
	UpdateResponseInterface,
} from '../types';

const noop = () => {};

/**
 * Simple database class for mysql
 */
export default class Db extends EventEmitter {
	config: DbConfigType;
	ssh: Ssh;
	static instances: Db[];
	connection: DbConnectionType;
	_templatized: TemplatizedInterface;

	/**
	 * Specify connection details for MySQL and optionally SSH
	 * @param {Object} [config]  MySQL connection details such as host, login, password, encoding, database
	 * @see https://github.com/mysqljs/mysql#connection-options
	 * @param {Object} [sshConfig]  SSH connection details including host, port, user, privateKey
	 * @see https://github.com/mscdex/ssh2#client-methods
	 */
	constructor(config: DbConfigType = {}, sshConfig: SshConfigType = null) {
		super();
		const env = process.env;
		this.config = {
			...config,
			host: config.host || env.DB_HOST || env.RDS_HOSTNAME || '127.0.0.1',
			user: config.user || env.DB_USER || env.RDS_USERNAME || 'root',
			password: config.password || env.DB_PASSWORD || env.RDS_PASSWORD || '',
			database:
				config.database || env.DB_DATABASE || env.RDS_DATABASE || undefined,
			port: config.port || Number(env.DB_PORT) || Number(env.RDS_PORT) || 3306,
			charset: config.charset || env.DB_CHARSET || env.RDS_CHARSET || 'utf8mb4',
		};
		if (sshConfig) {
			/**
			 * The Ssh instance for tunnelling
			 * @type {Ssh}
			 */
			this.ssh = new Ssh(sshConfig);
		}
		Db.instances.push(this);
	}

	/**
	 * Emit an event and associated data
	 * @param type  The event name
	 * @param data  Data to send with event
	 * @return  The emitted event
	 */
	emitDbEvent(type: EventNameType, data = {}): DbEventInterface {
		const evt: DbEventInterface = {
			type,
			subtype: null,
			target: this,
			error: null,
			data,
		};
		this.emit(type, evt);
		return evt;
	}

	/**
	 * Emit a dbError event and associated data
	 * @param {String} subtype  The name of the event that would have been called in a success case
	 * @param {Error} error  The error that was raised
	 * @param {Object} data  Data to send with event
	 * @return {DbEvent}
	 */
	emitDbError(subtype: string, error: Error, data = {}): DbEventInterface {
		const type = 'dbError';
		const evt: DbEventInterface = {
			type,
			subtype,
			target: this,
			error,
			data,
		};
		this.emit(type, evt);
		return evt;
	}

	/**
	 * Create a new QuickDb instance or return the last used one.
	 * Specify connection details for MySQL and optionally SSH
	 * @param {Object} [config]  MySQL connection details such as host, login, password, encoding, database
	 * @see https://github.com/mysqljs/mysql#connection-options
	 * @param {Object} [sshConfig]  SSH connection details including host, port, user, privateKey
	 * @see https://github.com/mscdex/ssh2#client-methods
	 * @return {Db}
	 */
	static factory(
		config: DbConfigType = {},
		sshConfig: SshConfigType = null
	): Db {
		if (Db.instances.length === 0) {
			return new Db(config, sshConfig);
		}
		return Db.instances[Db.instances.length - 1];
	}

	/**
	 * Make a new connection to MySQL
	 * @param {Object} [overrides]  Additional connection params
	 * @return {Promise<Object>}  The mysql connection object
	 * @see https://github.com/mysqljs/mysql#connection-options
	 */
	async connect(overrides: DbConfigType = {}): Promise<DbConnectionType> {
		if (this.ssh) {
			await this.ssh.tunnelTo(this);
			this.emitDbEvent('sshConnect', this.ssh);
		}
		/**
		 * The mysql2 library connection object
		 * @type {Object}
		 */
		this.connection = mysql.createConnection({ ...this.config, ...overrides });
		return new Promise((resolve, reject) => {
			this.connection.connect(error => {
				if (error) {
					decorateError(error);
					this.emitDbError('connect', error);
					reject(error);
				} else {
					this.emitDbEvent('connect', { connection: this.connection });
					resolve(this.connection);
				}
			});
		});
	}

	/**
	 * Make a new connection to MySQL if not already connected
	 */
	async connectOnce(): Promise<void> {
		if (!this.connection) {
			await this.connect();
		}
	}

	/**
	 * Close this connection to the database
	 * @return {Promise}  Resolves when connection has been closed
	 */
	end(): Promise<void> {
		if (this.ssh) {
			this.ssh.end();
			this.emitDbEvent('sshDisconnect');
		}
		return new Promise((resolve, reject) => {
			if (this.connection) {
				const idx = Db.instances.indexOf(this);
				if (idx > -1) {
					Db.instances.splice(idx, 1);
				}
				this.connection.end(error => {
					if (error) {
						decorateError(error);
						this.emitDbError('disconnect', error);
						reject(error);
					} else {
						this.emitDbEvent('disconnect');
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
	 * @return  This instance
	 */
	destroy(): Db {
		if (this.ssh) {
			this.ssh.end();
			this.emitDbEvent('sshDisconnect');
		}
		if (this.connection && this.connection.destroy) {
			const idx = Db.instances.indexOf(this);
			if (idx > -1) {
				Db.instances.splice(idx, 1);
			}
			this.connection.destroy();
			this.emitDbEvent('disconnect');
		}
		return this;
	}

	/**
	 * Close all connections to the database
	 * @return {Promise}  Resolves when all connections have been closed
	 */
	static endAll(): Promise<void[]> {
		return Promise.all(Db.instances.map(db => db.end()));
	}

	/**
	 * Destroy all connections to the database
	 * @return  The Db class itself
	 */
	static destroyAll(): typeof Db {
		Db.instances.forEach(db => db.destroy());
		return Db;
	}

	/**
	 * Run a statement of any type
	 * @param sql  The sql to run
	 * @param bindVars  Values to bind to the sql placeholders
	 * @returns  Query response
	 * @property query  The final SQL that was executed
	 * @property results  The result rows
	 * @property fields  Info about the selected fields
	 */
	async query(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<QueryResponseInterface> {
		await this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					decorateError(error, options);
					this.emitDbError('query', error);
					reject(error);
				} else {
					const result = { query, results, fields };
					const evt = this.emitDbEvent('query', result);
					resolve(evt.data);
				}
			});
		});
	}

	/**
	 * Run multiple statements separated by semicolon
	 * @param {String|Object} sql  The sql to run
	 * @param bindVars  Values to bind to the sql placeholders
	 * @returns {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  One element for every statement in the query
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async multiQuery(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<QueryResponseInterface> {
		await this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		options.multipleStatements = true;
		return this.query(options);
	}

	/**
	 * Return result rows for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result rows
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async select(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectResponseInterface> {
		await this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results, fields) => {
				if (error) {
					decorateError(error, options);
					this.emitDbError('select', error);
					reject(error);
				} else {
					const result = { query, results, fields };
					const evt = this.emitDbEvent('select', result);
					resolve(evt.data);
				}
			});
		});
	}

	/**
	 * Return result array as col1 => col2 pairs for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object} results  The result object with key-value pairs
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async selectHash(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectHashResponseInterface> {
		const { query, results, fields } = await this.select(sql, ...bindVars);
		const key = fields[0].name;
		const val = fields[1].name;
		const hash = {};
		results.forEach(result => {
			hash[String(result[key])] = result[val];
		});
		return { query, results: hash, fields };
	}

	/**
	 * Return result array as col1 for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result list
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async selectList(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectListResponseInterface> {
		const { query, results, fields } = await this.select(sql, ...bindVars);
		const name = fields[0].name;
		const list = results.map(result => result[name]);
		return {
			query,
			results: list,
			fields,
		};
	}

	/**
	 * Return records all grouped by one of the column's values
	 * @param {String} groupField  The name of the field to group by
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object} results  Result rows grouped by groupField
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async selectGrouped(
		groupField,
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectGroupedResponseInterface> {
		const { query, results, fields } = await this.select(sql, ...bindVars);
		const groups = {};
		results.forEach(result => {
			if (!groups[String(result[groupField])]) {
				groups[String(result[groupField])] = [];
			}
			groups[String(result[groupField])].push(result);
		});
		return {
			query,
			results: groups,
			fields,
		};
	}

	/**
	 * Return records all indexed by one of the column's values
	 * @param {String} indexField  The name of the field to index by
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object} results  The results indexed by indexField
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async selectIndexed(
		indexField,
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectIndexedResponseInterface> {
		const { query, results, fields } = await this.select(sql, ...bindVars);
		const hash = {};
		results.forEach(result => {
			hash[String(result[indexField])] = result;
		});
		return {
			query,
			results: hash,
			fields,
		};
	}

	/**
	 * Return first result row for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object|undefined} results  The result row or undefined
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async selectFirst(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectFirstResponseInterface> {
		const { query, results, fields } = await this.select(sql, ...bindVars);
		return {
			query,
			results: results[0],
			fields,
		};
	}

	/**
	 * Return first column value for the first result row for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {*} results  The value returned inside the first field of the first row
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async selectValue(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectValueResponseInterface> {
		const { query, results, fields } = await this.select(sql, ...bindVars);
		let value = undefined;
		if (results.length > 0) {
			const name = fields[0].name;
			value = results[0][name];
		}
		return {
			query,
			results: value,
			fields,
		};
	}

	/**
	 * Run the given SELECT statement wrapped in a "SELECT EXISTS" query
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Boolean} results  True if any records match query
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async selectExists(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<SelectExistsResponseInterface> {
		const options = typeof sql === 'object' ? sql : { sql };
		options.sql = `SELECT EXISTS (${options.sql}) AS does_it_exist`;
		const { query, results, fields } = await this.select(options, ...bindVars);
		const doesItExist = results[0] ? Boolean(results[0].does_it_exist) : false;
		return {
			query,
			results: doesItExist,
			fields,
		};
	}

	/**
	 * Run the given INSERT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} insertId  The id of the last inserted record
	 */
	async insert(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<InsertResponseInterface> {
		await this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results) => {
				if (error) {
					decorateError(error, options);
					this.emitDbError('insert', error);
					reject(error);
				} else {
					const result = {
						query,
						insertId: results.insertId,
						affectedRows: results.affectedRows,
						changedRows: results.changedRows,
					};
					const evt = this.emitDbEvent('insert', result);
					resolve(evt.data);
				}
			});
		});
	}

	/**
	 * Run the given UPDATE statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} changedRows  The number of rows affected by the statement
	 */
	async update(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<UpdateResponseInterface> {
		await this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results) => {
				if (error) {
					decorateError(error, options);
					this.emitDbError('update', error);
					reject(error);
				} else {
					const result = {
						query,
						affectedRows: results.affectedRows,
						changedRows: results.changedRows,
					};
					const evt = this.emitDbEvent('update', result);
					resolve(evt.data);
				}
			});
		});
	}

	/**
	 * Run the given DELETE statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bindVars  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} changedRows  The number of rows affected by the statement
	 */
	async delete(
		sql: string | SqlOptionsInterface,
		...bindVars: BindableType[]
	): Promise<DeleteResponseInterface> {
		await this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results) => {
				if (error) {
					decorateError(error, options);
					this.emitDbError('delete', error);
					reject(error);
				} else {
					const result = {
						query,
						affectedRows: results.affectedRows,
						changedRows: results.changedRows,
					};
					const evt = this.emitDbEvent('delete', result);
					resolve(evt.data);
				}
			});
		});
	}

	/**
	 * Build a SELECT statement and return result rows
	 * @param {String} table  The name of the table
	 * @param {Array} fields  An array of field names to select
	 * @param {Object} criteria  Params to construct the WHERE clause - see SqlBuilder#buildWhere
	 * @param {String} extra  Additional raw SQL such as GROUP BY, ORDER BY, or LIMIT
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result rows
	 * @property {Object[]} fields  Info about the selected fields
	 * @see SqlBuilder#buildWhere
	 */
	selectFrom(
		table: string,
		fields: string[] = [],
		criteria: Object = {},
		extra = ''
	): Promise<SelectResponseInterface> {
		const sql = SqlBuilder.selectFrom(table, fields, criteria, extra);
		return this.select(sql);
	}

	/**
	 * Select the record with the given column value
	 * @param {String} table  The name of the table from which to select
	 * @param {String} column  The name of the column from which to select
	 * @param {String} value  The value of the record for that column
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object|undefined} results  The result row or undefined
	 * @property {Object[]} fields  Info about the selected fields
	 */
	selectByKey(table, column, value): Promise<SelectFirstResponseInterface> {
		const sql = SqlBuilder.selectBy(table, column, value);
		return this.selectFirst(sql);
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
	selectId(table, id): Promise<SelectFirstResponseInterface> {
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
	selectUuid(table, uuid): Promise<SelectFirstResponseInterface> {
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
	selectOrCreate(
		table,
		criteria,
		newValues
	): Promise<SelectOrCreateResponseInterface> {
		return this.selectFrom(table, ['*'], criteria).then(
			async ({ query, results, fields }) => {
				if (results.length > 0) {
					return {
						query,
						results: results[0],
						insertId: undefined,
						affectedRows: 0,
						changedRows: 0,
						fields,
					};
				}
				try {
					const { query, insertId, affectedRows, changedRows } =
						await this.insertInto(table, newValues);
					if (!insertId) {
						return Promise.reject(
							Error(`Unknown error getting insertId from ${query}`)
						);
					}
					const { results: newRows, fields } = await this.selectFrom(
						table,
						['*'],
						criteria
					);
					if (!newRows || !newRows[0]) {
						return Promise.reject(
							Error(`Error fetching newly created record from ${table}`)
						);
					}
					return {
						query,
						results: newRows[0],
						insertId,
						affectedRows,
						changedRows,
						fields,
					};
				} catch (e) {
					return Promise.reject(e);
				}
			},
			/* istanbul ignore next */
			err => err
		);
	}

	/**
	 * Find a record's id or add a new one
	 * @param {String} table  The name of the table from which to select
	 * @param {Object} criteria  Criteria by which to find the row
	 * @param {Object} newValues  The values to use to insert if the record doesn't exist
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Object} results  The result row or new values
	 * @property {Object[]} fields  Info about the selected fields
	 * @property {Number} insertId  The id of the last inserted record
	 */
	selectOrCreateId(
		table,
		criteria,
		newValues
	): Promise<SelectOrCreateResponseInterface> {
		return this.selectFrom(table, ['id'], criteria).then(
			async ({ query, results, fields }) => {
				if (results.length > 0) {
					return {
						query,
						results: results[0].id,
						fields,
					};
				} else {
					return this.insertInto(table, newValues).then(
						({ query, insertId }) => {
							return {
								query,
								results: insertId,
								fields,
							};
						}
					);
				}
			},
			/* istanbul ignore next */
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
	insertInto(table, insert): Promise<InsertResponseInterface> {
		const sql = SqlBuilder.insertInto(table, insert);
		return this.insert(sql);
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
	async insertIntoOnDuplicateKeyUpdate(
		table,
		insert,
		update
	): Promise<InsertResponseInterface> {
		const sql = SqlBuilder.insertIntoOnDuplicateKeyUpdate(
			table,
			insert,
			update
		);
		return this.insert(sql);
	}

	/**
	 * Build an INSERT statement and run it
	 * @param {String} table  The name of the table
	 * @param {Array} rows  An Array of objects, each with column-value pairs to insert
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} insertId  The id of the last inserted record
	 */
	insertExtended(table, rows): Promise<InsertResponseInterface> {
		const sql = SqlBuilder.insertExtended(table, rows);
		return this.insert(sql);
	}

	/**
	 * Build an UPDATE statement and run it
	 * @param {String} table  The name of the table
	 * @param {Object} set  An array of column-value pairs to update
	 * @param {Object} where  Params to construct the WHERE clause - see SqlBuilder#buildWheres
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} changedRows  The number of rows affected by the statement
	 * @see SqlBuilder#buildWheres
	 */
	updateTable(table, set, where = {}): Promise<UpdateResponseInterface> {
		const sql = SqlBuilder.updateTable(table, set, where);
		return this.update(sql, set);
	}

	/**
	 * Construct a DELETE query and run
	 * @param {String} table  The name of the table from which to delete
	 * @param {Object} where  WHERE conditions on which to delete - see SqlBuilder#buildWheres
	 * @param {Number} limit  Limit deletion to this many records
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} changedRows  The number of rows affected by the statement
	 * @see SqlBuilder#buildWheres
	 */
	async deleteFrom(
		table,
		where,
		limit = null
	): Promise<DeleteResponseInterface> {
		const sql = SqlBuilder.deleteFrom(table, where, limit);
		return this.delete(sql);
	}

	/**
	 * Construct INSERT statements suitable for a backup
	 * @param {String} table  The name of the table from which to fetch records
	 * @param {Object} where  WHERE conditions on which to fetch records - see SqlBuilder#buildWheres
	 * @see SqlBuilder#buildWheres
	 * @param {Object} options  Additional options
	 * @property {Number} [limit=0]  Limit export to this many records
	 * @property {Number} [chunkSize=250]  If > 0, restrict INSERT STATEMENTS to a maximum of this many records
	 * @property {Boolean} [discardIds=false]  If true, columns selected as "id" will have a NULL value
	 * @property {Boolean} [disableForeignKeyChecks=false]  If true, add statements to disable and re-enable foreign key checks
	 * @property {Boolean} [lockTables=false]  If true, add statements to lock and unlock tables
	 * @return {Promise<Object>}
	 * @property {String} results  The exported SQL
	 * @property {String} query  The SQL that was executed to fetch records
	 * @property {Object[]} fields  Details on the fields fetched
	 * @property {Number} affectedRows  The number of rows matching the WHERE criteria
	 * @property {Number} chunks  The number of chunks of rows
	 */
	async exportAsSql(
		table: string,
		where: QueryCriteria = {},
		{
			limit = 0,
			chunkSize = 250,
			discardIds = false,
			truncateTable = false,
			disableForeignKeyChecks = false,
			lockTables = false,
		}: ExportSqlConfigType = {}
	): Promise<ExportSqlResultInterface> {
		// get results
		const additional = limit > 0 ? `LIMIT ${limit}` : '';
		const {
			results: rows,
			fields,
			query,
		} = await this.selectFrom(table, [], where, additional);
		if (rows.length === 0) {
			return {
				results: '',
				fields,
				query,
				affectedRows: 0,
				chunks: 0,
			};
		}
		const sql = SqlBuilder.exportRows(table, rows, {
			fields,
			chunkSize,
			discardIds,
			truncateTable,
			disableForeignKeyChecks,
			lockTables,
		});
		return {
			results: sql,
			fields,
			query,
			affectedRows: rows.length,
			chunks: Math.ceil(rows.length / chunkSize),
		};
	}

	/**
	 * run START TRANSACTION
	 * @alias Db#beginTransaction
	 * @return {Promise<Object>}
	 */
	startTransaction() {
		this.emitDbEvent('startTransaction');
		return this.query('START TRANSACTION');
	}

	/**
	 * run START TRANSACTION
	 * @alias Db#startTransaction
	 * @return {Promise<Object>}
	 */
	beginTransaction() {
		return this.startTransaction();
	}

	/**
	 * run COMMIT
	 * @return {Promise<Object>}
	 */
	commit() {
		this.emitDbEvent('commit');
		return this.query('COMMIT');
	}

	/**
	 * run ROLLBACK
	 * @return {Promise<Object>}
	 */
	rollback() {
		this.emitDbEvent('rollback');
		return this.query('ROLLBACK');
	}

	/**
	 * Bind an arguments to a query
	 * @param {String|Object} sql  The base SQL query
	 * @param {*} args  A value, an object with key/value paris, or an array of values to bind
	 * @return {Object}
	 * @property {String} sql  The final SQL with bound values replaced
	 * @example
	 * db.select('SELECT * FROM users WHERE id = ?', 100);
	 * db.bindArgs('SELECT * FROM users WHERE id = ?', 100); // SELECT * FROM users WHERE id = '100'
	 * db.select('SELECT * FROM users WHERE id = :id', { id: 100 });
	 * db.bindArgs('SELECT * FROM users WHERE id = :id', { id: 100 }); // SELECT * FROM users WHERE id = '100'
	 */
	bindArgs(sql: string | SqlOptionsInterface, args: any) {
		const options = typeof sql === 'object' ? sql : { sql };
		if (options.sql === '' || typeof options.sql !== 'string') {
			throw new Error('SQL must be a non-empty empty string');
		}
		if (!Array.isArray(args)) {
			args = [];
		}
		if (Array.isArray(options.values)) {
			args = options.values.concat(args);
		} else if (options.values) {
			args = [options.values].concat(args);
		}
		options.values = undefined;
		options.bound = {};
		args.forEach((arg, i) => {
			if (
				arg instanceof Boolean ||
				arg instanceof Number ||
				arg instanceof String
			) {
				arg = arg.valueOf();
			}
			if (isPlainObject(arg)) {
				options.sql = options.sql.replace(/:([\w_]+)/g, ($0, $1) => {
					if (arg.hasOwnProperty($1) && arg[$1] !== undefined) {
						options.bound[$1] = arg[$1];
						return this.escape(arg[$1]);
					}
					return $0;
				});
			} else {
				options.bound[String(i)] = arg;
				options.sql = options.sql.replace('?', this.escape(arg));
			}
		});
		const evt = this.emitDbEvent('bind', options);
		return evt.data;
	}

	/**
	 * Escape a value for use in a raw query and surround with apostrophes
	 * @param {*} value  The value to escape
	 * @return {String}
	 */
	escape(value: BindableType): string {
		return mysql.escape(value);
	}

	/**
	 * Escape a value for use in a raw query without apostrophes
	 * @param {String|Number|Boolean|null} value  The value to escape
	 * @return {String}
	 */
	escapeQuoteless(value: BindableType): String {
		let escaped = this.escape(value);
		if (escaped.slice(0, 1) === "'" && escaped.slice(-1) === "'") {
			escaped = escaped.slice(1, -1);
		}
		return escaped;
	}

	/**
	 * Get the proper escaping for a LIKE or NOT LIKE clause
	 * @param {String} infix  One of ?% or %?% or %? or ?
	 * @param {String} value  The value to search for
	 * @return {String}
	 */
	escapeLike(infix: EscapeInfixType, value: BindableType): string {
		// use ?% for LIKE 'value%'
		// use %?% for LIKE '%value%'
		// use %? for LIKE '%value'
		// use ? for LIKE 'value'
		const quoteless = this.escapeQuoteless(value);
		switch (infix) {
			case '?':
			default:
				return `'${quoteless}'`;
			case '?%':
				return `'${quoteless}%'`;
			case '%?':
				return `'%${quoteless}'`;
			case '%?%':
				return `'%${quoteless}%'`;
		}
	}

	/**
	 * Escape an identifier such as a table or column
	 * @param identifier
	 * @return {*}
	 */
	quote(identifier: string) {
		if (/[`()]/.test(identifier)) {
			return identifier;
		}
		let quoted = mysql.escapeId(identifier);
		if (/`\*`$/.test(quoted)) {
			quoted = quoted.slice(0, -3) + '*';
		}
		return quoted;
	}

	/**
	 * Return an object with query methods to run on template literals
	 * (backtick strings) where interpolated strings are automatically escaped
	 * @example
	 * const db = Db.factory();
	 * const { select, selectValue } = db.tpl();
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
	tpl(): TemplatizedInterface {
		if (!this._templatized) {
			function toSql(templateData, variables) {
				let s = templateData[0];
				variables.forEach((variable, i) => {
					s += mysql.escape(variable);
					s += templateData[i + 1];
				});
				return s;
			}
			this._templatized = {
				select: (sql, ...vars) => this.select(toSql(sql, vars)),
				selectFirst: (sql, ...vars) => this.selectFirst(toSql(sql, vars)),
				selectList: (sql, ...vars) => this.selectList(toSql(sql, vars)),
				selectHash: (sql, ...vars) => this.selectHash(toSql(sql, vars)),
				selectValue: (sql, ...vars) => this.selectValue(toSql(sql, vars)),
				insert: (sql, ...vars) => this.insert(toSql(sql, vars)),
				update: (sql, ...vars) => this.update(toSql(sql, vars)),
				delete: (sql, ...vars) => this.delete(toSql(sql, vars)),
			};
		}
		return this._templatized;
	}

	/**
	 * Run the given handler by passing a new database instance. Three signatures:
	 *   Db.withInstance(handler)
	 *   Db.withInstance(mysqlConfig, handler)
	 *   Db.withInstance(mysqlConfig, sshConfig, handler)
	 * @example
	 *   const addresses = await Db.withInstance(async db => {
	 *   	const sql = 'SELECT * FROM animals WHERE type = "cat"';
	 *      const { results: cats } = await db.select(sql);
	 *      const homes = await findHomes(cats);
	 *      return {
	 *          homes: homes.map(home => home.address);
	 *      };
	 *   });
	 * @param {Object} [config]  The mysql connection information (or omit to read from env)
	 * @param {Object} [sshConfig]  The ssh config information (or omit to read from env)
	 * @param {Function} handler  The function to pass the Db instance to
	 * @returns {Promise<Error|*>}
	 */
	static async withInstance(
		config: DbConfigType,
		sshConfig: SshConfigType,
		handler: Function
	): Promise<any> {
		if (typeof config === 'function') {
			handler = config;
			config = {};
			sshConfig = null;
		}
		if (typeof sshConfig === 'function') {
			handler = sshConfig;
			sshConfig = null;
		}
		const db = new Db(config, sshConfig);
		try {
			const res = await handler(db);
			db.end().then(noop, noop);
			return res;
		} catch (error) {
			db.end().then(noop, noop);
			return { error };
		}
	}
}

/**
 * A list of all the Db instances that have been created
 * @type {Array}
 */
Db.instances = [];

module.exports = Db;
