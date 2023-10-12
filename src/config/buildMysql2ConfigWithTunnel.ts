import buildMysql2Config from './buildMysql2Config';
import buildSshConfig from './buildSshConfig';

type Args = {
	mysqlConfig: Record<string, any> | URL | string;
	sshConfig: Record<string, any> | URL | string;
	constructor: any; // Should be an ssh2 Client constructor
};

export default function buildMysql2ConfigWithTunnel({
	mysqlConfig,
	sshConfig,
	constructor,
}: Args) {
	const my = buildMysql2Config(mysqlConfig);
	const sh = buildSshConfig(sshConfig);
	const tunnel = new constructor(sh);
	return new Promise((resolve, reject) => {
		tunnel.on('ready', () => {
			tunnel.forwardOut(
				sh.localHost,
				sh.localPort,
				my.host,
				my.port,
				(err: Error, stream: any) => {
					if (err) {
						tunnel.end();
						return reject(err);
					}
					// override db host, since we're operating from within the SSH tunnel
					my.host = 'localhost';
					my.stream = stream;
					resolve(my);
				}
			);
		});
		tunnel.connect(sh);
	});
}
