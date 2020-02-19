# sharp-db

Classes for running SQL and building select queries in MySQL

## Installation

```bash
npm install --save sharp-db
```

## Table of Contents

* [Db](#db)
* [Select](#select)
* [Parser](#parser)

## Db

### Connection

Connection can be configured with environmental variables or in the constructor.

| Option | ENV name | Default |
|---|---|---|
| `host` | DB_HOST | 127.0.0.1 |
| `port` | DB_PORT | 3306 |
| `user` | DB_USER | root |
| `password` | DB_PASSWORD | _empty string_ |
| `database` | DB_DATABASE | undefined |
| `charset` | DB_CHARSET| utf8mb4 |

See node's mysqljs for [other options](https://github.com/mysqljs/mysql#connection-options).

### Instantiation

Connect to MySQL server

```js
// read options from ENV
const db1 = Db.factory();

// specify options in constructor
const db2 = new Db({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    port: 3306,
});

// instance that was last created
const db2Again = Db.factory();
```

### SSH Tunneling

Connect to MySQL through an SSH tunnel

```js
const db = Db.factory({
    // MySQL connection as first argument
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
}, {
    // SSH connection as second argument
    host: 'example.com',
    port: 22,
    user: 'ubuntu',
    privateKey: '~/.ssh/example.com.pem',
});
```

SSH Tunnel Options

| Option | ENV name | Default |
|---|---|---|
| `host` | DB_SSH_HOST | "localhost" |
| `port` | DB_SSH_PORT | 22 |
| `user` | DB_SSH_USER | _none_ |
| `privateKey` | DB_SSH_PRIVATE_KEY | _none_ |
| `localPort` | DB_SSH_LOCAL_PORT | 12346 |

See all options in [ssh2's npm package](https://github.com/mscdex/ssh2#client-methods).

### Code examples

All code examples below assume the `Db` instance has been stored in `db`.

### Plain select queries

```js
const { query, results, fields } = await db.select('SELECT * FROM users');
// query is the final query executed after value binding
// results is an Array of objects representing the query results
// fields is an Array of objects representing the columns that were returned
```

Relevant properties of each `fields` item:

| Item | Description | Example |
|---|---|---|
| `characterSet` | [Character set constant](https://github.com/mysqljs/mysql/blob/master/lib/protocol/constants/charsets.js) | 45 |
| `encoding` | Character Set name | utf8 |
| `name` | Name of column | my_column |
| `columnLength` | Number of *bytes* of field | 400 |
| `columnType` | [Data type constant](https://github.com/mysqljs/mysql/blob/master/lib/protocol/constants/types.js) | 253 |
| `flags` | [Field flag constant](https://github.com/mysqljs/mysql/blob/master/lib/protocol/constants/field_flags.js) | 33 |

### Binding values

#### Binding with question marks

```js
const sql = 'SELECT * FROM users WHERE is_active = ? AND department_id = ?';
const { results: users } = await db.select(sql, true, 5);
```

#### Named bindings

```js
const sql = 'SELECT * FROM users WHERE is_active = :isActive AND department_id = :departmentId';
const { results: users } = await db.select(sql, {
    isActive: true,
    departmentId: 5,
});
```

#### Binding data types

```js
const { results: users } = await db.select(sql, {
    isActive: true,          // Boolean
    departmentId: 5,         // Number
    createdAt: '2020-02-14', // Strings
    statusCode: [1, 2, 3],   // Arrays e.g. IN(1, 2, 3)
    deletedAt: null,         // null e.g. NULL
});
```

### selectFirst(sql, ...bindValues)

Get only the first row.

```js
const { results: row } = await db.selectFirst(sql);
```

Example results: `{ id: 1, name: "John" }`

### selectValue(sql, ...bindValues)

Get only the first column of the first row.

```js
const { results: value } = await db.selectValue(sql);
```

Example results: `"John"`

### selectHash(sql, ...bindValues)

Get an Object with column-value pairs.

```js
const { results: hash } = await db.selectHash(sql);
```

Example results: `{ "1": "John", "2": "Jane" }`

### selectList(sql, ...bindValues)

Get an Array of values for the first column of the first row.

```js
const { results: list } = await db.selectList(sql);
```

Example results: `["John", "Jane"]`

### selectExists(sql, ...bindValues)

Return true if query returns any rows.

```js
const { results: doesExist } = await db.selectExists(sql);
```

Example results: `true`

### selectIndexed(indexColumn, sql, ...bindValues)

Return an Object where every result row is indexed by the given field.

```js
const { results: usersById } = await db.selectIndexed('id', sql);
```

Example results:
```js
{
  "1": { id: 1, name: "John" },
  "2": { id: 2, name: "Jane" },
}
```

### selectGrouped(groupColumn, sql, ...bindValues)

Return an Object where every result row is indexed by the given field.

```js
const { results: usersGroupedByOrg } = await db.selectGrouped('org', sql);
```

Example results:
```js
{
    "Marketing": [
        { id: 1, name: "John", org: "Marketing" },
        { id: 2, name: "Jane", org: "Marketing" },
    ],
    "Finance": [
        { id: 3, name: "Jose", org: "Finance" },
    ],
}
```

### Useful query options

SQL can actually be an Object with options.

```js
const options = {
    sql: `
        SELECT users.*, avatars.*
        FROM users
        INNER JOIN avatars ON avatars.user_id = users.id
        WHERE users.is_active = ?
    `,
    // kill query if not completed within 30 seconds
    timeout: 30000,
    // return records with keys `users` and `avatars` with their own fields nested underneath
    nestTables: true,
    // you can also bind values here using question marks
    values: [true],
};
const { results } = await db.select(options);
```

#### nestTables example

Given a query of:

```sql
SELECT users.*, avatars.*
FROM users
INNER JOIN avatars ON avatars.user_id = users.id
WHERE users.is_active = ?
```

nesting tables will return a data structure such as:

```js
[
	{
		users: {
			id: 1,
			name: 'John Doe',
			is_active: true,
		},
		avatars: {
			id: 101,
			user_id: 1,
			url: 'http://example.com/john.png'
		}
	},
	{
		users: {
			id: 2,
			name: 'Jane Doe',
			is_active: true,
		},
		avatars: {
			id: 102,
			user_id: 2,
			url: 'http://example.com/jane.png'
		}
	}
]
```

### selectFrom(table, fields, values)

```js
const { results } = await db.selectFrom('users', ['fname','lname'], {
    'id >': 5,
    is_active: true,
    department_id: [1,2],
});
```

insert
update
delete

insertInto
insertIntoExtended
updateTable
deleteFrom





## Parser

### Parser Limitations

The parser has several limitations.
The intent is to be fast and useful for 99% of situations.
