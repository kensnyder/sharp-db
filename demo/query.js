const { Db } = require('../dist/index.js');
const mysql = require('mysql2');

const db = Db.factory({
	hostname: '127.0.0.1',
	username: 'root',
	password: '',
	database: 'platform',
	port: 8306,
});

// db.select('SELECT id, fname, lname, last_login FROM users LIMIT 10')
// 	.then(
// 		data => console.log('data', data.slice(0, 4)),
// 		err => console.error('err:', err.message)
// 	)
// 	.then(() => db.destroy(), () => db.destroy());

// const name = 'AGERO';
// const client_id = 659624;
// const created = '2019-03-17 00:00:00';
// const is_active = 1;
// const is_global = 1;
// const insert = { name, client_id, created, is_active, is_global };
//
// const update = {
// 	name,
// 	is_active,
// 	is_global,
// };
//
// db.insertIntoOnDuplicateKeyUpdate('tags', insert, update)
// 	.then(
// 		data => console.log('data', data),
// 		err => console.error('err:', err.message)
// 	)
// 	.then(() => db.destroy(), () => db.destroy());
//
// const name = 'Agricola';
// const client_id = 659624;
// const created = '2019-03-17 00:00:00';
// const is_active = 1;
// const is_global = 0;
// const insert = { name, client_id, created, is_active, is_global };
//
// db.insertInto('tags', insert).then(() => db.destroy(), () => db.destroy());

console.log('mysql.escapeId = ', db.quote('COUNT(*)'));
console.log('mysql.escapeId = ', db.quote('`a`.*'));
console.log('mysql.escape(null)', mysql.escape(null));
