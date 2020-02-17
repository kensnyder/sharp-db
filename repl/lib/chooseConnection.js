const os = require('os');
const fs = require('fs');
const prompts = require('prompts');
const walk = require('walkdir');

const homedir = os.homedir();
const configDir = `${homedir}/.sharp-db`;

async function chooseConnection() {
	if (!fs.existsSync(configDir)) {
		// no connections yet
		return null;
	}
	const paths = walk.sync(configDir);
	const choices = paths.map(path => ({
		title: path.replace(/.+\//, '').replace('.json', ''),
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

module.exports = chooseConnection;
