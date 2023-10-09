export default class DbEvent {
	/**
	 * @property {String}  The event name
	 */
	type: string;

	/**
	 * @property {String}  If an error, the event name that would have been
	 *   emitted if there were no error
	 */
	subtype: string;

	/**
	 * @property {Db}  The database itself
	 */
	target: typeof Db;

	/**
	 * @property {Error}  The SQL error object
	 */
	error: string;

	/**
	 * @property {Object}  Any additional data that was emitted
	 */
	data: Object;

	/**
	 * Create new even object
	 * @param props  The property values (type, subtype, target, error, data)
	 */
	constructor(props: {
		type: string;
		subtype: string;
		target: typeof Db;
		error: string;
		data: Object;
	}) {
		Object.assign(this, props);
	}
}
