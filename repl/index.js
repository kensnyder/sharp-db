const fs = require('fs');
const os = require('os');
const prompts = require('prompts');
const { red, green, yellow, cyan } = require('chalk');
const walk = require('walkdir');
const terminal = require('./lib/terminal.js');
const prettify = require('pretty-var-export');
const Db = require('../src/Db/Db.js');

const homedir = os.homedir();
const configDir = `${homedir}/.sharp-db`;

main();

async function main() {
	let config = await chooseExistingConn();
	if (!config) {
		config = askConnDetails();
	}
	terminal({
		header: green('TYPE exit TO EXIT.'),
		prompt: `${yellow(config.user)}@${cyan(config.host)}> `,
		onLine: runQuery,
		onClose: () => console.log(yellow('\nGoodbye')),
	});

	async function runQuery(sql) {
		if (sql.slice(-1) === ';') {
			sql = sql.slice(0, -1);
		}
		if (sql.match(/^(exit|quit|bye)$/)) {
			process.exit(0);
		}
		const db = new Db(config);
		try {
			const { results } = await db.query(sql);
			console.log(prettify(results));
		} catch (e) {
			console.log(red(e.message));
		}
		db.end();
	}
}
async function chooseExistingConn() {
	if (!fs.existsSync(configDir)) {
		// no connections yet
		return null;
	}
	const paths = walk.sync(configDir);
	const choices = paths.map(path => ({
		title: path
			.replace(/.+\//, '')
			.replace('.json', '')
			.replace('>', '/'),
		value: path,
	}));
	choices.push({
		title: 'New...',
		value: false,
	});
	const { path } = await prompts({
		type: 'select',
		name: 'path',
		message: 'choose a connection',
		choices,
	});
	if (!path) {
		return null;
	}
	return JSON.parse(fs.readFileSync(path));
}
async function askConnDetails() {
	console.log('Connection info:');
	const { host } = await prompts({
		type: 'text',
		name: 'host',
		message: 'host',
		initial: '127.0.0.1',
	});
	if (!host) {
		console.log('Exiting.');
		process.exit();
	}
	const { user } = await prompts({
		type: 'text',
		name: 'user',
		message: 'user',
		initial: 'root',
	});
	if (!user) {
		console.log('Exiting.');
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
		console.log('Exiting.');
		process.exit();
	}
	const { charset } = await prompts({
		type: 'text',
		name: 'charset',
		message: 'charset',
		initial: 'utf8mb4',
	});
	if (!charset) {
		console.log('Exiting.');
		process.exit();
	}
	const { shouldSave } = await prompts({
		type: 'confirm',
		name: 'shouldSave',
		message: 'Save config?',
		initial: 'utf8mb4',
	});
	const config = {
		host,
		user,
		password,
		database,
		port,
		charset,
	};
	const configJSON = JSON.stringify(config, null, 4);
	if (shouldSave) {
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir);
		}
		const name = `${configDir}/${user}@${host}:${port}>${database}.json`;
		fs.writeFileSync(name, configJSON, 'utf8');
	}
	return config;
}
