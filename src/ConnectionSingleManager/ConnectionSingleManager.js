const mysql = require('mysql2');
const decorateError = require('../decorateError/decorateError.js');

class ConnectionSingleManager {
	constructor(config) {
		this._config = config;
		this._connection = mysql.createConnection(this._config);
		this._isConnected = false;
		this._timeout = config.timeout || 28800 - 2;
		this._onIdle = this._onIdle.bind(this);
		this._startIdleTimer();
	}
	acquire() {
		return new Promise((resolve, reject) => {
			if (this._isConnected) {
				resolve(this._connection);
			}
			this._connection.connect(error => {
				if (error) {
					decorateError(error);
					reject(error);
				} else {
					this._isConnected = true;
					resolve(this._connection);
				}
			});
		});
	}
	release(handle) {
		if (handle !== this._connection) {
			throw new Error('Unable to release unknown connection');
		}
		this._startIdleTimer();
	}
	end() {
		return new Promise((resolve, reject) => {
			this._connection.end(error => {
				if (error) {
					decorateError(error);
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}
	destroy() {
		return this._connection.destroy();
	}
	_startIdleTimer() {
		clearTimeout(this._timer);
		this._timer = setTimeout(this._onIdle, this._timeout);
	}
	async _onIdle() {
		const handle = await this.acquire();
		handle.query('/* ping */ SELECT 1', (error, results, fields) => {
			this._startIdleTimer();
		});
	}
}

module.exports = ConnectionSingleManager;
