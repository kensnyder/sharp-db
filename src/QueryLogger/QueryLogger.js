class QueryLogger {
	constructor() {
		this._logs = [];
		this._watching = [];
	}

	/**
	 * Watch the given Db instance
	 * @param {Db} db  The Db instance
	 * @param {String[]} events  A list of events to watch for
	 *   Default is query, select, insert, update, delete
	 * @return {QueryLogger}
	 */
	watch(db, events = ['query', 'select', 'insert', 'update', 'delete']) {
		const lowerEvents = events.map(e => e.toLowerCase());
		for (const event of lowerEvents) {
			db.on(event, this.capture);
		}
		this._watching.push({
			db,
			events: lowerEvents,
		});
		return this;
	}

	/**
	 * Stop watching the given Db instance
	 * @param {Db} db  The db to stop watching
	 * @return {QueryLogger}
	 */
	unwatch(db) {
		const newWatchList = [];
		for (const watched of this._watching) {
			if (watched.db === db) {
				for (const event of watched.events) {
					db.off(event, this.capture);
				}
			} else {
				newWatchList.push(watched);
			}
		}
		this._watching = newWatchList;
		return this;
	}

	/**
	 * Save the type and query from a DbEvent object
	 * @param {DbEvent} evt  The DbEvent object
	 * @return {QueryLogger}
	 */
	capture = evt => {
		this._logs.push({
			date: new Date(),
			type: evt.type,
			query: evt.data.query,
			db: evt.target,
		});
		return this;
	};

	/**
	 * Clear out all logs
	 * @return {QueryLogger}
	 */
	clear() {
		this._logs = [];
		return this;
	}

	/**
	 * Get the raw array of logs
	 * @return {Object[]}
	 */
	getLogs() {
		return this._logs;
	}

	/**
	 * Get all the query strings
	 * @param {Function} [filter=null]  Function used to filter the logs
	 * @return {String[]}
	 */
	getQueries(filter = null) {
		const filtered = filter ? this._logs.filter(filter) : this._logs;
		return filtered.map(log =>
			typeof log.query === 'string' ? log.query : log.query.sql
		);
	}

	/**
	 * Get the query string from the last query
	 * @return {String|null}
	 */
	getLastQuery() {
		const last = this._logs[this._logs.length - 1];
		return last ? last.query : null;
	}
}

module.exports = QueryLogger;
