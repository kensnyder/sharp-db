const Parser = require('../Parser/Parser.js');
const Db = require('../Db/Db.js');
const cloneDeep = require('lodash.clonedeep');
const escapeRegExp = require('lodash.escaperegexp');
const forOwn = require('lodash.forown');
const uniq = require('lodash.uniq');
const substrCount = require('quickly-count-substrings');
const mysql = require('mysql2');

/**
 * Build a select query
 * Class Select
 */
class Select {
	parse(sql) {
		this.reset();
		const parser = new Parser(this);
		parser.parse(sql);
		return this;
	}

	static parse(sql) {
		const db = Db.factory();
		return Select.init(db).parse(sql);
	}

	/**
	 * Select constructor
	 */
	constructor(Db) {
		this.db = Db;
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
				[
					'option',
					'column',
					'table',
					'where',
					'having',
					'groupBy',
					'orderBy',
				].indexOf(field) > -1
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
	}

	// 		/**
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
		this._hasOne.push({ thisProperty, thatTableAndColumn });
		return this;
	}

	belongsTo(thisProperty, thatTableAndColumn) {
		this._belongsTo.push({ thisProperty, thatTableAndColumn });
		return this;
	}

	hasMany(thisProperty, thatTableAndColumn) {
		this._hasMany.push({ thisProperty, thatTableAndColumn });
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
		let [_, joinTable, throughTable, foreignColumn] =
			matchJoinFirst || matchJoinSecond;
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
	 * @param {Object|String} placeholder  The name of the placeholder or an object with placeholder: value pairs
	 * @param {*} [value=null]  The value to bind when placeholder is a string
	 * @example
	 *     query.bind('postId', 123); // replace :postId with '123'
	 * @return {Select}
	 */
	bind(placeholder, value = null) {
		if (typeof placeholder === 'object' && value === null) {
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
		const records = await this.db.select(options, this._bound);
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
		return this.db.selectHash(this.toString(), this._bound);
	}

	/**
	 * Fetch the value of first column of the first record
	 * @return {Promise}
	 */
	fetchValue() {
		return this.db.selectValue(this.toString(), this._bound);
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
	 *      const query = Select.parse('SELECT * FROM comments');
	 *      const byUser = query.fetchGrouped('user_id')
	 *      // a key for each user id with an array of comments for each key
	 * @return {Array}
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
	 * @return {Select}
	 */
	getClone() {
		const copy = new Select();
		copy._hasOne = cloneDeep(this._hasOne);
		copy._belongsTo = cloneDeep(this._belongsTo);
		copy._hasMany = cloneDeep(this._hasMany);
		copy._habtm = cloneDeep(this._habtm);
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

	getFoundRowsSql(countExpr, normalize = false) {
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
	foundRows(countExpr = '*') {
		const sql = this.getFoundRowsSql(countExpr);
		return this.db.selectValue(sql, this._bound);
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
			ids = uniq(ids);
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
		const ids = uniq(records.map(r => r.id));
		this._belongsTo.forEach(async spec => {
			const [table, column] = spec.thatTableAndColumn.split('.');
			const indexed = await Select.init(this.db)
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
		const ids = uniq(records.map(r => r.id));
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
		const ids = uniq(records.map(r => r.id));
		this._habtm.forEach(async spec => {
			// const { joinTableQuery, foreignTable } = spec;
			// const joinTableLookup = await this.db.selectGrouped('user_id', joinTableQuery, ids);
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
		table = escapeRegExp(table);
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
		const likeMatch = operator.match(
			/^(LIKE|NOT LIKE)(?: (\?|\?%|%\?|%\?%))?$/
		);
		if (operator === 'NOT BETWEEN' || operator === 'BETWEEN') {
			// expect a two-item array
			const from = mysql.escape(value[0]);
			const to = mysql.escape(value[1]);
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
			collection.push(`${column} ${operator} (${value})`);
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
		return mysql.escape(value);
	}

	/**
	 * Manually escape a value without quotes
	 * @param {*} value  The value to escape without quotes
	 * @return {string}
	 */
	escapeQuoteless(value) {
		const escaped = mysql.escape(value);
		if (escaped.slice(0, 1) === "'" && escaped.slice(-1) === "'") {
			return escaped.slice(1, -1);
		}
		return value;
	}
}

module.exports = Select;
