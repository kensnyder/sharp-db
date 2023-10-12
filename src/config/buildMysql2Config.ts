export default function buildMysql2Config(
	config: Record<string, any> | URL | string = {}
) {
	const env = process.env;
	if (typeof config === 'string') {
		config = new URL(config);
	}
	if (config instanceof URL) {
		return {
			...Object.fromEntries(config.searchParams), // Other string options such as charset
			host: config.hostname,
			user: config.username,
			password: config.password,
			database: config.pathname,
			port: Number(config.port),
		};
	}
	return {
		host: config.host || env.DB_HOST || env.RDS_HOSTNAME || '127.0.0.1',
		user: config.user || env.DB_USER || env.RDS_USERNAME || 'root',
		password: config.password || env.DB_PASSWORD || env.RDS_PASSWORD || '',
		database:
			config.database || env.DB_DATABASE || env.RDS_DATABASE || undefined,
		port: config.port || Number(env.DB_PORT) || Number(env.RDS_PORT) || 3306,
		charset: config.charset || env.DB_CHARSET || env.RDS_CHARSET || 'utf8mb4',
		...config, // other options
	};
}

export function mysqlWithTunnel(sshConfig) {}
