## Change Log

### v1.8.0 on 2022-09-05

- Move query building to SqlBuilder
- Add QueryLogger
- Make Db extend Emitter and emit DbEvent events
- Replace lodash.chunk with simpler custom function

### v1.7.2 on 2022-09-02

- Properly close ssh connections, even after errors
- Improve docs on Db.withInstance()

### v1.7.1 on 2022-03-20

- Tweak error behavior of Db.withInstance()

### v1.7.0 on 2022-03-19

- Add Db.withInstance()
- Switch from travis to appveyor

### v1.6.0 on 2021-10-12

- Upgrade ssh2 to version 1.x; [see ssh2's changelog](https://github.com/mscdex/ssh2/issues/935)
- Use jsdoc to generate documentation

### v1.5.3 on 2021-10-12

- Allow limit and offset to use placeholders
- Support LIKE with array. e.g. `query.where('foo', 'LIKE %?%', ['bar','baz'])`
- Update dependencies

### v1.5.2 on 2021-09-15

- Update withChildData to set empty fields to `[]` instead of `undefined`
- Update dependencies

### v1.5.1 on 2021-05-10

- Update Error.name to 'MySQLError'

### v1.5.0 on 2021-05-10

- Add support for composite keys to DataBroker

### v1.4.0 on 2021-05-08

- Update errors to provide more info including SQL that caused error
- Updated dependencies

### v1.3.0 on 2021-01-22

- Add Db.exportToSql() function
- Updated dependencies

### v1.2.1 on 2020-08-23

- Ignore undefined values on inserts and updates

### v1.0.1 on 2020-05-01

- Update dependencies

### v1.0.0 on 2020-02-28

- Initial release
