import os from 'node:os';
import fs from 'node:fs';
import { Client, type ConnectConfig } from 'ssh2';

interface KnownEnvVars {
	DB_SSH_HOST: string;
	DB_SSH_PORT: number;
	DB_SSH_USERNAME: string;
	DB_SSH_PASSWORD: string;
	DB_SSH_LOCAL_PORT: number;
	DB_SSH_PRIVATE_KEY: string;
}

/**
 * Class to allow connecting to a DB through an ssh tunnel
 */
export default class Ssh {
	config: ConnectConfig;
	connection: Client;
	/**
	 * Specify connection details including, host, port, user, privateKey
	 * @param {Object} [config]  Configuration to send to npm's ssh2
	 */
	constructor(config: Partial<ConnectConfig> = {}) {
		const env = process.env as unknown as KnownEnvVars;
		this.config = {
			...config,
			host: config.host || env.DB_SSH_HOST || 'localhost',
			port: config.port || env.DB_SSH_PORT || 22,
			username: config.username || env.DB_SSH_USERNAME || '',
			localPort: config.localPort || env.DB_SSH_LOCAL_PORT || 12347,
		};
		if (config.privateKey || env.DB_SSH_PRIVATE_KEY) {
			this.config.privateKey = config.privateKey || env.DB_SSH_PRIVATE_KEY;
			if (
				typeof this.config.privateKey === 'string' &&
				this.config.privateKey.match(/\.pem$/)
			) {
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
	 * Set up a tunnel for the given Db instance
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
						resolve(stream);
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
