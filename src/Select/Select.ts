import mysql, { type FieldInfo } from 'mysql';
import Parser from '../Parser/Parser';
import Db from '../Db/Db';
import { cloneDeep, escapeRegExp } from 'lodash-es';
import forOwn from '../forOwnDefined/forOwnDefined';
import substrCount from 'quickly-count-substrings';
import { SqlOptionsInterface } from '../types';

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
export default class Select {
	_options: string[];
	_tables: string[];
	_columns: string[];
	_joins: string[];
	_wheres: string[];
	_groupBys: string[];
	_orderBys: string[];
	_havings: string[];
	_page: number;
	_limit: number;
	_offset: number;
	db: Db;
	_bound: Record<string, any>;
	_siblings: Record<string, any>[];
	_children: Record<string, any>[];
	/**
	 * Load the given SQL into this object
	 * @param sql  The SQL to parse
	 * @returns
	 */
	parse(sql: string) {
		this.reset();
		const parser = new Parser(this);
		parser.parse(sql);
		return this;
	}

	/**
	 * Return a new Select object that matches the given SQL
	 * @param sql  The SQL to parse
	 * @param [db=null]  The Db instance to use for queries
	 * @returns  A new Select instance
	 */
	static parse(sql: string, db: Db = null): Select {
		return Select.init(db).parse(sql);
	}

	/**
	 * Select constructor
	 * @param [db]  The Db instance to use
	 */
	constructor(db: Db = null) {
		this.db = db || Db.factory();
		this.reset();
	}

	/**
	 * Shortcut to initialize without the `new` keyword
	 * @param [db]  The Db instance to use
	 * @return A new Select instance
	 */
	static init(db: Db = null) {
		return new Select(db || Db.factory());
	}

	/**
	 * Get the SQL as a pretty-printed string
	 * @return The SQL query as a string
	 */
	toString(): string {
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

		return lines.filter(Boolean).join('\n').trim();
	}

	/**
	 * Get the SQL as a one-line string
	 * @return The SQL query as a string without newlines or indents
	 */
	normalized() {
		const lines = [
			'SELECT',
			this._options.length ? this._options.join(' ') : null,
			this._columns.length ? this._columns.join(', ') : '*',
			`FROM ${this._tables.join(', ')}`,
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
			if (this._limit) {
				lines.push(`LIMIT ${this._limit}`);
			}
			if (this._offset) {
				lines.push(`OFFSET ${this._offset}`);
			}
		}

		return lines.filter(Boolean).join(' ').trim();
	}

	/**
	 * Get normalized SQL with all parameters bound
	 * @returns
	 */
	toBoundSql(): string {
		const sql = this.normalized();
		const options = this.db.bindArgs(sql, [this._bound]);
		return options.sql;
	}

	/**
	 * @param {String|Array} [field]  If given, reset the given component(s), otherwise reset all query components
	 *     Valid components: option, column, table, where, orWhere, having, groupBy, orderBy, limit, offset, page
	 * @return This object
	 * @chainable
	 */
	reset(field: FieldName | FieldName = null) {
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
	 * Specify data from a sibling table be spliced in
	 * Can be used for one-to-one or many-to-one relationships
	 * @param roperty  The name of the property into which to splice
	 * @param siblingQuery  The Select query to fetch the sibling data
	 * @returns
	 * @chainable
	 */
	withSiblingData(property: string, siblingQuery: Select) {
		this._siblings.push({ property, query: siblingQuery });
		return this;
	}

	/**
	 * Specify data from a child table to be spliced in
	 * Can be used for one-to-many or many-to-many relationships
	 * @param property  The name of the property into which to splice
	 * @param childQuery  The Select query to fetch the child data
	 * @returns
	 * @chainable
	 */
	withChildData(property: string, childQuery: Select) {
		this._children.push({ property, query: childQuery });
		return this;
	}

	/**
	 * Bind values by name to the query
	 * @param placeholder  The name of the placeholder or an object with placeholder: value pairs
	 * @param [value=null]  The value to bind when placeholder is a string
	 * @example
	 *     query.bind('postId', 123); // replace :postId with 123
	 *     query.bind({ postId: 123 }); // replace :postId with 123
	 * @return {Select}
	 */
	bind(placeholder: Record<string, any> | any, value: any = null) {
		if (typeof placeholder === 'object') {
			forOwn(placeholder, (val, field) => {
				this._bound[field] = val;
			});
			return this;
		}
		this._bound[placeholder] = value;
		return this;
	}

	/**
	 * Unbind a previously bound property
	 * @param [placeholder]
	 * @return
	 */
	unbind(placeholder: string = null) {
		if (placeholder) {
			this._bound[placeholder] = undefined;
		} else {
			this._bound = {};
		}
		return this;
	}

	/**
	 * Fetch records and splice in related data
	 * @param Query options
	 * @return
	 */
	async fetch(options: SqlOptionsInterface = {}): Promise<{
		queries: string[];
		results: Record<string, any>[];
		fields: FieldInfo[];
	}> {
		options.sql = this.toString();
		const {
			query: initialSql,
			results,
			fields,
		} = await this.db.select(options, this._bound);
		const queries1 = await this._spliceChildData(results);
		const queries2 = await this._spliceSiblingData(results);
		const queries = [initialSql, ...queries1, ...queries2];
		return { queries, results, fields };
	}

	/**
	 * Fetch the first matched record
	 * @return {Object|null}
	 */
	async fetchFirst(options: SqlOptionsInterface = {}) {
		options.sql = this.toString();
		const oldLimit = this._limit;
		this.limit(1);
		const { queries, results, fields } = await this.fetch(options);
		this.limit(oldLimit);
		return { queries, results: results[0], fields };
	}

	/**
	 * Fetch each record as an object with key-value pairs
	 * @return {Promise<Object>}
	 */
	fetchHash(options: SqlOptionsInterface = {}) {
		options.sql = this.toString();
		return this.db.selectHash(options, this._bound);
	}

	/**
	 * Fetch each record as an array of values
	 * @return {Promise<Object>}
	 */
	fetchList(options: SqlOptionsInterface = {}) {
		options.sql = this.toString();
		return this.db.selectList(options, this._bound);
	}

	/**
	 * Fetch the value of first column of the first record
	 * @return {Promise}
	 */
	fetchValue(options: SqlOptionsInterface = {}) {
		options.sql = this.toString();
		return this.db.selectValue(options, this._bound);
	}

	/**
	 * Fetch values and index by the given field name
	 * @param {String} byField  The field by which to index (e.g. id)
	 * @return {Promise<Object>}
	 */
	async fetchIndexed(byField: string, options: SqlOptionsInterface = {}) {
		options.sql = this.toString();
		const { queries, results, fields } = await this.fetch(options);
		const indexed = {};
		results.forEach(r => (indexed[r[byField]] = r));
		return { queries, results: indexed, fields };
	}

	/**
	 * Fetch values grouped by the given field name
	 * @param {String} byField  The field by which to group
	 * @example
	 *      const query = Select.parse('SELECT * FROM comments');
	 *      const byUser = query.fetchGrouped('user_id')
	 *      // a key for each user id with an array of comments for each key
	 * @return {Array}
	 */
	async fetchGrouped(byField: string, options: SqlOptionsInterface = {}) {
		options.sql = this.toString();
		const { query, results, fields } = await this.fetch(options);
		const grouped = {};
		results.forEach(r => {
			if (!grouped[r[byField]]) {
				grouped[r[byField]] = [];
			}
			grouped[r[byField]].push(r);
		});
		return { query, results: grouped, fields };
	}

	/**
	 * Clone this object
	 * @return {Select}
	 */
	getClone() {
		const copy = new Select();
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
			clone._columns = [`COUNT(${countExpr}) AS foundRows`];
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
	getFoundRowsSql(countExpr = '*', normalize = false) {
		const query = this.getFoundRowsQuery(countExpr);
		if (this._havings.length === 0) {
			return normalize ? query.normalized() : query.toString();
		} else if (normalize) {
			const subquerySql = query.normalized();
			return `SELECT COUNT(*) AS foundRows FROM (${subquerySql}) AS subq`;
		} else {
			const subquerySql = query.toString().replace(/\n/g, '\n\t');
			return `SELECT COUNT(*) AS foundRows FROM (\n\t${subquerySql}\n) AS subq`;
		}
	}

	/**
	 * Run a version of this query that simply returns COUNT(*)
	 * @param {String} [countExpr="*"]  Use to specify `DISTINCT colname` if needed
	 * @return {Promise<Number>}  The number of rows or false on error
	 */
	foundRows(countExpr = '*', options = {}) {
		options.sql = this.getFoundRowsSql(countExpr);
		return this.db.selectValue(options, this._bound);
	}

	/**
	 * Extract the name of the first bound variable
	 * E.g. given "SELECT * FROM users WHERE id IN(:id)" it would return "id"
	 * @param {String} sql
	 * @returns {*|string}
	 * @private
	 */
	static _extractBindingName(sql) {
		const match = sql.match(/:([\w_]+)/);
		if (!match) {
			throw new Error(`Unable to find bound variable in SQL "${sql}"`);
		}
		return match[1];
	}

	/**
	 * Fetch sibling data and splice it into the given result set
	 * @param {Array} queries  The final SQL statements that were executed
	 */
	async _spliceSiblingData(records) {
		if (this._siblings.length === 0 || records.length === 0) {
			return [];
		}
		const sqlQueries = [];
		for (const { property, query } of this._siblings) {
			const onColumn = Select._extractBindingName(query.toString());
			const values = records.map(record => record[onColumn]);
			query.bind(onColumn, values);
			const { queries, results, fields } = await query.fetch();
			const indexed = {};
			const firstField = fields[0].name;
			results.forEach(result => {
				const key = result[firstField];
				indexed[key] = result;
			});
			records.forEach(record => {
				record[property] = indexed[record[onColumn]];
			});
			sqlQueries.push(...queries);
		}
		return sqlQueries;
	}

	/**
	 * Fetch child data and splice it into the given result set
	 * @param {Array} queries  The final SQL statements that were executed
	 */
	async _spliceChildData(records) {
		if (this._children.length === 0 || records.length === 0) {
			return [];
		}
		const sqlQueries = [];
		for (const { property, query } of this._children) {
			const onColumn = Select._extractBindingName(query.toString());
			const values = records.map(record => record[onColumn]);
			query.bind(onColumn, values);
			const { queries, results, fields } = await query.fetch();
			const firstField = fields[0].name;
			const grouped = {};
			results.forEach(result => {
				const key = result[firstField];
				if (!grouped[key]) {
					grouped[key] = [];
				}
				grouped[key].push(result);
			});
			records.forEach(record => {
				record[property] = grouped[record[onColumn]] || [];
			});
			sqlQueries.push(...queries);
		}
		return sqlQueries;
	}

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
		table = escapeRegExp(table);
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
			column = mysql.escapeId(column);
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
			const from = mysql.escape(value[0]);
			const to = mysql.escape(value[1]);
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
			const inVals = value.map(v => mysql.escape(v));
			const joined = inVals.join(',');
			collection.push(
				operator === '=' || operator === 'IN'
					? `${column} IN(${joined})`
					: `${column} NOT IN(${joined})`
			);
		} else if (operator === 'IN' || operator === 'NOT IN') {
			// in clause that is not array
			value = mysql.escape(value);
			collection.push(`${column} ${operator}(${value})`);
		} else {
			value = mysql.escape(value);
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

	/**
	 * Manually escape a value
	 * @param {*} value  The value to escape
	 * @return {string}
	 */
	escape(value) {
		return this.db.escape(value);
	}

	/**
	 * Manually escape a value without quotes
	 * @param {*} value  The value to escape without quotes
	 * @return {string}
	 */
	escapeQuoteless(value) {
		return this.db.escapeQuoteless(value);
	}

	/**
	 * Get the proper escaping for a LIKE or NOT LIKE clause
	 * @param {String} infix  One of ?% or %?% or %? or ?
	 * @param {String} value  The value to search for
	 * @return {String}
	 */
	escapeLike(infix, value) {
		return this.db.escapeLike(infix, value);
	}
}
