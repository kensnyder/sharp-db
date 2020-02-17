const fs = require('fs');
const Client = require('ssh2').Client;

class Ssh {
	/**
	 * Specify connection details including, host, port, user, privateKey
	 * @param {Object} [config]  Configuration to send to npm's ssh2
	 */
	constructor(config = {}) {
		const env =
			typeof process === 'object' && typeof process.env === 'object'
				? process.env
				: {};
		this.config = {
			...config,
			host: config.host || env.DB_SSH_HOST,
			port: config.port || env.DB_SSH_PORT || 22,
			user: config.user || env.DB_SSH_USER,
			privateKey: config.privateKey || env.DB_SSH_PRIVATE_KEY,
			tunnelPort: config.tunnelPort || env.DB_SSH_TUNNEL_PORT || 12346,
		};
		if (this.config.privateKey.match(/\.pem$/)) {
			const pkeyPath = this.config.privateKey.replace(/^~/, process.env.HOME);
			if (!fs.existsSync(pkeyPath)) {
				throw new Error(`Private key file not found at "${pkeyPath}".`);
			}
			this.config.privateKey = fs.readFileSync(pkeyPath, { encoding: 'utf8' });
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
				reject('Db config must have host and port.');
			}
			this.connection = new Client();
			this.connection.on('ready', () => {
				this.connection.forwardOut(
					'127.0.0.1',
					this.config.tunnelPort,
					db.config.host,
					db.config.port,
					(err, stream) => {
						if (err) {
							this.end();
							const msg =
								err.reason == 'CONNECT_FAILED' ? 'Connection failed.' : err;
							return reject(msg);
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
		if (this.connection.end) {
			this.connection.end();
		}
	}
}

module.exports = Ssh;
