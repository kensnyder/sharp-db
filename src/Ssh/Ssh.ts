import os from 'node:os';
import fs from 'node:fs';
import { Client } from 'ssh2';

/**
 * Class to allow connecting to a DB through an ssh tunnel
 */
export default class Ssh {
	/**
	 * Specify connection details including, host, port, user, privateKey
	 * @param {Object} [config]  Configuration to send to npm's ssh2
	 */
	constructor(config = {}) {
		const env = process.env;
		this.config = {
			...config,
			host: config.host || env.DB_SSH_HOST || 'localhost',
			port: config.port || env.DB_SSH_PORT || 22,
			user: config.user || env.DB_SSH_USER,
			localPort: config.localPort || env.DB_SSH_LOCAL_PORT || 12347,
		};
		if (config.privateKey || env.DB_SSH_PRIVATE_KEY) {
			this.config.privateKey = config.privateKey || env.DB_SSH_PRIVATE_KEY;
			if (this.config.privateKey.match(/\.pem$/)) {
				const pkeyPath = this.config.privateKey.replace(/^~/, os.homedir());
				if (!fs.existsSync(pkeyPath)) {
					throw new Error(`Private key file not found at "${pkeyPath}".`);
				}
				this.config.privateKey = fs.readFileSync(pkeyPath, {
					encoding: 'utf8',
				});
			}
		} else if (config.password || env.DB_SSH_PASSWORD) {
			this.config.password = config.password || env.DB_SSH_PASSWORD;
		}
	}

	/**
	 * Setup a tunnel for the given Db instance
	 * @param {Db} db  A Db instance
	 * @returns {Promise}  Resolves when tunnel is established
	 */
	tunnelTo(db) {
		return new Promise((resolve, reject) => {
			if (!db.config || !db.config.host || !db.config.port) {
				reject(new Error('Db config must have host and port.'));
			}
			this.connection = new Client();
			this.connection.on('ready', () => {
				this.connection.forwardOut(
					'127.0.0.1',
					this.config.localPort,
					db.config.host,
					db.config.port,
					(err, stream) => {
						if (err) {
							this.end();
							return reject(err);
						}
						// override db host, since we're operating from within the SSH tunnel
						db.config.host = 'localhost';
						db.config.stream = stream;
						resolve();
					}
				);
			});
			this.connection.connect(this.config);
		});
	}

	/**
	 * Close the ssh tunnel
	 */
	end() {
		if (this.connection) {
			this.connection.end();
		}
	}
}
