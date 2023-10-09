vitest.mock('ssh2');
vitest.mock('fs');
import fs from 'node:fs';
import ssh2Mock from 'ssh2';
import Ssh from './Ssh';

describe('Ssh', () => {
	it('should tunnel', async () => {
		const stream = {};
		ssh2Mock.pushResponse({
			err: null,
			stream,
		});
		const db = { config: { host: 'test', port: 123 } };
		const conn = new Ssh();
		await conn.tunnelTo(db);
		expect(db.config.host).toBe('localhost');
		expect(db.config.stream).toBe(stream);
	});
	it('should handle tunnel errors', async () => {
		ssh2Mock.pushResponse({
			err: new Error('oops'),
			stream: null,
		});
		const db = { config: { host: 'test', port: 123 } };
		const conn = new Ssh();
		try {
			await conn.tunnelTo(db);
		} catch (e) {
			expect(e.message).toBe('oops');
		}
	});
	it('should require db host and port', async () => {
		const conn = new Ssh();
		try {
			await conn.tunnelTo({});
		} catch (e) {
			expect(e.message).toBe('Db config must have host and port.');
		}
	});
	it('should handle additional config values', () => {
		const conn = new Ssh({
			foo: 'bar',
			password: 'abc123',
		});
		expect(conn.config.foo).toBe('bar');
	});
	it('should handle private key strings', () => {
		const conn = new Ssh({
			privateKey: 'abc123',
		});
		expect(conn.config.privateKey).toBe('abc123');
	});
	it('should handle password strings', () => {
		const conn = new Ssh({
			password: 'abc123',
		});
		expect(conn.config.password).toBe('abc123');
	});
	it('should handle password env', () => {
		process.env.DB_SSH_PASSWORD = 'def456';
		const conn = new Ssh({});
		expect(conn.config.password).toBe('def456');
		process.env.DB_SSH_PASSWORD = undefined;
	});
	it('should handle private key env', () => {
		process.env.DB_SSH_PRIVATE_KEY = 'def456';
		const conn = new Ssh({});
		expect(conn.config.privateKey).toBe('def456');
		process.env.DB_SSH_PRIVATE_KEY = undefined;
	});
	it('should handle private files', () => {
		try {
			const conn = new Ssh({
				privateKey: 'abc123.pem',
			});
		} catch (e) {
			expect(e.message).toMatch(/^Private key file not found/);
		}
	});
	it('should handle private files', () => {
		fs.existsSync = () => true;
		fs.readFileSync = () => 'keyval';
		const conn = new Ssh({
			privateKey: 'abc123.pem',
		});
		expect(conn.config.privateKey).toBe('keyval');
	});
	it('should handle private from env', () => {
		process.env.DB_SSH_PRIVATE_KEY = 'abc123.pem';
		fs.existsSync = () => true;
		fs.readFileSync = () => 'keyval';
		const conn = new Ssh({
			privateKey: 'abc123.pem',
		});
		expect(conn.config.privateKey).toBe('keyval');
		process.env.DB_SSH_PRIVATE_KEY = undefined;
	});
	it('should avoid calling end if not connected', () => {
		const conn = new Ssh();
		expect(conn.end()).toBe(undefined);
	});
});
