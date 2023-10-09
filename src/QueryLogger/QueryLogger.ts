export default class QueryLogger {
	#logs = [];
	#watching = [];

	/**
	 * Watch the given Db instance
	 * @param {Db} db  The Db instance
	 * @param {String[]} events  A list of events to watch for
	 *   Default is query, select, insert, update, delete
	 * @return {QueryLogger}
	 */
	watch(db, events = ['query', 'select', 'insert', 'update', 'delete']) {
		for (const event of events) {
			db.on(event, this.capture);
		}
		this.#watching.push({
			db,
			events,
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
		for (const watched of this.#watching) {
			if (watched.db === db) {
				for (const event of watched.events) {
					db.off(event, this.capture);
				}
			} else {
				newWatchList.push(watched);
			}
		}
		this.#watching = newWatchList;
		return this;
	}

	/**
	 * Save the type and query from a DbEvent object
	 * @param {DbEvent} evt  The DbEvent object
	 * @return {QueryLogger}
	 */
	capture = evt => {
		this.#logs.push({
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
		this.#logs = [];
		return this;
	}

	/**
	 * Get the raw array of logs
	 * @return {Object[]}
	 */
	getLogs() {
		return this.#logs;
	}

	/**
	 * Get all the query strings
	 * @param {Function} [filter=null]  Function used to filter the logs
	 * @return {String[]}
	 */
	getQueries(filter = null) {
		const filtered = filter ? this.#logs.filter(filter) : this.#logs;
		return filtered.map(log => log.query);
	}

	/**
	 * Get the query string from the last query
	 * @return {String|null}
	 */
	getLastQuery() {
		const last = this.#logs[this.#logs.length - 1];
		return last ? last.query : null;
	}
}
