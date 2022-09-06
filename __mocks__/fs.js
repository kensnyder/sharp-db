const fs = {
	existsSync(path) {
		return false;
	},
	readFileSync(path, options) {
		return '';
	},
};

module.exports = fs;
