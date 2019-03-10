# sharp-db

Classes for running SQL and building select queries in MySQL

## Installation

```bash
npm install --save sharp-db
```

## Parser Limitations

The parser has several limitations. 
The intent is to be fast and useful for 99% of situations.

```sql
-- SELECT clause does not properly handle expressions with commas
SELECT CONCAT(lname, ',', fname) FROM users

-- 
```
