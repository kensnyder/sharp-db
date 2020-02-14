const realMysql2 = jest.requireActual('mysql2');

const nextResponses = [];

class Connection {
	connect(oncomplete) {
		oncomplete(null);
	}
	end(oncomplete) {
		oncomplete(null);
	}
	destroy() {}
	query(options, resultHandler) {
		setTimeout(() => {
			if (nextResponses.length === 0) {
				resultHandler(null, [], []);
			} else {
				const resp = nextResponses.shift();
				resultHandler(resp.error, resp.results, resp.fields);
			}
		}, 0);
		return typeof options === 'object' ? options.sql : options;
	}
}

const mysql2 = {
	createConnection() {
		return new Connection();
	},
	escape(value) {
		return realMysql2.escape(value);
	},
	escapeId(identifier) {
		return realMysql2.escapeId(identifier);
	},
	pushResponse(resp) {
		nextResponses.push(resp);
	},
};

module.exports = mysql2;
