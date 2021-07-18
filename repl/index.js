const prettify = require('pretty-var-export');
const { red, green, yellow } = require('ansi-colors');
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
		// TODO: get header working
		header: green('TYPE "exit" TO EXIT.'),
		prompt: `${yellow(config.name)}> `,
		exitOn: /^(exit|quit|bye)$/,
		executeOn: /;$/,
		clearOn: /^clear$/,
		onLine: runQuery,
		onClose: () => {
			console.log(green('\nBye'));
			process.exit(0);
		},
	});

	async function runQuery(sql) {
		sql = sql.slice(0, -1);
		const db = new Db(config.mysql, config.ssh);
		try {
			const { results } = await db.query(sql);
			console.log(prettify(results));
		} catch (e) {
			console.log(red(e.stack || e.message));
		}
		db.end();
	}
}
