# sharp-db

[![Build Status](https://travis-ci.com/kensnyder/sharp-db.svg?branch=master&v=1.4.0)](https://travis-ci.org/kensnyder/sharp-db)
[![Code Coverage](https://codecov.io/gh/kensnyder/sharp-db/branch/master/graph/badge.svg?v=1.4.0)](https://codecov.io/gh/kensnyder/sharp-db)
[![ISC License](https://img.shields.io/github/license/kensnyder/sharp-db.svg?v=1.4.0)](https://opensource.org/licenses/ISC)

Classes for running SQL and building select queries in MySQL

## Installation

```bash
npm install sharp-db
```

## Table of Contents

* [Db](#db)
    * [Connection](#connection)
    * [Instantiation](#instantiation)
    * [SSH Tunneling](#ssh-tunneling)
    * [Basic Use](#basic-use)
    * [Bindings](#bindings)
    * [Methods](#methods)
    * [Useful Query Options](#useful-query-options)
	* [Solutions to Common Problems](#solutions-to-common-problems)
* [Select](#select)
    * [Select.parse()](#selectparse)
    * [Building the Query](#building-the-query)
    * [Fetching Data](#fetching-data)
    * [Counting Results](#counting-results)
    * [Set the `Db` instance](#specifying-the-db-instance-to-use)
    * [Dependent Data](#dependent-data)
    * [Other Methods](#other-methods)
    * [Select.parse() Limitations](#selectparse-limitations)
* [DataBroker](#databroker)
    * [Use in Integration Tests](#use-in-integration-tests)
    * [Insertions](#insertions)
    * [Deletions](#deletions)
* [How to Contribute](./CONTRIBUTING.md)
* [ISC License](./LICENSE.md)

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
const { Db } = require('sharp-db');
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

// Don't forget to close the connection when done
db1.destroy();
```

### SSH Tunneling

Connect to MySQL through an SSH tunnel

```js
const { Db } = require('sharp-db');
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

### Basic use

All code examples below assume the `Db` instance has been stored in `db`.

#### Plain select queries

```js
const { Db } = require('sharp-db');
const db = Db.factory();
const { query, results, fields } = await db.select('SELECT * FROM users');
// query is the final query executed after value binding
// results is an Array of objects representing the query results
// fields is an Array of objects representing the columns that were returned

// Don't forget to close the connection when done
db.destroy();
```

Relevant properties of each `fields` item:

| Item | Description | Example |
|---|---|---|
| `characterSet` | [Character set constant](https://github.com/mysqljs/mysql/blob/master/lib/protocol/constants/charsets.js) | 45 |
| `encoding` | Character set name | utf8 |
| `name` | Name of column | my_column |
| `columnLength` | Number of *bytes* of field | 400 |
| `columnType` | [Data type constant](https://github.com/mysqljs/mysql/blob/master/lib/protocol/constants/types.js) | 253 |
| `flags` | [Field flag constant](https://github.com/mysqljs/mysql/blob/master/lib/protocol/constants/field_flags.js) | 33 |

### Bindings

Question-mark and colon-prefixed bindings are supported.

#### Binding with Question Marks

```js
const sql = 'SELECT * FROM users WHERE is_active = ? AND department_id = ?';
const { results: users } = await db.select(sql, true, 5);
```

#### Named Bindings

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

### Methods

#### selectFirst(sql, ...bindValues)

Get only the first row.

```js
const { results: row } = await db.selectFirst(sql);
```

Example results: `{ id: 1, name: "John" }`

#### selectValue(sql, ...bindValues)

Get only the first column of the first row.

```js
const { results: value } = await db.selectValue(sql);
```

Example results: `"John"`

#### selectHash(sql, ...bindValues)

Get an Object with column-value pairs.

```js
const { results: hash } = await db.selectHash(sql);
```

Example results: `{ "1": "John", "2": "Jane" }`

#### selectList(sql, ...bindValues)

Get an Array of values for the first column of the first row.

```js
const { results: list } = await db.selectList(sql);
```

Example results: `["John", "Jane"]`

#### selectExists(sql, ...bindValues)

Return true if query returns any rows.

```js
const { results: doesExist } = await db.selectExists(sql);
```

Example results: `true`

#### selectIndexed(indexColumn, sql, ...bindValues)

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

#### selectGrouped(groupColumn, sql, ...bindValues)

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

### Useful Query Options

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

#### nestTables Example

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

#### selectFrom(table, fields, values)

Build and run a simple select statement.

```js
const { results } = await db.selectFrom('users', ['fname','lname'], {
    'id >': 5,
    is_active: true,
    department_id: [1,2],
});
```

#### insert(sql, ...bindVars)

Run an insert statement; return the id of the new record if applicable.

```js
const { insertId } = await db.insert("INSERT INTO users SET name='John', email='john@example.com'");
```

#### insertInto(table, values)

Build and run an insert statement; return the id of the new record if applicable.

```js
const { insertId } = await db.insertInto('users', {
    name: 'John',
    email: 'john@example.com',
});
```

#### insertExtended(table, rows)

Build and run an extended insert statement; return the id of the last record if applicable.

```js
const { insertId } = await db.insertExtended('users', [
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' },
]);
```

#### insertIntoOnDuplicateKeyUpdate(table, insert, update)

Build and run an insert statement; return the id of the new record if applicable.

```js
const { insertId, affectedRows } = await db.insertIntoOnDuplicateKeyUpdate(
    'users',
    {
        sso_ref: 'A123456',
        name: 'Jane Doe',
        created_at: '2020-02-02',
    },
    {
        name: 'Jane Doe Carter',
        modified_at: '2020-02-02',
    }
);
```

#### update(sql, ...bindValues)

Run an update statement; return the number of affected rows.

```js
const { affectedRows } = await db.update(
    "UPDATE users SET name = ? WHERE id = ?",
    'Jane Doe Carter',
    5
);
```

#### updateTable(table, set, where)

Build and run an update statement; return the number of affected rows.

```js
const { affectedRows } = await db.updateTable(
    'users',
    { name: 'Jane Doe Carter' },
    { id: 5 }
);
```

#### delete(sql, ...bindValues)

Run a delete statement; return the number of affected rows.

```js
const { affectedRows } = await db.delete(
    "DELETE FROM users WHERE id = ? LIMIT 1",
    5
);
```

#### deleteFrom(table, where, limit)

Build and run a delete statement; return the number of affected rows.

```js
const { affectedRows } = await db.deleteFrom('users', { id: 5 }, 1);
```

#### query(sql, ...bindValues)

Run any type of statement.

```js
const { query, results, fields } = await db.query(
    'SELECT * FROM users'
);
```

#### multiQuery(sql, ...bindValues)

Run multiple statements delimited by semicolon.

```js
const { query, results, fields } = await db.query(
    'SELECT * FROM users; SELECT * FROM tags'
);
```

### Solutions to Common Problems

#### Connection is in closed state

`Error: Can't add new command when connection is in closed state`

Make sure you use `await` your results before closing your connection.

#### ECONNRESET or error event

`Error: read ECONNRESET` or `Emitted 'error' event on Client instance`

Your SSH connection may have timed out. To keep connection alive, you
can send keepalive packets.

```js
const sshConfig = {
	// ...
	// How often (in milliseconds) to send SSH-level keepalive packets to the server (in a similar way as OpenSSH's ServerAliveInterval config option). Set to 0 to disable. Default: 0
	keepaliveInterval: 30,
	// How many consecutive, unanswered SSH-level keepalive packets that can be sent to the server before disconnection (similar to OpenSSH's ServerAliveCountMax config option). Default: 3
	keepaliveCountMax: 120,
}
const db = new Db(mysqlConfig, sshConfig);
```

## Select

A Select object represents a SQL SELECT query and allows dynamically adding
clauses including JOIN, WHERE, ORDER BY, LIMIT, OFFSET.

### Select.parse()

The easiest way to define a base query is to use `Select.parse(sql)` and then
add criteria as needed.

```js
const { Select } = require('sharp-db');
const query = Select.parse(`
    SELECT u.id, u.fname, u.lname, u.email, p.phone
    FROM users
    LEFT JOIN phone_numbers p ON p.user_id = u.id
      AND p.type = 'main'
    WHERE u.is_active = 1
`);
if (email) {
    query.where('u.email', email);
}
if (areaCode) {
    query.where('p.phone', 'LIKE ?%', areaCode);
}
query.sort(sortField);
query.limit(limitTo);
```

You can also define binding in the base query itself.

```js
const query = Select.parse(`
    SELECT u.id, u.fname, u.lname, u.email, a.city, a.zip
    FROM users
    LEFT JOIN addresses a ON a.user_id = u.id
    WHERE a.state = :state
`);
query.bind('state', state);
```

And you can bind multiple values at once.

```js
const query = Select.parse(`
    SELECT u.id, u.fname, u.lname, u.email, a.city, a.zip
    FROM users
    LEFT JOIN addresses a ON a.user_id = u.id
    WHERE a.state = :state
      AND a.city IN (:city)
`);
query.bind({ state, city });
```

### Building the Query

The following are the most common methods for building queries.

- `query.columns(columnNames)` - Add column names to fetch
- `query.column(columnName)` - Add a column name to fetch
- `query.table(tableName)` - Specify the table in the FROM clause
- `query.from(tableName)` - Same as above
- `query.innerJoin(expression)` - Add an INNER JOIN expression
- `query.leftJoin(expression)` - Add a LEFT JOIN expression
- `query.fullJoin(expression)` - Add a FULL JOIN expression
- `query.rightJoin(expression)` - Add a RIGHT JOIN expression
- `query.crossJoin(expression)` - Add a CROSS JOIN expression
- `query.leftOuterJoin(expression)` - Add a LEFT OUTER JOIN expression
- `query.fullOuterJoin(expression)` - Add a FULL OUTER JOIN expression
- `query.rightOuterJoin(expression)` - Add a RIGHT OUTER JOIN expression
- `query.groupBy(column)` - Group by a column or expression
- `query.where(column, operator, value)` - Require column satisfy operator
- `query.where(column, value)` - Require column equal a value
- `query.where(expression)` - Add an arbitrary WHERE expression
- `query.where(columnValuePairs)` - Add multiple conditions
- `query.whereBetween(column, twoValueArray)` - Require value BETWEEN, < or >
- `query.orWhere(conditions)` - Specify multiple `where()`s joined by `OR`
- `query.having(column, operator, value)` - Having column satisfy operator
- `query.having(column, value)` - Having column equal value
- `query.having(column, value)` - Having column equal value
- `query.having(expression)` - Having an arbitrary expression
- `query.orHaving(expressions)` - Multiple `having()`s joined by OR
- `query.orderBy(column)` - Add ORDER BY clause
- `query.sortField(column, mapNames)` - Add ORDER BY clause with mapNames
- `query.limit(num)` - Limit by the given number
- `query.offset(num)` - Specify an offset
- `query.page(num)` - Automatically calculate offset based on limit and page

### Fetching Data

The methods to fetch data mirror those of Db.

- `query.fetch()` - equivalent to `db.select()`
- `query.fetchFirst()` - equivalent to `db.selectFirst()`
- `query.fetchHashed()` - equivalent to `db.selectHashed()`
- `query.fetchList()` - equivalent to `db.selectList()`
- `query.fetchValue()` - equivalent to `db.selectValue()`
- `query.fetchIndexed(byField)` - equivalent to `db.selectIndexed(byField)`
- `query.fetchGrouped(byField)` - equivalent to `db.selectGrouped(byField)`

### Counting Results

One powerful feature of Select is that it can construct a count query to fetch
the number of results that would have been returned if there were no LIMIT.

```js
const query = Select.parse('SELECT id, name FROM users LIMIT 5');
const { results: users } = await query.fetch();
const { results: count } = await query.foundRows();
// will run the following query:
// SELECT COUNT(*) AS foundRows FROM users
```

### Specifying the `Db` Instance to Use

There are three ways to specify the `Db` instance to fetch data with:

1. `query = Select.parse(sql, db)`
1. `query = new Select(db)`
1. `query.db = db`

If no instance is specified, `Db.factory()` is used.

### Dependent Data

A Select object can splice in sibling or child data for each row.

#### withSiblingData(propertyName, siblingSql)

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

#### withChildData(propertyName, childSql)

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

### Other methods

Select has a few other useful methods.

- `query.getClone()` - Get an exact copy of this query object
- `query.unjoin(table)` - Remove a join expression
- `query.escape(value)` - Escape a raw value
- `query.escapeQuoteless(value)` - Escape a value but avoid wrapping in quotes
- `query.toString()` - Get prettified SQL
- `query.normalized()` - Get raw SQL (all whitespace is spaces)
- `query.toBoundSql()` - Get raw SQL with bindings replaced
- `query.reset(field)` - Reset a single aspect of the query (e.g. where, having)
- `query.reset()` - Reset query to an empty state

### Select.parse() Limitations

`Select.parse()` uses regular expressions and is not a true parser. The intent
is to be fast and useful for 99% of situations.

Below are some limitations illustrated by example.

#### Nested Subqueries

Most subqueries can be parsed but sub-subqueries don't work.

```js
// WILL NOT WORK
const query = Select.parse(`
SELECT * FROM categories_posts WHERE category_id IN(
    SELECT id FROM categories WHERE client_id IN(
        SELECT client_id FROM affiliations WHERE name LIKE :name
    )
)`);
// WILL WORK
const subquery = Select.parse(`SELECT id FROM categories WHERE client_id IN(
    SELECT client_id FROM affiliations WHERE name LIKE :name
)`);
subquery.bind({ name: 'DogeCoin' });
const query = Select.parse(`SELECT * FROM categories_posts WHERE`);
query.where(`category_id IN(${subquery})`);
```

#### Keywords in Strings

If you need to use keywords in strings, use bindings.

```sql
-- WILL NOT WORK
SELECT id, CONCAT('WHERE ', expr) FROM users WHERE name = :name;
-- WILL WORK
SELECT id, CONCAT(:binding, expr) FROM users WHERE name = :name;
```

#### Keywords in Bindings

Binding names cannot be SQL clause keywords (even if lower cased).

```sql
-- WILL NOT WORK
SELECT CONCAT(:where, fname) FROM users WHERE id = :id;
-- WILL WORK
SELECT CONCAT(:title, fname) FROM users WHERE id = :id;
```

#### Nested OR and AND Clauses

Nested logic doesn't work.

```sql
-- WILL NOT WORK
SELECT * FROM users
WHERE (
    fname = :fname AND (
        lname LIKE '%john' OR lname LIKE 'john%'
    ) OR (
        id > 0 AND is_active IS NOT NULL
    )
)
```

```js
// WILL WORK
const query = Select.parse(`SELECT * FROM users`);
query.orWhere([
	"fname = :fname AND (lname LIKE '%john' OR lname LIKE 'john%')",
	'id > 0 AND is_active IS NOT NULL',
]);
```

## DataBroker

DataBroker is useful for inserting and deleting data that will needs to be
removed and restored.

### Use in Integration Tests

With integration tests, it may be useful to insert test data, run assertions
and then clean up the test data.

### Insertions

Use the `.insert()` method to add records and then call `.cleanup()` to remove
those records.

Example:

```js
const { DataBroker, Db } = require('sharp-db');
const broker = new DataBroker(Db.factory(config));
const userId = await broker.insert('users', { name: 'John', is_active: true });
// the new user ID is also available at broker.ids
expect(broker.ids.users[0]).toBe(userId);
// ... integration test using userId ...
// then clean up all data
await broker.cleanup();
```

### Deletions

Example:

```js
const { DataBroker, Db } = require('sharp-db');
const broker = new DataBroker(Db.factory(config));
// affectedRows will be the count of records deleted
const affectedRows = await broker.delete('users', { status_id: 5 });
// the deleted records are available at broker.deleted
expect(broker.deleted).toHaveLength(affectedRows);
// ... integration test ...
// then restore all the deleted all data
await broker.cleanup();
```
