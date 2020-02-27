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
	end() {
		if (ssh2.nextEndCallbacks.length) {
			ssh2.nextEndCallbacks.shift()();
		}
	}
}

const ssh2 = {
	Client,
	responses: [],
	nextEndCallbacks: [],
	pushResponse(resp) {
		ssh2.responses.push(resp);
	},
	onNextEnd(func) {
		ssh2.nextEndCallbacks.push(func);
	},
};

module.exports = ssh2;
