import { isPlainObject } from 'is-plain-object';
import Db from '../Db/Db';
import AbstractAdapter from './AbstractAdapter';

interface PgError {
  code: string;
  errno: string;
  sqlState: string;
  stack: string;
  sqlMessage?: string;
  message?: string;
}

interface Client {
  connect: () => Promise<any>;
  query: (sql: string, bindings: any[]) => Promise<any>;
  end: () => Promise<void>;
  destroy: () => Promise<void>;
  escapeLiteral: (value: any) => string;
  escapeIdentifier: (value: string) => string;
}

class PostgresAdapter extends AbstractAdapter {
  async connect() {
    return this.client.connect();
  }
  async release(shouldDestroy: boolean) {
    return this.client.release(shouldDestroy);
  }
  async end() {
    return this.client.end();
  }
  async destroy() {}
  async query(sql: string, bound: any[]) {
    const [normalizedSql, normalizedBindings] = this._bindArgs(sql, bound);
    const { fields, rows } = await this.client.query(
      normalizedSql,
      normalizedBindings
    );
    return { query: normalizedSql, fields, rows };
  }
  async multiQuery(sql: string, bound: any[]) {
    // no special handling needed for multiQuery statements
    return this.query(sql, bound);
  }
  escape(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    } else if (typeof value === 'string') {
      return this.client.escapeLiteral(value);
    } else if (typeof value === 'number') {
      return String(value);
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else if (value instanceof Date) {
      return this.client.escapeLiteral(value.toISOString());
    } else {
      return this.client.escapeLiteral(String(value));
    }
  }
  quote(identifier: string) {
    return this.client.escapeIdentifier(identifier);
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
  _bindArgs(sql: string, args: any[]) {
    const values = [];
    let idx = 0;
    if (args.length === 1 && isPlainObject(args[0])) {
      sql = sql.replace(/:([\w_]+)/g, ($0, $1) => {
        if ($1 in args[0]) {
          values.push(args[0][$1]);
          return `$${++idx}`;
        } else {
          return $0;
        }
      });
    } else {
      sql = sql.replace(/\?/g, () => {
        return `$${++idx}`;
      });
      values.push(...args);
    }
    return [sql, values];
  }
  decorateError(error: PgError, sql: string, bound: any = null) {
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
    error.name = 'PgError';
  }
  /**
   * Run the given handler by passing a new database instance.
   *  const addresses = await MysqlAdapter.usingInstance(async db => {
   *    const sql = 'SELECT * FROM animals WHERE type = "cat"';
   *     const { results: cats } = await db.select(sql);
   *     const homes = await findHomes(cats);
   *     return homes.map(home => home.address);
   *   });
   * @param factory A function that returns a db client
   * @param handler  The function to pass the Db instance to
   */
  static async usingFactory(
    factory: () => any,
    handler: (db: Db) => any
  ): Promise<any> {
    const client = await factory();
    const db = new Db(new PostgresAdapter(client));
    try {
      const res = await handler(db);
      db.end().then(noop, noop);
      return res;
    } catch (error) {
      db.end().then(noop, noop);
      return error;
    }
  }
}

function noop() {}
