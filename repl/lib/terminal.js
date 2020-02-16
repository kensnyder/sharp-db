const readline = require('readline');

function terminal({
	header = null,
	prompt = '>',
	onLine = () => {},
	onClose = () => {},
}) {
	// clear terminal
	process.stdout.write('\x1b[0f');
	// process.stdin.setRawMode(true);
	if (header) {
		process.stdout.write(header /* + '\033[1K\n'*/);
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
		if (line.slice(-1) === '\\') {
			buffer += line.slice(0, -1);
			process.stdout.write('> ');
		} else {
			buffer += line;
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
		}
	});

	rl.on('close', onClose);
}

module.exports = terminal;
