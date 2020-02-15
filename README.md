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
| host | DB_HOST | 127.0.0.1 |
| user | DB_USER | root |
| password | DB_PASSWORD | _empty string_ |
| database | DB_DATABASE | undefined |
| port | DB_PORT | 3306 |
| charset | DB_CHARSET| utf8mb4 |

See node's mysqljs for [other options](https://github.com/mysqljs/mysql#connection-options).

### Instantiation

```js
const db1 = Db.factory(); // all options in ENV
const db2 = Db.factory({ // specify options in constructor
    host: '0.0.0.0',
    port: 3306,
});
const db2Again = Db.factory(); // instance that was last created
```

All examples onward assume the `Db` instance has been stored in `db`.

### Plain select queries

```js
const { query, results, fields } = await db.select('SELECT * FROM users');
// query is the final query executed after value binding
// results is an Array of objects representing the query results
// fields is an Array of objects representing the columns that were returned
```

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

#### Binding types

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

Example: `{ id: 1, name: "John" }`

### selectValue(sql, ...bindValues)

Get only the first column of the first row.

```js
const { results: value } = await db.selectValue(sql);
```

Example: `"John"`

### selectHash(sql, ...bindValues)

Get an Object with column-value pairs.

```js
const { results: hash } = await db.selectHash(sql);
```

Example: `{ "1": "John", "2": "Jane" }`

### selectList(sql, ...bindValues)

Get an Array of values for the first column of the first row.

```js
const { results: list } = await db.selectList(sql);
```

Example: `["John", "Jane"]`

### selectExists(sql, ...bindValues)

Return true if query returns any rows.

```js
const { results: doesExist } = await db.selectExists(sql);
```

Example: `true`

### selectIndexed(indexColumn, sql, ...bindValues)

Return an Object where every result row is indexed by the given field.

```js
const { results: doesExist } = await db.selectIndexed('id', sql);
```

Example:
```js
{
  "1": { id: 1, name: "John" },
  "2": { id: 2, name: "Jane" },
}
```

### selectGrouped(groupColumn, sql, ...bindValues)

Return an Object where every result row is indexed by the given field.

```js
const { results: groups } = await db.selectGrouped('org', sql);
```

Example:
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
        SELECT users.*, actions.*
        FROM users
        INNER JOIN actions ON action.user_id = users.id
        WHERE users.is_active = ?
    `,
    // kill query if not completed within 30 seconds
    timeout: 30000,
    // return records with keys `users` and `actions` with their own fields nested underneath
    nestTables: true,
    // you can also bind values here using question marks
    values: [true],
};
const { results } = await db.select(options);
```

### selectFrom(table, fields, values)

```js
const { results } = await db.selectFrom('users', ['fname','lname'], {
    'id >': 5,
    is_active: true,
    department_id: [1,2],
});
```


## Parser

### Parser Limitations

The parser has several limitations.
The intent is to be fast and useful for 99% of situations.

```sql
-- SELECT clause does not properly handle expressions with commas
SELECT CONCAT(lname, ', ', fname) FROM users

--
```
