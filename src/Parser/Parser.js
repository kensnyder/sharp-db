import capitalize from 'lodash.capitalize';
import camelCase from 'lodash.camelcase';
import upperFirst from 'lodash.upperfirst';
import trim from 'lodash.trim';

/**
 * Parse SQL and populate onto a Select query object
 */
export class Parser {
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
		sql = sql.replace(/\bIN\s*\(SELECT\s.+?\)/, extractor);
		return { sql, subqueries };
	}

	/**
	 * Inject column subqueries back into this object
	 * @param {Object} subqueries  The lookup of extracted subqueries
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
	 */
	_split(sql) {
		const splitter = /\b(SELECT|FROM|(?:INNER |LEFT OUTER |RIGHT OUTER |LEFT |RIGHT |CROSS |FULL |FULL OUTER )JOIN|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET)\b/i;
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
				buffer += column + ',';
				if (column.indexOf(')') > 0) {
					// we have an end parenthesis
					buffer = '';
				}
			} else if (column.match(/\([^)]+$/)) {
				buffer = column + ',';
			} else {
				this.query.column(column.trim());
			}
		});
	}

	_handleFrom(clause) {
		const tables = clause.split(/\s*,\s*/);
		tables.forEach(table => this.query.table(table));
	}

	_handleJoin(clause) {
		this.query.innerJoin(clause);
	}

	_handleInnerJoin(clause) {
		this.query.innerJoin(clause);
	}

	_handleLeftJoin(clause) {
		this.query.leftJoin(clause);
	}

	_handleLeftOuterJoin(clause) {
		this.query.leftOuterJoin(clause);
	}

	_handleRightJoin(clause) {
		this.query.rightJoin(clause);
	}

	_handleRightOuterJoin(clause) {
		this.query.rightOuterJoin(clause);
	}

	_handleCrossJoin(clause) {
		this.query.crossJoin(clause);
	}

	_handleFullJoin(clause) {
		this.query.fullJoin(clause);
	}

	_handleFullOuterJoin(clause) {
		this.query.fullOuterJoin(clause);
	}

	_handleWhere(clause) {
		if (/^(1|'1'|true)$/i.test(clause)) {
			this.query._wheres.push(clause);
		} else {
			this._handleConditions('where', clause);
		}
	}

	_handleHaving(clause) {
		this._handleConditions('having', clause);
	}

	/**
	 * Build a conditions list
	 * @param {String} type  Either WHERE or HAVING
	 * @param {String} clause  The expressions following the type keyword
	 */
	_handleConditions(type, clause) {
		const andGroups = clause.split(/\bAND\b/i);
		andGroups.forEach(andGroup => {
			const orPieces = andGroup.split(/\bOR\b/i).map(trim);
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

	_handleGroupBy(clause) {
		const columns = clause.split(/\s*,\s*/);
		columns.forEach(column => this.query.groupBy(column));
	}

	_handleOrderBy(clause) {
		const columns = clause.split(/\s*,\s*/);
		columns.forEach(column => this.query.orderBy(column));
	}

	_handleLimit(clause) {
		this.limit(clause);
	}

	_handleOffset(clause) {
		this.offset(clause);
	}
}
