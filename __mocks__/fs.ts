const fs = {
	existsSync(path) {
		return false;
	},
	readFileSync(path, options) {
		return '';
	},
};

export default fs;
