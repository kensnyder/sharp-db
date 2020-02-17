const prettify = require('pretty-var-export');
const { red, green, yellow } = require('chalk');
const terminal = require('./lib/terminal.js');
const chooseConnection = require('./lib/chooseConnection.js');
const inputConnection = require('./lib/inputConnection.js');
const Db = require('../src/Db/Db.js');

main();

async function main() {
	let config = await chooseConnection();
	if (!config) {
		config = await inputConnection();
	}
	terminal({
		header: green('TYPE exit TO EXIT.'),
		prompt: `${yellow(config.name)}> `,
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
		const db = new Db(config.mysql, config.ssh);
		try {
			const { results } = await db.query(sql);
			console.log(prettify(results));
		} catch (e) {
			console.log(red(e.message));
		}
		db.end();
	}
}
