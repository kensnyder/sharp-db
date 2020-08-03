const Select = require('../Select/Select.js');

/**
 * Class for working with real data in unit tests
 */
class DataBroker {
	/**
	 * Create a new data broker
	 * @param {Db} db  The database to read/write into
	 */
	constructor(db = null) {
		/**
		 * The database to read/write to
		 * @type {Db}
		 */
		this.db = db;
		/**
		 * The current date
		 * @type {Date}
		 */
		this.now = new Date();
		/**
		 * A unique id suitable for a unit test
		 * @type {String}
		 */
		this.uniqid = Math.random().toString(36).slice(2);
		/**
		 * Arrays of deleted indexed by table name
		 * @type {Object}
		 */
		this.deleted = {};
		/**
		 * Arrays of newly inserted ids indexed by table name
		 * @type {Object}
		 */
		this.ids = {};
	}

	/**
	 * Insert records that can be cleaned up later
	 * @param {String} table  The name of the table to insert into
	 * @param {Object} values  The record to insert
	 * @returns {Promise<Number>}  Resolves with the id of the new record
	 */
	async insert(table, values) {
		const { insertId } = await this.db.insertInto(table, values);
		if (!Array.isArray(this.ids[table])) {
			this.ids[table] = [];
		}
		this.ids[table].push(insertId);
		return insertId;
	}

	/**
	 * Delete records that can be re-inserted later
	 * @param {String} table  The name of the table to delete from
	 * @param {Object} criteria  The criteria to match the records
	 * @returns {Promise<Object[]>}  An array of all the records
	 */
	async delete(table, criteria) {
		const query = Select.init(this.db);
		query.table(table);
		query.where(criteria);
		const { results: recordset } = await query.fetch();
		await this.db.deleteFrom(table, criteria);
		if (!Array.isArray(this.deleted[table])) {
			this.deleted[table] = [];
		}
		this.deleted[table].push(...recordset);
		return recordset;
	}

	/**
	 * Delete insertions and restore deleted
	 * @returns {Promise<Number>}  The total number of rows affected
	 */
	async cleanup() {
		let totalAffectedRows = 0;
		for (const table of Object.keys(this.ids)) {
			for (const id of this.ids[table]) {
				const { affectedRows } = await this.db.deleteFrom(table, { id }, 1);
				totalAffectedRows += affectedRows;
			}
		}
		this.ids = {};
		for (const table of Object.keys(this.deleted)) {
			const { affectedRows } = await this.db.insertExtended(
				table,
				this.deleted[table]
			);
			totalAffectedRows += affectedRows;
		}
		this.deleted = {};
		return totalAffectedRows;
	}

	/**
	 * Get value for createdAt, createdBy, modifiedAt and modifiedBy
	 * @param {Number} userId  The user id to use for createdBy and modifiedBy
	 * @returns {{createdAt: Date, createdBy: Number, modifiedAt: Date, modifiedBy: Number}}
	 */
	createdAndModified(userId = 1) {
		return {
			createdAt: this.now,
			createdBy: userId,
			modifiedAt: this.now,
			modifiedBy: userId,
		};
	}

	/**
	 * Get value for created_at, created_by, modified_at and modified_by
	 * @param {Number} userId  The user id to use for created_by and modified_by
	 * @returns {{modified_by: Number, created_at: Date, modified_at: Date, created_by: Number}}
	 */
	created_and_modified(userId = 1) {
		return {
			created_at: this.now,
			created_by: userId,
			modified_at: this.now,
			modified_by: userId,
		};
	}
}

module.exports = DataBroker;
