import decorateError from './decorateError';

describe('decorateError', () => {
	it('should add properties', () => {
		const message = "Unknown column 'iid' in 'where clause'";
		const error = new Error(message);
		const stackWithoutError = `at Packet.asError (/code/node_modules/mysql2/lib/packets/packet.js:712:17)
at Query.execute (/code/node_modules/mysql2/lib/commands/command.js:28:26)
at Connection.handlePacket (/code/node_modules/mysql2/lib/connection.js:425:32)
at PacketParser.onPacket (/code/node_modules/mysql2/lib/connection.js:75:12)
at PacketParser.executeStart (/code/node_modules/mysql2/lib/packet_parser.js:75:16)
at Socket.<anonymous> (/code/node_modules/mysql2/lib/connection.js:82:25)
at Socket.emit (events.js:314:20)
at addChunk (_stream_readable.js:297:12)
at readableAddChunk (_stream_readable.js:272:9)
at Socket.Readable.push (_stream_readable.js:213:10)
at TCP.onStreamRead (internal/stream_base_commons.js:188:23)`;
		Object.assign(error, {
			code: 'ER_BAD_FIELD_ERROR',
			errno: 1054,
			sqlState: '42S22',
			sqlMessage: message,
			stack: `${message}\n${stackWithoutError}`,
		});
		const options = {
			sql: `
			UPDATE users
			SET email = 'a@example.com'
			WHERE iid = 123`,
			bound: {
				email: 'a@example.com',
				id: 123,
			},
		};
		decorateError(error, options);
		const expectedMessage = `[ER_BAD_FIELD_ERROR] 1054 (42S22): Unknown column 'iid' in 'where clause'
Query:
UPDATE users
SET email = 'a@example.com'
WHERE iid = 123`;
		expect(error.message).toBe(expectedMessage);
		expect(error.stack).toBe(`${expectedMessage}\n${stackWithoutError}`);
		expect(error.bound).toBe(options.bound);
		expect(error.sql).toBe(options.sql);
	});
	it('should fall back to defaults', () => {
		const message = 'Foobar';
		const error = new Error(message);
		const stackWithoutError = `at (internal/stream_base_commons.js:188:23)`;
		Object.assign(error, {
			stack: `${message}\n${stackWithoutError}`,
		});
		const options = {};
		decorateError(error, options);
		const expectedMessage = `[ERROR] -1 (N/A): Foobar`;
		expect(error.message).toBe(expectedMessage);
		expect(error.stack).toBe(`${expectedMessage}\n${stackWithoutError}`);
		expect(error.bound).toEqual({});
		expect(error.sql).toBe(undefined);
	});
	it('should handle undefined stack', () => {
		const message = 'Foobar';
		const error = new Error(message);
		error.stack = undefined;
		const options = {};
		decorateError(error, options);
		const expectedMessage = `[ERROR] -1 (N/A): Foobar`;
		expect(error.message).toBe(expectedMessage);
		expect(error.stack).toBe(`${expectedMessage}\n`);
	});
	it('should truncate long query strings', () => {
		const message = 'Foobar';
		const error = new Error(message);
		const stackWithoutError = `at (internal/stream_base_commons.js:188:23)`;
		Object.assign(error, {
			stack: `${message}\n${stackWithoutError}`,
		});
		const options = {
			sql: `CREATE TABLE \`announcement_audiences\` (
\`id\` int(11) NOT NULL AUTO_INCREMENT,
\`announcement_id\` int(11) DEFAULT NULL,
\`system_wide\` tinyint(1) DEFAULT NULL,
\`client_id\` int(11) DEFAULT NULL,
\`user_id\` int(11) DEFAULT NULL,
\`rule\` enum('show','hide') DEFAULT 'show',
\`display_interval\` varchar(50) DEFAULT NULL,
PRIMARY KEY (\`id\`),
KEY \`system_wide\` (\`system_wide\`),
KEY \`client_id\` (\`client_id\`),
KEY \`user_id\` (\`user_id\`)
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4`,
		};
		decorateError(error, options);
		expect(error.stack).toContain(options.sql.slice(0, 297) + '...');
	});
});
