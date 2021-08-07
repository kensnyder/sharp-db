const readline = require('readline');
const clipboardy = require('clipboardy');

function terminal({
	header = null,
	prompt = '>',
	exitOn = null,
	clearOn = null,
	copyOn = null,
	getCopyBuffer = () => {},
	onCopySuccess = () => {},
	onCopyError = () => {},
	executeOn = null,
	handler = () => {},
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

	const clearBuffer = () => {
		buffer = '';
		rl.prompt();
	};

	let buffer = '';

	rl.prompt();
	rl.on('line', line => {
		if (buffer.length) {
			// add newline if this isn't the first line
			buffer += '\n';
		}
		buffer += line;
		// check for exit command
		if (exitOn.test(buffer)) {
			rl.close();
			onClose();
			return;
		}
		// check for clear command
		if (clearOn.test(buffer)) {
			clearScreen();
			return;
		}
		// check for copy command
		if (copyOn.test(buffer)) {
			clipboardy
				.write(getCopyBuffer())
				.then(onCopySuccess, onCopyError)
				.finally(clearBuffer);
			return;
		}
		// check if we should send the buffer to the handler
		if (executeOn instanceof RegExp && executeOn.test(buffer)) {
			const result = handler(buffer);
			if (result instanceof Promise) {
				result.then(clearBuffer, clearBuffer);
			} else {
				clearBuffer();
			}
		} else {
			// otherwise, continue to accept new input
			process.stdout.write('> ');
		}
	});

	rl.on('close', onClose);

	return {
		clearBuffer,
		clearScreen: () => {
			console.clear();
			clearBuffer();
		},
		exit: rl.close,
	};
}

module.exports = terminal;
