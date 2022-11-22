class DbEvent {
	/**
	 * @property {String}  The event name
	 */
	type;

	/**
	 * @property {String}  If an error, the event name that would have been
	 *   emitted if there were no error
	 */
	subtype;

	/**
	 * @property {Db}  The database itself
	 */
	target;

	/**
	 * @property {Error}  The SQL error object
	 */
	error;

	/**
	 * @property {Object}  Any additional data that was emitted
	 */
	data;

	/**
	 * Create new even object
	 * @param {Object} props  The property values (type, subtype, target, error, data)
	 */
	constructor(props) {
		Object.assign(this, props);
	}
}

module.exports = DbEvent;
