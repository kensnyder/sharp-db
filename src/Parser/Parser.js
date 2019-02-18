import capitalize from 'lodash.capitalize';
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
		// single line comments
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
		};
		// subselect in FROM clause
		sql = sql.replace(/(s*SELECTs+.+)s+ASs+[^s,]+/, extractor);
		// IF() in FROM clause
		sql = sql.replace(/IF(.+)s+ASs+[^s,]+/, extractor);
		return { sql, subqueries };
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
				let fragments = expr.split(/s*,s*/);
				// now handle parenthesis expressions that contain commas
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
			const orPieces = andGroup.split(/\bOR\b/i).map(trim);
			if (orPieces.length === 1) {
				// no OR operators
				const fn = type.toLowerCase(); // either where or having
				this.query[fn](orPieces[0]);
			} else {
				// some OR operators
				const orFn = 'or' + capitalize(type); // either orWhere or orHaving
				this.query[orFn](orPieces);
			}
		});
	}
}
