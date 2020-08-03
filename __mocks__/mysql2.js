const realMysql2 = jest.requireActual('mysql2');
const nextResponses = [];
const nextConnects = [];
const nextEnds = [];

class Connection {
	connect(oncomplete) {
		setTimeout(() => {
			if (nextConnects.length === 0) {
				oncomplete(null);
			} else {
				oncomplete(nextConnects.shift());
			}
		}, 0);
	}
	end(oncomplete) {
		setTimeout(() => {
			if (nextEnds.length === 0) {
				oncomplete(null);
			} else {
				oncomplete(nextEnds.shift());
			}
		}, 0);
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
		return this;
	},
	pushConnect(resp) {
		nextConnects.push(resp);
		return this;
	},
	pushEnd(resp) {
		nextEnds.push(resp);
		return this;
	},
};

module.exports = mysql2;
