export default function buildPostgresConfig(
	config: Record<string, any> | URL | string = {}
) {
	const env = process.env;
	if (config instanceof URL) {
		config = config.toString();
	}
	if (typeof config === 'string') {
		return { connectionString: config };
	}
	return {
		...Object.fromEntries(config.searchParams),
		host: config.hostname || env.DB_HOST || env.RDS_HOSTNAME || 'localhost',
		user: config.username || env.DB_USER || env.RDS_USERNAME || 'postgres',
		password: config.password || env.DB_USER || env.RDS_USERNAME || 'postgres',
		database:
			config.database || env.DB_DATABASE || env.RDS_DATABASE || undefined,
		port: config.port || Number(env.DB_PORT) || Number(env.RDS_PORT) || 5432,
	};
}
