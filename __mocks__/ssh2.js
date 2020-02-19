class Client {
	on(event, handler) {
		handler();
	}
	connect() {}
	forwardOut(fromHost, fromPort, toHost, toPort, handler) {
		if (ssh2.responses.length) {
			const resp = ssh2.responses.shift();
			handler(resp.err, resp.stream);
		}
	}
	end() {}
}

const ssh2 = {
	Client,
	responses: [],
	pushResponse(resp) {
		ssh2.responses.push(resp);
	},
};

module.exports = ssh2;
