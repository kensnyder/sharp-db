import Db from '../Db/Db';
import Select from '../Select/Select';

/**
 * Class for working with real data in unit tests
 */
export default class DataBroker {
	db: Db;
	now: Date;
	uniqid: string;
	deleted: Record<string, any[]>;
	ids: Record<string, any | any[]>;
	/**
	 * Create a new data broker
	 * @param {Db} db  The database to read/write into
	 */
	constructor(db = null) {
		/**
		 * The database to read/write to
		 * @type {Db}
		 */
		this.db = db || Db.factory();
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
	 * @param table  The name of the table to insert into
	 * @param values  The record to insert
	 * @param options  Additional options
	 * @property options.compositeKey  An array of column names that form a composite key
	 * @returns  Resolves with the id of the new record or the composite key
	 */
	async insert(
		table: string,
		values: Record<string, any>,
		options: { compositeKey?: string[] } = {}
	): Promise<number | Record<string, any>> {
		const { insertId } = await this.db.insertInto(table, values);
		if (!Array.isArray(this.ids[table])) {
			this.ids[table] = [];
		}
		if (Array.isArray(options.compositeKey)) {
			const composite = {};
			for (const column of options.compositeKey) {
				composite[column] = values[column];
			}
			this.ids[table].push(composite);
			return composite;
		} else {
			this.ids[table].push(insertId);
			return insertId;
		}
	}

	/**
	 * Delete records that can be re-inserted later
	 * @param table  The name of the table to delete from
	 * @param criteria  The criteria to match the records
	 * @returns An array of all the records
	 */
	async delete(
		table: string,
		criteria: Record<string, any>
	): Promise<Record<string, any>> {
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
	 * @returns The total number of rows affected
	 */
	async cleanup(): Promise<number> {
		// cleanup inserted records
		let totalAffectedRows = 0;
		for (const table of Object.keys(this.ids)) {
			for (const idOrCompositeKey of this.ids[table]) {
				const where =
					typeof idOrCompositeKey === 'number'
						? { id: idOrCompositeKey }
						: idOrCompositeKey;
				const { affectedRows } = await this.db.deleteFrom(table, where, 1);
				totalAffectedRows += affectedRows;
			}
		}
		// re-insert deleted records
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
	 * @param userId  The user id to use for createdBy and modifiedBy
	 * @returns the id specified along with the current date
	 */
	createdAndModified(userId: number = 0): {
		createdAt: Date;
		createdBy: number;
		modifiedAt: Date;
		modifiedBy: number;
	} {
		return {
			createdAt: this.now,
			createdBy: userId,
			modifiedAt: this.now,
			modifiedBy: userId,
		};
	}

	/**
	 * Get value for created_at, created_by, modified_at and modified_by
	 * @param userId  The user id to use for created_by and modified_by
	 * @returns the id specified along with the current date
	 */
	created_and_modified(userId: number = 0): {
		created_at: Date;
		created_by: number;
		modified_at: Date;
		modified_by: number;
	} {
		return {
			created_at: this.now,
			created_by: userId,
			modified_at: this.now,
			modified_by: userId,
		};
	}
}
