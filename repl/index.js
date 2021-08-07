const prettify = require('pretty-var-export');
const { red, green, yellow, gray } = require('ansi-colors');
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

	const cli = terminal({
		header: [
			green('TYPE "exit" TO EXIT.'),
			gray('TYPE "clear" TO CLEAR.'),
			gray('TYPE "copy" TO COPY TO CLIPBOARD.'),
		].join('  '),
		prompt: `${yellow(config.name)}> `,
		exitOn: /^(exit|quit|bye);?$/,
		clearOn: /^clear;?$/,
		copyOn: /^copy;?$/,
		getCopyBuffer: () => JSON.stringify(lastResults, null, 2),
		onCopySuccess: () => {
			console.log(green('Copied last result to the clipboard.'));
		},
		onCopyError: error => {
			console.log(
				red('Error copying last result to the clipboard: ' + error.message)
			);
		},
		executeOn: /.+;?$/,
		handler: runQuery,
		onClose: () => {
			console.log(green('\nBye'));
			process.exit(0);
		},
	});

	let lastResults = null;

	async function runQuery(sql) {
		sql = sql.slice(0, -1);
		const db = new Db(config.mysql, config.ssh);
		try {
			const { results } = await db.query(sql);
			lastResults = results;
			console.log(prettify(results));
		} catch (e) {
			if (e.name === 'MySQLError') {
				console.log(red(e.message));
			} else {
				console.log(red(e.stack || e.message));
			}
			cli.clearBuffer();
		}
		db.end();
	}
}
