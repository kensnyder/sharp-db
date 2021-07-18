const readline = require('readline');

function terminal({
	header = null,
	prompt = '>',
	exitOn = null,
	executeOn = null,
	clearOn = null,
	onLine = () => {},
	onClose = () => {},
}) {
	console.clear();
	if (header) {
		console.log(header);
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt,
		removeHistoryDuplicates: true,
	});

	let buffer = '';

	rl.prompt();
	rl.on('line', line => {
		if (buffer.length) {
			buffer += '\n';
		}
		buffer += line.trim();
		if (exitOn instanceof RegExp && exitOn.test(buffer)) {
			rl.close();
			return;
		}
		if (clearOn instanceof RegExp && clearOn.test(buffer)) {
			buffer = '';
			console.clear();
			rl.prompt();
			return;
		}
		if (executeOn instanceof RegExp && executeOn.test(buffer)) {
			const result = onLine(buffer);
			if (result instanceof Promise) {
				result.finally(() => {
					buffer = '';
					rl.prompt();
				});
			} else {
				buffer = '';
				rl.prompt();
			}
		} else {
			process.stdout.write('> ');
		}
	});

	rl.on('close', onClose);
}

module.exports = terminal;
