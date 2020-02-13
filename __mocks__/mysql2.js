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
			const resp = nextResponses.length > 0 ? nextResponses.shift() : [];
			resultHandler(resp.error, resp.results, resp.fields);
		}, 0);
		return options.sql;
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
	}
};

module.exports = mysql2;
