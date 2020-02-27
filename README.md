# sharp-db

[![Build Status](https://travis-ci.org/kensnyder/sharp-db.svg?branch=master&v=1.0.0)](https://travis-ci.org/kensnyder/sharp-db)
[![Code Coverage](https://codecov.io/gh/kensnyder/sharp-db/branch/master/graph/badge.svg?v=1.0.0)](https://codecov.io/gh/kensnyder/sharp-db)
[![MIT License](https://img.shields.io/github/license/kensnyder/sharp-db.svg?v=1.0.0)](https://opensource.org/licenses/MIT)

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
| `password` | DB_SSH_PASSWORD | _none_ |
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
results = {
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
results = {
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
results = [
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


## Select

A Select object represents a SQL SELECT query and allows dynamically adding
clauses including JOIN, WHERE, ORDER BY, LIMIT, OFFSET.




### Dependent data

A Select object can splice in sibling or child data for each row.

### withSiblingData(propertyName, siblingSql)

Example:

```js
const query = Select.parse('SELECT id, name FROM users');
query.withSiblingData(
    'homeAddress',
    Select.parse(`
        SELECT * FROM addresses
        WHERE addresses.user_id IN(:id)
        AND addresses.type = 'home'
        AND addresses.deleted_at IS NULL
    `),
);
query.withSiblingData(
    'workAddress',
    Select.parse(`
        SELECT * FROM addresses
        WHERE addresses.user_id IN(:id)
        AND addresses.type = 'work'
        AND addresses.deleted_at IS NULL
    `),
);
const { results } = await query.fetch();
```

...and `results` for example may equal:

```js
results = [
    {
        id: 1,
        name: 'John',
        homeAddress: {
            id: 11,
            type: 'home',
            is_active: 1,
            user_id: 1,
            street: '123 Any St.',
            city: 'Any Town',
            state: 'CA'
        },
        workAddress: {
            id: 12,
            type: 'work',
            is_active: 1,
            user_id: 1,
            street: '123 Commerce Dr.',
            city: 'Any Town',
            state: 'CA',
        },
    },
    {
        id: 2,
        name: 'Jane',
        // rows without sibling data will be null
        homeAddress: null,
        workAddress: {
            id: 12,
            type: 'work',
            is_active: 1,
            user_id: 2,
            street: '123 Tower Blvd.',
            city: 'Any Town',
            state: 'CA',
        },
    }
]
```

### withChildData(propertyName, childSql)

Example:

```js
const query = Select.parse('SELECT id, headline, published_by FROM posts');
query.withChildData(
    'theComments',
    Select.parse('SELECT * FROM comments WHERE comments.post_id IN(:id)')
);
query.withChildData(
    'theTags',
    Select.parse(`
        SELECT posts_tags.post_id, tags.* FROM tags
        INNER JOIN posts_tags ON posts_tags.tag_id = tags.id
        WHERE posts_tags.post_id IN(:id)
    `)
);
query.withSiblingData(
    'thePublisher',
    Select.parse('SELECT id, name FROM users WHERE user_id IN(:published_by)')
);
const { results } = await query.fetch();
```

...and `results` for example may equal:

```js
results = [
    {
        id: 1,
        headline: 'Turmoil in China',
        published_by: 1001,
        theComments: [
            {
                id: 11,
                post_id: 1,
                user_id: 101,
                text: 'Sad to hear',
            },
            {
                id: 12,
                post_id: 1,
                user_id: 102,
                text: 'Hope it works out',
            },
        ],
        theTags: [
            {
                id: 101,
                post_id: 1,
                name: 'China',
            },
            {
                id: 102,
                post_id: 1,
                name: 'Crisis',
            },
        ],
        thePublisher: {
            id: 1001,
            name: 'John',
        },
    },
    {
        id: 2,
        headline: 'Syria at War',
        // records with missing child data will hae empty arrays
        theComments: [],
        theTags: [],
        thePublisher: null,
    }
]
```





## Parser

### Parser Limitations

The parser has several limitations.
The intent is to be fast and useful for 99% of situations.
