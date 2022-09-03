const mysql = require('mysql2');
const chunk = require('lodash/chunk');
const forOwn = require('../forOwnDefined/forOwnDefined.js');

class SqlBuilder {
	/**
	 * Escape an identifier such as a table or column
	 * @param identifier
	 * @return {*}
	 */
	static quote(identifier) {
		if (/[`()]/.test(identifier)) {
			return identifier;
		}
		let quoted = mysql.escapeId(identifier);
		if (/`\*`$/.test(quoted)) {
			quoted = quoted.slice(0, -3) + '*';
		}
		return quoted;
	}

	static escape(value) {
		return mysql.escape(value);
	}

	/**
	 * Build a basic SELECT statement
	 * @param {String} table  The name of the table
	 * @param {Array} fields  An array of field names to select
	 * @param {Object} criteria  Params to construct the WHERE clause - see SqlBuilder#buildWheres
	 * @param {String} extra  Additional raw SQL such as GROUP BY, ORDER BY, or LIMIT
	 * @return {String}
	 * @see SqlBuilder#buildWheres
	 * @see Db#selectFrom
	 * @see Select
	 */
	static selectFrom(table, fields = [], criteria = {}, extra = '') {
		if (!Array.isArray(fields)) {
			throw new Error('SqlBuilder.selectFrom fields must be an array');
		}
		if (typeof criteria !== 'object') {
			throw new Error('SqlBuilder.selectFrom criteria must be an array');
		}
		const escFields = fields.map(field => SqlBuilder.quote(field));
		const escFieldsString = fields.length ? escFields.join(', ') : '*';
		const escTable = SqlBuilder.quote(table);
		const escWhere = SqlBuilder.buildWheres(criteria);
		const sql = `SELECT ${escFieldsString} FROM ${escTable} WHERE ${escWhere} ${extra}`;
		return sql.trim();
	}

	static insertInto(table, insert) {
		const sets = [];
		forOwn(insert, (value, field) => {
			sets.push(SqlBuilder.quote(field) + '=' + SqlBuilder.escape(value));
		});
		if (sets.length === 0) {
			throw new Error(
				'SqlBuilder.insertInto requires a non-empty insert Object'
			);
		}
		const escTable = SqlBuilder.quote(table);
		const setSql = sets.join(', ');
		return `INSERT INTO ${escTable} SET ${setSql}`;
	}
	static insertIntoOnDuplicateKeyUpdate(table, insert, update) {
		const sets = [];
		forOwn(insert, (value, field) => {
			sets.push(SqlBuilder.quote(field) + '=' + SqlBuilder.escape(value));
		});
		if (sets.length === 0) {
			throw new Error(
				'SqlBuilder.insertIntoOnDuplicateKeyUpdate requires a non-empty insert Object'
			);
		}
		// build update expression
		const updates = [];
		forOwn(update, (value, field) => {
			updates.push(SqlBuilder.quote(field) + '=' + SqlBuilder.escape(value));
		});
		if (updates.length === 0) {
			throw new Error(
				'Db.insertIntoOnDuplicateKeyUpdate requires a non-empty update Object'
			);
		}
		table = SqlBuilder.quote(table);
		const setSql = sets.join(', ');
		const updateSql = updates.join(', ');
		// combine
		return `INSERT INTO ${table} SET ${setSql} ON DUPLICATE KEY UPDATE ${updateSql}`;
	}
	static insertExtended(table, inserts) {
		// build insert expression
		if (!Array.isArray(inserts) || inserts.length === 0) {
			throw new Error('Db.insertExtended inserts must be a non-empty array');
		}
		const fields = [];
		forOwn(inserts[0], (value, field) => {
			fields.push(SqlBuilder.quote(field));
		});
		const batches = [];
		inserts.forEach(insert => {
			const values = [];
			forOwn(insert, value => {
				values.push(SqlBuilder.escape(value));
			});
			batches.push('(' + values.join(', ') + ')');
		});
		const escTable = SqlBuilder.quote(table);
		const fieldsSql = fields.join(', ');
		const batchesSql = batches.join(', ');
		return `INSERT INTO ${escTable} (${fieldsSql}) VALUES ${batchesSql}`;
	}
	static updateTable(table, set, where = {}) {
		const sets = [];
		forOwn(set, (value, field) => {
			sets.push(SqlBuilder.quote(field) + '=' + SqlBuilder.escape(value));
		});
		if (sets.length === 0) {
			throw new Error('Db.updateTable requires a non-empty set Object');
		}
		const escTable = SqlBuilder.quote(table);
		const setSql = sets.join(', ');
		const escWhere = SqlBuilder.buildWheres(where);
		return `UPDATE ${escTable} SET ${setSql} WHERE ${escWhere}`;
	}
	static deleteFrom(table, where, limit) {
		const escTable = SqlBuilder.quote(table);
		const escWhere = SqlBuilder.buildWheres(where);
		let sql = `DELETE FROM ${escTable} WHERE ${escWhere}`;
		if (limit > 0) {
			sql += ` LIMIT ${limit}`;
		}
		return sql;
	}
	static exportRows(
		table,
		rows,
		{
			fields = null,
			chunkSize = 250,
			discardIds = false,
			truncateTable = false,
			disableForeignKeyChecks = false,
			lockTables = false,
		} = {}
	) {
		if (rows.length === 0) {
			return '';
		}
		// read field names or infer from rows
		const fieldNames = fields ? fields.map(f => f.name) : Object.keys(rows[0]);
		const quotedFields = fieldNames.map(SqlBuilder.quote);
		const fieldsString = quotedFields.join(',');
		const quotedTable = SqlBuilder.quote(table);
		// start building lines of sql to insert
		const lines = [];
		if (disableForeignKeyChecks) {
			lines.push(
				'/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;'
			);
		}
		if (lockTables) {
			lines.push(`LOCK TABLES ${quotedTable} WRITE;`);
		}
		if (truncateTable) {
			lines.push(`TRUNCATE TABLE ${quotedTable};`);
		}
		// take rows in chunks so a single statement isn't too long
		const chunks = chunk(rows, chunkSize);
		for (const chunkOfRows of chunks) {
			const rowStrings = [];
			for (const values of chunkOfRows) {
				const escapedValues = [];
				// collect the value for each field
				for (const field of fields) {
					if (discardIds && field.name === 'id') {
						escapedValues.push('NULL');
					} else {
						escapedValues.push(SqlBuilder.escape(values[field.name]));
					}
				}
				const valuesString = escapedValues.join(',');
				rowStrings.push(`(${valuesString})`);
			}
			const insertsString = rowStrings.join(',\n');
			lines.push(
				`INSERT INTO ${quotedTable} (${fieldsString}) VALUES\n${insertsString};`
			);
		}
		if (lockTables) {
			lines.push('UNLOCK TABLES;');
		}
		if (disableForeignKeyChecks) {
			lines.push('/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;');
		}
		return lines.join('\n');
	}

	/**
	 * Construct where clause element from the given field and value
	 * @param {String} field  The field or field space operator
	 * @param {*} value  The value to bind
	 * @return {String}
	 * @example
	 * db.buildWhere('start_date BETWEEN', ['2012-01-01','2013-01-01']);
	 * db.buildWhere('start_date >', '2013-01-01');
	 * db.buildWhere('start_date !=', '2013-01-01');
	 * db.buildWhere('start_date', null); // `start_date` IS NULL
	 * db.buildWhere('start_date !=', null); // `start_date` IS NOT NULL
	 * db.buildWhere('id', [1,2,3]); // `id` IN (1,2,3)
	 * db.buildWhere('id !=', [1,2,3]); // `id` NOT IN (1,2,3)
	 * db.buildWhere('id IN', [1,2,3]); // `id` IN (1,2,3)
	 * db.buildWhere('id NOT IN', [1,2,3]); // `id` NOT IN (1,2,3)
	 */
	static buildWhere(field, value = undefined) {
		if (value === undefined) {
			return field;
		}
		let [name, operator] = field.split(/\s+/);
		name = SqlBuilder.quote(name);
		operator = operator ? operator.toUpperCase() : '=';
		if (operator === 'BETWEEN') {
			const val0 = SqlBuilder.escape(value[0]);
			const val1 = SqlBuilder.escape(value[1]);
			return `${name} BETWEEN ${val0} AND ${val1}`;
		} else if (value === null) {
			return operator === '=' ? `${name} IS NULL` : `${name} IS NOT NULL`;
		} else if (Array.isArray(value)) {
			const values = value.map(val => SqlBuilder.escape(val));
			return operator === '=' || operator === 'IN'
				? `${name} IN(${values})`
				: `${name} NOT IN(${values})`;
		}
		const escVal = SqlBuilder.escape(value);
		return `${name} ${operator} ${escVal}`;
	}

	/**
	 * Build a where clause from an object of field-value pairs.
	 * Used internally by #selectFrom, #updateTable, #deleteFrom
	 * @see Db#buildWhere
	 * @param {Object} wheres  An object with field-value pairs (field may be field space operator)
	 * @return {String}
	 * @example
	 * SqlBuilder.buildWheres({
	 *     'start_date BETWEEN: ['2012-01-01','2013-01-01'],
	 *     'start_date >': '2013-01-01',
	 *     'start_date !=': '2013-01-01',
	 *     'start_date': null, // `start_date` IS NULL
	 *     'start_date !=': null, // `start_date` IS NOT NULL
	 *     id: [1,2,3], // `id` IN (1,2,3)
	 *     'id !=': [1,2,3], // `id` NOT IN (1,2,3)
	 *     'id IN': [1,2,3], // `id` IN (1,2,3)
	 *     'id NOT IN': [1,2,3], // `id` NOT IN (1,2,3)
	 * })
	 */
	static buildWheres(wheres) {
		const clauses = [];
		forOwn(wheres, (value, field) => {
			clauses.push(SqlBuilder.buildWhere(field, value));
		});
		return clauses.length ? clauses.join(' AND ') : '1';
	}
}

module.exports = SqlBuilder;
