import AbstractAdapter from './AbstractAdapter';

export class MockAdapter extends AbstractAdapter {
	responses: any[] = [];
	mockQueryResult(response: any) {
		this.responses.push(response);
	}
	async connect() {}
	async query(sql, bound) {
		const results = this.responses.shift();
		if (results instanceof Error) {
			results.sql = sql;
			results.bound = bound;
			throw results;
		}
		return results;
	}
	async multiQuery(sql, bound) {
		const results = this.responses.shift();
		if (results instanceof Error) {
			results.sql = sql;
			results.bound = bound;
			throw results;
		}
		return results;
	}
	async release() {}
	async end() {}
	async destroy() {}
	escape(value: any): string {
		if (value === null || value === undefined) {
			return 'NULL';
		} else if (typeof value === 'string') {
			return "'" + value + "'";
		} else if (typeof value === 'number') {
			return String(value);
		} else if (typeof value === 'boolean') {
			return value ? 'true' : 'false';
		} else if (value instanceof Date) {
			return "'" + value.toISOString() + "'";
		} else {
			return "'" + String(value) + "'";
		}
	}
	escapeId(value: string) {
		return '`' + value + '`';
	}
}
