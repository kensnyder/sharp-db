import { isPlainObject } from 'is-plain-object';
import SqlBuilder from '../SqlBuilder/SqlBuilder';
import {
	BindableType,
	BoundValuesType,
	DbConfigType,
	DbConnectionType,
	DeleteResponseInterface,
	EscapeInfixType,
	ExportSqlConfigType,
	ExportSqlResultInterface,
	InsertResponseInterface,
	QueryCriteriaType,
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
import AbstractAdapter from '../Adapters/AbstractAdapter';

const noop = () => {};

/**
 * Simple database class for mysql
 */
export default class Db {
	static instances: Db[] = [];
	adapter: AbstractAdapter;
	isConnected: boolean = false;
	_templatized: TemplatizedInterface;

	/**
	 * Specify connection details for MySQL and optionally SSH
	 * @param [config]  MySQL connection details such as host, login, password, encoding, database
	 * @see https://github.com/mysqljs/mysql#connection-options
	 * @param [sshConfig]  SSH connection details including host, port, user, privateKey
	 * @see https://github.com/mscdex/ssh2#client-methods
	 */
	constructor(adapter: AbstractAdapter) {
		this.adapter = adapter;
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
	static factory(): Db {
		if (Db.instances.length === 0) {
			throw new Error('No Db instances have been created yet');
		}
		return Db.instances[Db.instances.length - 1];
	}

	/**
	 * Make a new connection to MySQL
	 * @param {Object} [overrides]  Additional connection params
	 * @return {Promise<Object>}  The mysql connection object
	 * @see https://github.com/mysqljs/mysql#connection-options
	 */
	async connect(): Promise<DbConnectionType> {
		const res = await this.adapter.connect();
		this.isConnected = true;
		return res;
	}

	/**
	 * Make a new connection to MySQL if not already connected
	 */
	async connectOnce(): Promise<void> {
		if (!this.isConnected) {
			await this.connect();
		}
	}

	_spliceOutInstance() {
		const idx = Db.instances.indexOf(this);
		if (idx > -1) {
			Db.instances.splice(idx, 1);
		}
	}

	/**
	 * Close this connection to the database
	 * @return {Promise}  Resolves when connection has been closed
	 */
	end(): Promise<void> {
		this._spliceOutInstance();
		return this.adapter.end();
	}

	/**
	 * Destroy the connection to the database
	 * @return  This instance
	 */
	destroy(): Db {
		this._spliceOutInstance();
		return this.adapter.destroy();
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
		sql: string,
		...bindVars: BoundValuesType
	): Promise<QueryResponseInterface> {
		return this.adapter.query(sql, bindVars);
	}

	/**
	 * Run multiple statements separated by semicolon
	 * @param {String|Object} sql  The sql to run
	 * @param bound  Values to bind to the sql placeholders
	 * @returns {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  One element for every statement in the query
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async multiQuery(
		sql: string,
		...bound: BoundValuesType
	): Promise<QueryResponseInterface> {
		return this.adapter.multiQuery(sql, bound);
	}

	/**
	 * Return result rows for the given SELECT statement
	 * @param {String|Object} sql  The SQL to run
	 * @param bound  The values to bind to each question mark or named binding
	 * @return {Promise<Object>}
	 * @property {String} query  The final SQL that was executed
	 * @property {Array} results  The result rows
	 * @property {Object[]} fields  Info about the selected fields
	 */
	async select(
		sql: string,
		...bound: BoundValuesType
	): Promise<SelectResponseInterface> {
		return this.adapter.query(sql, bound);
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
		...bindVars: BoundValuesType
	): Promise<SelectHashResponseInterface> {
		const { query, results, fields } = await this.adapter.query(
			sql,
			...bindVars
		);
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
		...bindVars: BoundValuesType
	): Promise<SelectListResponseInterface> {
		const { query, results, fields } = await this.adapter.query(
			sql,
			...bindVars
		);
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
		...bindVars: BoundValuesType
	): Promise<SelectGroupedResponseInterface> {
		const { query, results, fields } = await this.adapter.query(
			sql,
			...bindVars
		);
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
		...bindVars: BoundValuesType
	): Promise<SelectIndexedResponseInterface> {
		const { query, results, fields } = await this.adapter.query(
			sql,
			...bindVars
		);
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
		...bindVars: BoundValuesType
	): Promise<SelectFirstResponseInterface> {
		const { query, results, fields } = await this.adapter.query(
			sql,
			...bindVars
		);
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
		...bindVars: BoundValuesType
	): Promise<SelectValueResponseInterface> {
		const { query, results, fields } = await this.adapter.query(
			sql,
			...bindVars
		);
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
		sql: string,
		...bindVars: BoundValuesType
	): Promise<SelectExistsResponseInterface> {
		const existsSql = `SELECT EXISTS (${sql}) AS does_it_exist`;
		const { query, results, fields } = await this.adapter.query(
			existsSql,
			...bindVars
		);
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
		...bindVars: BoundValuesType
	): Promise<InsertResponseInterface> {
		await this.connectOnce();
		const options = this.bindArgs(sql, bindVars);
		return new Promise((resolve, reject) => {
			const query = this.connection.query(options, (error, results) => {
				if (error) {
					decorateError(error, options);
					reject(error);
				} else {
					const result = {
						query,
						insertId: results.insertId,
						affectedRows: results.affectedRows,
						changedRows: results.changedRows,
					};
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
		...bindVars: BoundValuesType
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
		...bindVars: BoundValuesType
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
		where: QueryCriteriaType = {},
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
		return this.query('COMMIT');
	}

	/**
	 * run ROLLBACK
	 * @return {Promise<Object>}
	 */
	rollback() {
		return this.query('ROLLBACK');
	}

	/**
	 * Escape a value for use in a raw query and surround with apostrophes
	 * @param {*} value  The value to escape
	 * @return {String}
	 */
	escape(value: BindableType): string {
		return this.adapter.escape(value);
	}

	/**
	 * Escape a value for use in a raw query without apostrophes
	 * @param {String|Number|Boolean|null} value  The value to escape
	 * @return {String}
	 */
	escapeQuoteless(value: BindableType): string {
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
	 */
	quote(identifier: string): string {
		if (/[`()]/.test(identifier)) {
			return identifier;
		}
		let quoted = this.adapter.escapeId(identifier);
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
		const adapter = this.adapter;
		if (!this._templatized) {
			function toSql(templateData, variables) {
				let s = templateData[0];
				variables.forEach((variable, i) => {
					s += adapter.escape(variable);
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
}
