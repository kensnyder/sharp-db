const capitalize = require('lodash/capitalize');
const camelCase = require('lodash/camelCase');
const upperFirst = require('lodash/upperFirst');

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
	 * @private
	 */
	_stripComments(sql) {
		// multiline comments
		sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
		// single line comments -- dashes
		sql = sql.replace(/--([\r\n]|\s+[^\r\n]+[\r\n])/g, '');
		// single line comments #hashes
		sql = sql.replace(/#[^\r\n]+[\r\n]/g, '');
		return sql;
	}

	/**
	 * Before splitting into SQL clauses, extract some regex-able subqueries
	 * @param {String} sql  The unparsed sql string
	 * @return {Object}  An array with new sql and subqueries
	 * @private
	 */
	_extractSubqueries(sql) {
		const subqueries = {};
		let i = 0;
		const extractor = $0 => {
			const placeholder = `~~SUBQUERY_${i++}~~`;
			subqueries[placeholder] = $0;
			return placeholder;
		};
		// subselect in FROM clause
		sql = sql.replace(/\(\s*SELECT\s+.+\)\s+AS\s+[^\s,]+/, extractor);
		// IF() in FROM clause
		sql = sql.replace(/\bIF\s*\(.+\)\s+AS\s+[^\s,]+/, extractor);
		// IN (SELECT *) in JOINs, WHERE or HAVING
		sql = sql.replace(/\bIN\s*\(\s*SELECT\s.+?\)/, extractor);
		return { sql, subqueries };
	}

	/**
	 * Inject column subqueries back into this object
	 * @param {Object} subqueries  The lookup of extracted subqueries
	 * @private
	 */
	_injectSubqueries(subqueries) {
		const replacer = $0 => {
			return subqueries[$0] || $0;
		};
		const mapper = clause => {
			return clause.replace(/~~SUBQUERY_\d+~~/g, replacer);
		};
		this.query._columns = this.query._columns.map(replacer);
		this.query._joins = this.query._joins.map(mapper);
		this.query._wheres = this.query._wheres.map(mapper);
		this.query._havings = this.query._havings.map(mapper);
	}

	/**
	 * Split SQL into clauses (used by ::parse())
	 * @param {String} sql  The SQL to split
	 * @return {String[]}
	 * @private
	 */
	_split(sql) {
		const splitter =
			/(?:^|\s)(SELECT|FROM|(?:INNER|LEFT\s+OUTER|RIGHT\s+OUTER|LEFT|RIGHT|CROSS|FULL|FULL\s+OUTER)\s+JOIN|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET)\b/i;
		return sql.split(splitter);
	}

	/**
	 * Get a QuickSelect object representing the given SQL SELECT statement
	 * @param {String} rawSql  The raw SQL for the SELECT statement
	 * @return {Boolean}
	 */
	parse(rawSql) {
		const stripped = this._stripComments(rawSql);
		const { sql, subqueries } = this._extractSubqueries(stripped);
		const expressions = this._split(sql);
		let i = 1;
		while (i < expressions.length) {
			const rawKeyword = expressions[i++].trim();
			const keyword = upperFirst(camelCase(rawKeyword));
			const clause = expressions[i++].trim();
			const handler = `_handle${keyword}`;
			this[handler](clause);
		}
		this._injectSubqueries(subqueries);
		return true;
	}

	/**
	 * Handle SQL_CALC_FOUND_ROWS and column names
	 * @param {String} clause  The clause after the SELECT
	 * @private
	 */
	_handleSelect(clause) {
		let columns = clause.split(/s*,s*/);
		// now handle parenthesis expressions that contain commas
		let buffer = '';
		columns.forEach((column, i) => {
			if (i === 0) {
				const optionRegex = /^(SQL_CALC_FOUND_ROWS)\s+/i;
				const match = column.match(optionRegex);
				if (match) {
					this.query.option(match[1]);
					column = column.replace(optionRegex, '');
				}
			}
			if (buffer.length) {
				// we are in the middle of an expression containing parenthesis
				if (column.indexOf(')') > 0) {
					// we have an end parenthesis
					buffer += column;
					this.query.column(buffer.trim());
					buffer = '';
				} else {
					buffer += column + ',';
				}
			} else if (column.match(/\([^)]+$/)) {
				buffer = column + ',';
			} else {
				this.query.column(column.trim());
			}
		});
	}

	/**
	 * Handle table names
	 * @param {String} clause  The clause after the FROM
	 * @private
	 */
	_handleFrom(clause) {
		const tables = clause.split(/\s*,\s*/);
		tables.forEach(table => this.query.table(table));
	}

	/**
	 * Handle INNER JOIN statements
	 * @param {String} clause  The clause after the INNER JOIN
	 * @private
	 */
	_handleInnerJoin(clause) {
		this.query.innerJoin(clause);
	}

	/**
	 * Handle LEFT JOIN statements
	 * @param {String} clause  The clause after the LEFT JOIN
	 * @private
	 */
	_handleLeftJoin(clause) {
		this.query.leftJoin(clause);
	}

	/**
	 * Handle LEFT OUTER JOIN statements
	 * @param {String} clause  The clause after the LEFT OUTER JOIN
	 * @private
	 */
	_handleLeftOuterJoin(clause) {
		this.query.leftOuterJoin(clause);
	}

	/**
	 * Handle RIGHT JOIN statements
	 * @param {String} clause  The clause after the RIGHT JOIN
	 * @private
	 */
	_handleRightJoin(clause) {
		this.query.rightJoin(clause);
	}

	/**
	 * Handle RIGHT OUTER JOIN statements
	 * @param {String} clause  The clause after the RIGHT OUTER JOIN
	 * @private
	 */
	_handleRightOuterJoin(clause) {
		this.query.rightOuterJoin(clause);
	}

	/**
	 * Handle CROSS JOIN statements
	 * @param {String} clause  The clause after the CROSS JOIN
	 * @private
	 */
	_handleCrossJoin(clause) {
		this.query.crossJoin(clause);
	}

	/**
	 * Handle FULL JOIN statements
	 * @param {String} clause  The clause after the FULL JOIN
	 * @private
	 */
	_handleFullJoin(clause) {
		this.query.fullJoin(clause);
	}

	/**
	 * Handle FULL OUTER JOIN statements
	 * @param {String} clause  The clause after the FULL OUTER JOIN
	 * @private
	 */
	_handleFullOuterJoin(clause) {
		this.query.fullOuterJoin(clause);
	}

	/**
	 * Handle WHERE conditions
	 * @param {String} clause  All the conditions after WHERE
	 * @private
	 */
	_handleWhere(clause) {
		if (/^(1|'1'|true)$/i.test(clause)) {
			this.query._wheres.push(clause);
		} else {
			this._handleConditions('where', clause);
		}
	}

	/**
	 * Handle HAVING statements
	 * @param {String} clause  All the conditions after HAVING
	 * @private
	 */
	_handleHaving(clause) {
		this._handleConditions('having', clause);
	}

	/**
	 * Build a conditions list
	 * @param {String} type  Either WHERE or HAVING
	 * @param {String} clause  The expressions following the type keyword
	 * @private
	 */
	_handleConditions(type, clause) {
		const andGroups = clause.split(/\bAND\b/i);
		andGroups.forEach(andGroup => {
			const orPieces = andGroup.split(/\bOR\b/i).map(str => str.trim());
			if (orPieces.length === 1) {
				// no OR operators
				const fn = type; // either where or having
				this.query[fn](orPieces[0]);
			} else {
				// some OR operators
				const orFn = 'or' + capitalize(type); // either orWhere or orHaving
				this.query[orFn](orPieces);
			}
		});
	}

	/**
	 * Handle GROUP BY statements
	 * @param {String} clause  The clauses after the GROUP BY
	 * @private
	 */
	_handleGroupBy(clause) {
		const columns = clause.split(/\s*,\s*/);
		columns.forEach(column => this.query.groupBy(column));
	}

	/**
	 * Handle ORDER BY statements
	 * @param {String} clause  The clause after the ORDER BY
	 * @private
	 */
	_handleOrderBy(clause) {
		const columns = clause.split(/\s*,\s*/);
		columns.forEach(column => this.query.orderBy(column));
	}

	/**
	 * Handle LIMIT statements including "LIMIT #" and "LIMIT #, #"
	 * @param {String} clause  The clause after the LIMIT
	 * @private
	 */
	_handleLimit(clause) {
		const offsetLimit = clause.match(/^(\d+|\?|:\w+)\s*,\s*(\d+|\?|:\w+)$/);
		if (offsetLimit) {
			this.query.offset(offsetLimit[1]);
			this.query.limit(offsetLimit[2]);
		} else {
			this.query.limit(clause);
		}
	}

	/**
	 * Handle OFFSET statements
	 * @param {String} clause  The number after the OFFSET
	 * @private
	 */
	_handleOffset(clause) {
		this.query.offset(clause);
	}
}

module.exports = Parser;
