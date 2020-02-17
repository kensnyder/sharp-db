const fs = require('fs');
const os = require('os');
const prompts = require('prompts');

const homedir = os.homedir();
const configDir = `${homedir}/.sharp-db`;

async function inputConnection() {
	let ssh = null;
	console.log('Connection info:');
	const { host } = await prompts({
		type: 'text',
		name: 'host',
		message: 'host',
		initial: '127.0.0.1',
	});
	if (!host) {
		console.log('Canceled');
		process.exit();
	}
	const { user } = await prompts({
		type: 'text',
		name: 'user',
		message: 'user',
		initial: 'root',
	});
	if (!user) {
		console.log('Canceled');
		process.exit();
	}
	const { password } = await prompts({
		type: 'password',
		name: 'password',
		message: 'password',
	});
	const { database } = await prompts({
		type: 'text',
		name: 'database',
		message: 'database',
	});
	const { port } = await prompts({
		type: 'text',
		name: 'port',
		message: 'port',
		initial: '3306',
	});
	if (!port) {
		console.log('Canceled');
		process.exit();
	}
	const { charset } = await prompts({
		type: 'text',
		name: 'charset',
		message: 'charset',
		initial: 'utf8mb4',
	});
	if (!charset) {
		console.log('Canceled');
		process.exit();
	}
	const { shouldSsh } = await prompts({
		type: 'confirm',
		name: 'shouldSsh',
		message: 'Add SSH details?',
		initial: false,
	});
	if (shouldSsh) {
		const { sshHost } = await prompts({
			type: 'text',
			name: 'sshHost',
			message: 'SSH host',
			initial: 'example.com',
		});
		if (!sshHost) {
			console.log('Canceled');
			process.exit();
		}
		const { sshPort } = await prompts({
			type: 'text',
			name: 'sshPort',
			message: 'SSH port',
			initial: '22',
		});
		if (!sshPort) {
			console.log('Canceled');
			process.exit();
		}
		const { sshUser } = await prompts({
			type: 'text',
			name: 'sshUser',
			message: 'SSH user',
			initial: 'ubuntu',
		});
		if (!sshUser) {
			console.log('Canceled');
			process.exit();
		}
		const { sshKey } = await prompts({
			type: 'text',
			name: 'sshKey',
			message: 'SSH private key file path',
			initial: '',
		});
		if (!sshKey) {
			console.log('Canceled');
			process.exit();
		}
		ssh = {
			host: sshHost,
			port: sshPort,
			user: sshUser,
			privateKey: sshKey,
		};
	}
	const { shouldSave } = await prompts({
		type: 'confirm',
		name: 'shouldSave',
		message: 'Save config?',
		initial: true,
	});
	const config = {
		name: `${user}@${host}`,
		mysql: {
			host,
			user,
			password,
			database,
			port,
			charset,
		},
		ssh,
	};
	if (shouldSave) {
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir);
		}
		const { name } = await prompts({
			type: 'confirm',
			name: 'name',
			message: 'Connection name',
			initial: config.name,
		});
		if (!name) {
			console.log('Canceled');
			process.exit();
		}
		config.name = name;
		const configJSON = JSON.stringify(config, null, 4);
		const path = `${configDir}/${filename}.json`;
		fs.writeFileSync(path, configJSON, 'utf8');
	}
	return config;
}

module.exports = inputConnection;
