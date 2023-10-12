import os from 'node:os';
import fs from 'node:fs';

export default function buildSshConfig(
	config: Record<string, any> | URL | string = {}
) {
	const env = process.env;
	if (typeof config === 'string') {
		config = new URL(config);
	}
	if (config instanceof URL) {
		return {
			...Object.fromEntries(config.searchParams), // Other string options such as localPort
			host: config.hostname,
			user: config.username,
			password: config.password,
			port: Number(config.port),
		};
	}
	const finalConfig = {
		...config,
		host: config.host || env.DB_SSH_HOST || 'localhost',
		port: config.port || env.DB_SSH_PORT || 22,
		username: config.username || env.DB_SSH_USERNAME || '',
		localHost: config.localAddress || env.DB_SSH_LOCAL_HOST || '127.0.0.1',
		localPort: config.localPort || env.DB_SSH_LOCAL_PORT || 12347,
		password: config.password || env.DB_SSH_PASSWORD,
	};
	const privateKey = config.privateKey || env.DB_SSH_PRIVATE_KEY;
	if (privateKey && privateKey.match(/\.pem$/)) {
		const pkeyPath = privateKey.replace(/^~/, os.homedir());
		if (!fs.existsSync(pkeyPath)) {
			throw new Error(`Private key file not found at "${pkeyPath}".`);
		}
		finalConfig.privateKey = fs.readFileSync(pkeyPath, 'utf-8');
	}
	return finalConfig;
}
