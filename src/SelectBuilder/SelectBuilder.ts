import cloneDeep from 'lodash.clonedeep';
import forOwn from '../forOwnDefined/forOwnDefined';
import substrCount from '../substrCount/substrCount';

type FieldName =
  | 'option'
  | 'options'
  | 'column'
  | 'columns'
  | 'table'
  | 'tables'
  | 'join'
  | 'joins'
  | 'where'
  | 'wheres'
  | 'having'
  | 'havings'
  | 'groupBy'
  | 'groupBys'
  | 'orderBy'
  | 'orderBys'
  | 'limit'
  | 'offset'
  | 'page';

/**
 * Build a select query
 * Class Select
 */
export default class SelectBuilder {
  _bindIndex: number = 0;
  _options: string[] = [];
  _tables: string[] = [];
  _columns: string[] = [];
  _joins: string[] = [];
  _wheres: string[] = [];
  _groupBys: string[] = [];
  _orderBys: string[] = [];
  _havings: string[] = [];
  _page: number;
  _limit: number;
  _offset: number;
  _bound: Record<string, any>;
  _siblings: Record<string, any>[];
  _children: Record<string, any>[];

  /**
   * Return a new Select object that matches the given SQL
   * @param sql  The SQL to parse
   * @param adapter  The Db Engine adapter to use for escaping and quoting
   * @returns  A new Select instance
   */
  static parse(sql: string): SelectBuilder {
    return new SelectBuilder(sql);
  }

  /**
   * Select constructor
   * @param [url]  A base SQL query to parse
   */
  constructor(sql: string = null) {
    this.adapter = adapter;
    this.reset();
  }

  /**
   * Get the SQL as a pretty-printed string plus all the bindings
   * @return The SQL query as a string
   */
  compile() {
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
      if (this._limit) {
        lines.push(`LIMIT ${this._limit}`);
      }
      if (this._offset) {
        lines.push(`OFFSET ${this._offset}`);
      }
    }

    const pretty = lines.filter(Boolean).join('\n').trim();
    const bindings: any = [];
    const sql = pretty.replace(/__BOUND_(\d+)__/g, ($0, $1) => {
      bindings.push(this._bound[$1]);
      return '?';
    });
    return { sql, bindings };
  }

  /**
   * @param {String|Array} [field]  If given, reset the given component(s), otherwise reset all query components
   *     Valid components: option, column, table, where, orWhere, having, groupBy, orderBy, limit, offset, page
   * @return This object
   * @chainable
   */
  reset(field: FieldName = null) {
    if (Array.isArray(field)) {
      field.forEach(name => this.reset(name));
      return this;
    }
    if (field) {
      const pluralizable = [
        'option',
        'column',
        'table',
        'where',
        'having',
        'groupBy',
        'orderBy',
      ];
      let prop = '_' + field.replace(/s$/, '');
      if (pluralizable.indexOf(field) > -1) {
        prop += 's';
      }
      this[prop] = ['limit', 'offset', 'page'].indexOf(field) > -1 ? null : [];
    } else {
      /**
       * The list of sibling relationship definitions
       * @property {Object[]}
       * @private
       */
      this._siblings = [];
      /**
       * The list of child relationship definitions
       * @property {Object[]}
       * @private
       */
      this._children = [];
      /**
       * The list of strings to come immediately after "SELECT"
       * and before column names
       * @property {String[]}
       * @private
       */
      this._options = [];
      /**
       * The list of column names to select
       * @property {String[]}
       * @private
       */
      this._columns = [];
      /**
       * The list of tables in the FROM clause
       * @property {String[]}
       * @private
       */
      this._tables = [];
      /**
       * The list of JOIN strings to add
       * @property {String[]}
       * @private
       */
      this._joins = [];
      /**
       * The list of WHERE clauses
       * @property {String[]}
       * @private
       */
      this._wheres = [];
      /**
       * The list of HAVING clauses
       * @property {String[]}
       * @private
       */
      this._havings = [];
      /**
       * The list of GROUP BY clauses
       * @property {String[]}
       * @private
       */
      this._groupBys = [];
      /**
       * The list of ORDER BY clauses
       * @property {String[]}
       * @private
       */
      this._orderBys = [];
      /**
       * The LIMIT to use
       * @property {Number}
       * @private
       */
      this._limit = null;
      /**
       * The OFFSET to use
       * @property {Number}
       * @private
       */
      this._offset = null;
      /**
       * The page used to construct an OFFSET based on the LIMIT
       * @property {Number}
       * @private
       */
      this._page = null;
      /**
       * Values to bind by name to the query before executing
       * @property {Object}
       * @private
       */
      this._bound = {};
    }
    return this;
  }

  /**
   * Clone this object
   * @return {Select}
   */
  getClone() {
    const copy = new SelectBuilder();
    copy._children = cloneDeep(this._children);
    copy._siblings = cloneDeep(this._siblings);
    copy._options = cloneDeep(this._options);
    copy._columns = cloneDeep(this._columns);
    copy._tables = cloneDeep(this._tables);
    copy._joins = cloneDeep(this._joins);
    copy._wheres = cloneDeep(this._wheres);
    copy._havings = cloneDeep(this._havings);
    copy._groupBys = cloneDeep(this._groupBys);
    copy._orderBys = cloneDeep(this._orderBys);
    copy._limit = this._limit;
    copy._offset = this._offset;
    copy._page = this._page;
    copy._bound = cloneDeep(this._bound);
    return copy;
  }

  /**
   * Build a version of this query that simply returns COUNT(*)
   * @param {String} [countExpr="*"]  Use to specify `DISTINCT colname` if needed
   * @return {Select}  The SQL query
   */
  getFoundRowsQuery(countExpr = '*') {
    if (this._havings.length === 0) {
      const clone = this.getClone();
      clone._columns = [`COUNT(${countExpr}) AS found_rows`];
      clone._options = [];
      clone._groupBys = [];
      clone._orderBys = [];
      clone._limit = null;
      clone._offset = null;
      clone._page = null;
      return clone;
    } else {
      const subquery = this.getClone();
      subquery._limit = null;
      subquery._offset = null;
      subquery._page = null;
      return subquery;
    }
  }

  /**
   * Get SQL needed to return the found rows of this query
   * @param {String} countExpr  The expression to use inside the COUNT()
   * @param {Boolean} normalize  If true, return a normalized sql
   * @returns {String}
   */
  getFoundRowsSql(countExpr = '*') {
    const query = this.getFoundRowsQuery(countExpr);
    const { sql, bindings } = query.compile();
    if (this._havings.length === 0) {
      return { sql, bindings };
    } else {
      const subquerySql = sql.replace(/\n/g, '\n\t');
      return {
        sql: `SELECT COUNT(*) AS found_rows FROM (${subquerySql}) AS subq`,
        bindings,
      };
    }
  }

  // /**
  //  * Extract the name of the first bound variable
  //  * E.g. given "SELECT * FROM users WHERE id IN(:id)" it would return "id"
  //  * @param {String} sql
  //  * @returns {*|string}
  //  * @private
  //  */
  // static _extractBindingName(sql) {
  //   const match = sql.match(/:([\w_]+)/);
  //   if (!match) {
  //     throw new Error(`Unable to find bound variable in SQL "${sql}"`);
  //   }
  //   return match[1];
  // }

  /**
   * Add an array of column names to fetch
   * @param {String[]} columnNames  The names of columns
   * @return {Select}
   */
  columns(columnNames) {
    this._columns = this._columns.concat(columnNames);
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
   * Add multiple table to the "FROM" clause
   * @param {Array} tableNames  The names of the tables to query
   * @return {Select}
   */
  tables(tableNames) {
    this._tables.push(...tableNames);
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
   * Add an INNER JOIN expression (same as .innerJoin())
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
    this._joins = this._joins.filter(join => {
      const regex = new RegExp(`^([A-Z]+) JOIN ${table}\\b`);
      return !regex.test(join);
    });
    return this;
  }

  /**
   * Utility function to add conditions for a clause (WHERE, HAVING)
   * @param {Array} collection  The collection to add the clauses to (e.g. this._wheres or this._havings)
   * @param {Array} criteria  A list of expressions to stringify
   * @property {*} criteria[0]  The expression or name of the column on which to match
   * @property {*} [criteria[1]]  The comparison operator; defaults to "="
   * @property {*} [criteria[2]]  The value to test against
   * @example  The following are equivalent
   *     this._conditions(this._wheres, ['deleted_at IS NULL']);
   *     this._conditions(this._wheres, ['deleted_at', null]);
   *     this._conditions(this._wheres, ['deleted_at', '=', null]);
   * @example  More examples
   *     this._conditions(this._wheres, ['fname', 'LIKE', 'joe']); // `fname` LIKE 'joe'
   *     this._conditions(this._wheres, ['fname', 'LIKE ?', 'joe']); // `fname` LIKE 'joe'
   *     this._conditions(this._wheres, ['fname LIKE %?%', 'joe']); // `fname` LIKE '%joe%'
   *     this._conditions(this._wheres, ['fname LIKE ?%', 'joe']); // `fname` LIKE 'joe%'
   *     this._conditions(this._wheres, ['fname', 'LIKE ?%', 'joe']); // `fname` LIKE 'joe%'
   *     this._conditions(this._wheres, ['price >', 10]); // `price` > 10
   *     this._conditions(this._wheres, ['price', '>', 10]); // `price` > 10
   *     this._conditions(this._wheres, ['price =', 10]); // `price` = 10
   *     this._conditions(this._wheres, ['price !=', 10]); // `price` != 10
   *     this._conditions(this._wheres, ['price', 10]); // `price` = 10
   *     this._conditions(this._wheres, ['price', '=', 10]); // `price` = 10
   *     this._conditions(this._wheres, ['price', '!=', 10]); // `price` != 10
   *     this._conditions(this._wheres, ['price', 'BETWEEN', [10,20]]); // `price` BETWEEN 10 AND 20
   *     this._conditions(this._wheres, ['price', 'NOT BETWEEN', [10,20]]); // `price` NOT BETWEEN 10 AND 20
   *     this._conditions(this._wheres, ['price', [10,20]]); // `price` IN(10,20)
   *     this._conditions(this._wheres, ['price', '=', [10,20]]); // `price` IN(10,20)
   *     this._conditions(this._wheres, ['price', 'IN', [10,20]]); // `price` IN(10,20)
   *     this._conditions(this._wheres, ['price', 'NOT IN', [10,20]]); // `price` NOT IN(10,20)
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
      forOwn(column, (val, name) => {
        this._conditions(collection, [name, val]);
      });
      return this;
    }
    if (/^\w+$/.test(column)) {
      column = this.adapter.escapeId(column);
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
      substrCount(column, '?') === operator.length
    ) {
      // column is a string with question marks and operator is an array of replacements
      // e.g. query.where('SUBSTR(prefs, ?, ?) = role', [1, 4]);
      const values = operator;
      let i = 0;
      const sql = column.replace(/(%|)\?(%|)/g, ($0, $1, $2) => {
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
    const likeMatch = operator.match(
      /^(LIKE|NOT LIKE)(?: (\?|\?%|%\?|%\?%))?$/i
    );
    if (operator === 'NOT BETWEEN' || operator === 'BETWEEN') {
      // expect a two-item array
      const from = this.adapter.escape(value[0]);
      const to = this.adapter.escape(value[1]);
      collection.push(`${column} ${operator} ${from} AND ${to}`);
    } else if (likeMatch) {
      const like = likeMatch[1].toUpperCase(); // Either LIKE or NOT LIKE
      const infix = likeMatch[2]; // ONE OF ?% or %?% or %? or ?
      if (Array.isArray(value)) {
        const ors = [];
        for (const v of value) {
          const quoted = this.escapeLike(infix, v);
          ors.push(`${column} ${like} ${quoted}`);
        }
        const joined = ors.join(' OR ');
        collection.push(`(${joined})`);
      } else {
        const quoted = this.escapeLike(infix, value);
        collection.push(`${column} ${like} ${quoted}`);
      }
    } else if (value === null) {
      collection.push(
        operator === '=' ? `${column} IS NULL` : `${column} IS NOT NULL`
      );
    } else if (Array.isArray(value)) {
      // an array of values should be IN or NOT IN
      const inVals = value.map(v => this.adapter.escape(v));
      const joined = inVals.join(',');
      collection.push(
        operator === '=' || operator === 'IN'
          ? `${column} IN(${joined})`
          : `${column} NOT IN(${joined})`
      );
    } else if (operator === 'IN' || operator === 'NOT IN') {
      // in clause that is not array
      value = this.adapter.escape(value);
      collection.push(`${column} ${operator}(${value})`);
    } else {
      value = this.adapter.escape(value);
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
    const isNullish = v =>
      v === undefined || v === null || v === false || isNaN(v);
    if (!isNullish(twoValueArray[0]) && !isNullish(twoValueArray[1])) {
      this.where(column, 'BETWEEN', twoValueArray);
    } else if (!isNullish(twoValueArray[0]) && isNullish(twoValueArray[1])) {
      this.where(column, '>=', twoValueArray[0]);
    } else if (isNullish(twoValueArray[0]) && !isNullish(twoValueArray[1])) {
      this.where(column, '<=', twoValueArray[1]);
    } else {
      // both are nullish!
      throw new Error(
        'Select.whereBetween(): Array must have at least 1 non nullish value'
      );
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

    // TODO: something wrong with this loop
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

  /**
   * Add an OR with conditions under the HAVING clause
   * @param {Array[]} conditions
   * @returns {Select}
   */
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
   * Check to see if the given string is ? or a bound variable like :var
   * @param {String} string  The input string
   * @return {Boolean}
   * @private
   */
  _isPlaceholder(string) {
    return string === '?' || /^:\w+$/.test(string);
  }

  /**
   * Check to see if the given string is 0 or all digits not starting with 0
   * @param {String} string  The input string
   * @return {Boolean}
   * @private
   */
  _isEntirelyDigits(string) {
    return /^(0|[1-9]\d*)$/.test(string);
  }

  /**
   * Check to see if the given string is all digits
   * @param {String} string  The input string
   * @return {Boolean}
   * @private
   */
  _isEntirelyDigitsNoZeros(string) {
    return /^[1-9]\d*$/.test(string);
  }

  /**
   * Limit results to the given number
   * @param {Number|String} max  The number to limit by (placeholder string or integer greater than 0)
   * @return {Select}
   */
  limit(max) {
    if (typeof max === 'string') {
      max = max.trim();
      if (this._isPlaceholder(max)) {
        // is a placeholder like ? or :var
        this._limit = max;
      } else if (this._isEntirelyDigitsNoZeros(max)) {
        // is entirely digits (no leading zeros)
        this._limit = parseInt(max, 10);
      }
    } else if (typeof max === 'number' && Number.isInteger(max) && max >= 1) {
      this._limit = max;
    }
    return this;
  }

  /**
   * Fetch results from the given offset
   * @param {Number|String} number  The offset (placeholder string or integer greater than or equal to 0)
   * @return {Select}
   */
  offset(number) {
    if (typeof number === 'string') {
      number = number.trim();
      if (this._isPlaceholder(number)) {
        // is a placeholder like ? or :var
        this._offset = number;
      } else if (this._isEntirelyDigits(number)) {
        // is entirely digits (or zero)
        this._offset = parseInt(number, 10);
      }
    } else if (
      typeof number === 'number' &&
      Number.isInteger(number) &&
      number >= 0
    ) {
      this._offset = number;
    }
    return this;
  }

  /**
   * Set the offset based on the limit with the given page number
   * @param {Number|String} number  The page number (integer greater than 0)
   * @return {Select}
   */
  page(number) {
    if (typeof number === 'string') {
      number = number.trim();
      if (this._isEntirelyDigitsNoZeros(number)) {
        // is entirely digits (no leading zeros)
        this._page = parseInt(number, 10);
      }
    } else if (
      typeof number === 'number' &&
      Number.isInteger(number) &&
      number >= 1
    ) {
      this._page = number;
    }
    return this;
  }
}
