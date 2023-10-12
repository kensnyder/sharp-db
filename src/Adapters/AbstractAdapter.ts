export default class AbstractAdapter {
	client: any;
	constructor(client: any) {
		this.client = client;
	}
	/*
		adapters must provide the following functions:

		async connect: (callback: (error: Error) => void) => void;
		async query: (
			options: any,
			callback: (error: Error, results: any, fields: any) => void
		) => any;
		async release: () => void;
		async end: () => void;
		async destroy: () => void;
		escape: (value: any) => string;
		escapeId: (value: string) => string;
	*/
}
