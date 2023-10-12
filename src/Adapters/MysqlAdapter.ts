import AbstractAdapter from './AbstractAdapter';
import { isPlainObject } from 'is-plain-object';
import Db from '../Db/Db';

interface MysqlError {
	code: string;
	errno: string;
	sqlState: string;
	stack: string;
	sqlMessage?: string;
	message?: string;
}

export default class MysqlAdapter extends AbstractAdapter {
	async connect() {
		return new Promise((resolve, reject) => {
			this.client.connect((error: MysqlError) => {
				if (error) {
					this.decorateError(error, null);
					reject(error);
				} else {
					resolve(this);
				}
			});
		});
	}
	async query(sql: string, bound: any[]) {
		const [normalizedSql, normalizedBindings] = this._bindArgs(sql, bound);
		const options = {
			sql: normalizedSql,
			value: normalizedBindings,
		};
		return new Promise((resolve, reject) => {
			const query = this.client.query(options, (error, results, fields) => {
				if (error) {
					this.decorateError(error, sql, bound);
					reject(error);
				} else {
					resolve({ query, results, fields });
				}
			});
		});
	}
	async multiQuery(sql: string, bound: any[]) {
		const options = {
			sql,
			bound,
			multipleStatements: true,
		};
		return new Promise((resolve, reject) => {
			const query = this.client.query(options, (error, results, fields) => {
				if (error) {
					this.decorateError(error, sql, bound);
					reject(error);
				} else {
					resolve({ query, results, fields });
				}
			});
		});
	}
	async insert(sql: string, bound: any[]) {
		// TODO: implement
	}
	async delete(sql: string, bound: any[]) {
		// TODO: implement
	}
	escape(value: any) {
		return this.client.escape(value);
	}
	quote(identifier: string) {
		if (/[`()]/.test(identifier)) {
			return identifier;
		}
		let quoted = this.client.escapeId(identifier);
		if (/`\*`$/.test(quoted)) {
			quoted = quoted.slice(0, -3) + '*';
		}
		return quoted;
	}

	async release(shouldDestroy: boolean) {
		// mysql2 pools automatically release connections
	}
	async end() {
		return this.client.end();
	}
	async destroy() {
		return this.client.destroy();
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
	_bindArgs(sql: string, args: any) {
		const values = [];
		if (args.length === 1 && isPlainObject(args[0])) {
			sql = sql.replace(/:([\w_]+)/g, ($0, $1) => {
				if ($1 in args[0]) {
					values.push(args[0][$1]);
					return '?';
				} else {
					return $0;
				}
			});
		} else {
			sql = sql.replace(/\$(\d+)/g, ($0, $1) => {
				if (args.length <= $1) {
					values.push(args[Number($1)]);
					return '?';
				} else {
					return $0;
				}
			});
		}
		return [sql, values];
	}
	decorateError(error: MysqlError, sql: string, bound: any = null) {
		// pull out existing properties and provide defaults
		const code = error.code || 'ERROR';
		const errno = error.errno || '-1';
		const sqlState = error.sqlState || 'N/A';
		const stack = error.stack || '';
		const sqlMessage = error.sqlMessage || error.message;
		let sqlSnippet = '';
		if (sql) {
			error.sql = sql;
			const fullSql = sql.trim().replace(/\n\s*/g, '\n');
			if (fullSql.length >= 300) {
				sqlSnippet = fullSql.slice(0, 297) + '...';
			} else {
				sqlSnippet = fullSql;
			}
			sqlSnippet = `Query:\n${sqlSnippet}`;
		}
		// take stack but remove first line
		const stackWithoutError = stack.split('\n').slice(1).join('\n');
		// build a message with code, errno, sqlState, sqlMessage and SQL snippet
		const newMessage =
			`[${code}] ${errno} (${sqlState}): ${sqlMessage}\n${sqlSnippet}`.trim();
		// build a stack with the error text and remaining stack
		const newStack = `${newMessage}\n${stackWithoutError}`;
		// add these new values as properties
		error.stack = newStack;
		error.message = newMessage;
		error.bound = bound || {};
		error.name = 'MySQLError';
	}
	/**
	 * Run the given handler by passing a new database instance.
	 * @example
	 *   const addresses = await MysqlAdapter.usingInstance(async db => {
	 *    const sql = 'SELECT * FROM animals WHERE type = "cat"';
	 *     const { results: cats } = await db.select(sql);
	 *     const homes = await findHomes(cats);
	 *     return homes.map(home => home.address);
	 *   });
	 * @param factory A function that returns a mysql instance
	 * @param handler  The function to pass the Db instance to
	 */
	static async usingInstance(factory: () => any, handler: (db: Db) => any) {
		const client = await factory();
		const db = new Db(new MysqlAdapter(client));
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

function noop() {}
