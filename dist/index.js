parcelRequire = (function(e, r, n, t) {
	var i = 'function' == typeof parcelRequire && parcelRequire,
		o = 'function' == typeof require && require;
	function u(n, t) {
		if (!r[n]) {
			if (!e[n]) {
				var f = 'function' == typeof parcelRequire && parcelRequire;
				if (!t && f) return f(n, !0);
				if (i) return i(n, !0);
				if (o && 'string' == typeof n) return o(n);
				var c = new Error("Cannot find module '" + n + "'");
				throw ((c.code = 'MODULE_NOT_FOUND'), c);
			}
			(p.resolve = function(r) {
				return e[n][1][r] || r;
			}),
				(p.cache = {});
			var l = (r[n] = new u.Module(n));
			e[n][0].call(l.exports, p, l, l.exports, this);
		}
		return r[n].exports;
		function p(e) {
			return u(p.resolve(e));
		}
	}
	(u.isParcelRequire = !0),
		(u.Module = function(e) {
			(this.id = e), (this.bundle = u), (this.exports = {});
		}),
		(u.modules = e),
		(u.cache = r),
		(u.parent = i),
		(u.register = function(r, n) {
			e[r] = [
				function(e, r) {
					r.exports = n;
				},
				{},
			];
		});
	for (var f = 0; f < n.length; f++) u(n[f]);
	if (n.length) {
		var c = u(n[n.length - 1]);
		'object' == typeof exports && 'undefined' != typeof module
			? (module.exports = c)
			: 'function' == typeof define && define.amd
			? define(function() {
					return c;
			  })
			: t && (this[t] = c);
	}
	return u;
})(
	{
		Ez06: [
			function(require, module, exports) {
				'use strict';
				Object.defineProperty(exports, '__esModule', { value: !0 }), (exports.Db = void 0);
				var e = t(require('mysql'));
				function t(e) {
					return e && e.__esModule ? e : { default: e };
				}
				function s(e) {
					for (var t = 1; t < arguments.length; t++) {
						var s = null != arguments[t] ? arguments[t] : {},
							r = Object.keys(s);
						'function' == typeof Object.getOwnPropertySymbols &&
							(r = r.concat(
								Object.getOwnPropertySymbols(s).filter(function(e) {
									return Object.getOwnPropertyDescriptor(s, e).enumerable;
								})
							)),
							r.forEach(function(t) {
								n(e, t, s[t]);
							});
					}
					return e;
				}
				function n(e, t, s) {
					return (
						t in e
							? Object.defineProperty(e, t, {
									value: s,
									enumerable: !0,
									configurable: !0,
									writable: !0,
							  })
							: (e[t] = s),
						e
					);
				}
				class r {
					constructor(e = {}) {
						this.mocks = [];
						const t =
							'object' == typeof process && 'object' == typeof process.env ? process.env : {};
						this.config = {
							host: e.hostname || t.DB_HOSTNAME || '127.0.0.1',
							user: e.username || t.DB_USERNAME || 'root',
							password: e.password || t.DB_PASSWORD || '',
							database: e.database || t.DB_DATABASE || 'platform',
							port: e.port || t.DB_PORT || 3306,
							encoding: e.encoding || t.DB_ENCODING || 'utf-8',
						};
					}
					static factory(e = {}) {
						return r.instance || (r.instance = new r(e)), r.instance;
					}
					connect() {
						(this.connection = e.default.createConnection(this.config)),
							this.connection.connect(e => {
								if (e && e.fatal) throw new Error(`[${e.code}] ${e.sqlMessage}`);
							});
					}
					connectOnce() {
						this.connection || this.connect();
					}
					select(e, ...t) {
						this.connectOnce();
						const s = this.bindArgs(e, t);
						return new Promise((e, t) => {
							this.lastQuery = this.connection.query(s, (s, n, r) => {
								s ? t(s) : ((this.lastFields = r), e(n));
							});
						});
					}
					selectHash(e, ...t) {
						this.connectOnce();
						const s = this.bindArgs(e, t);
						return new Promise((e, n) => {
							this.lastQuery = this.connection.query(s, t, (t, s, r) => {
								if (t) n(t);
								else {
									this.lastFields = r;
									const t = r[0].name,
										n = r[1].name,
										c = {};
									s.forEach(e => {
										c[e[t]] = e[n];
									}),
										e(c);
								}
							});
						});
					}
					selectList(e, ...t) {
						this.connectOnce();
						const s = this.bindArgs(e, t);
						return new Promise((e, t) => {
							this.lastQuery = this.connection.query(s, (s, n, r) => {
								if (s) t(s);
								else {
									this.lastFields = r;
									const t = r[0].name,
										s = [];
									n.forEach(e => s.push(e[t])), e(s);
								}
							});
						});
					}
					selectGrouped(e, t, ...s) {
						this.connectOnce();
						const n = this.bindArgs(t, s);
						return new Promise((t, s) => {
							this.lastQuery = this.connection.query(n, (n, r, c) => {
								if (n) s(n);
								else {
									this.lastFields = c;
									const s = {};
									r.forEach(t => {
										s[t[e]] || (s[t[e]] = []), s[t[e]].push(t);
									}),
										t(s);
								}
							});
						});
					}
					selectIndexed(e, t, ...s) {
						this.connectOnce();
						const n = this.bindArgs(t, s);
						return new Promise((t, s) => {
							this.lastQuery = this.connection.query(n, (n, r, c) => {
								if (n) s(n);
								else {
									this.lastFields = c;
									const s = {};
									r.forEach(t => {
										s[t[e]] = t;
									}),
										t(s);
								}
							});
						});
					}
					selectFirst(e, ...t) {
						this.connectOnce();
						const s = this.bindArgs(e, t);
						return new Promise((e, t) => {
							this.lastQuery = this.connection.query(s, (s, n, r) => {
								s ? t(s) : ((this.lastFields = r), e(n[0]));
							});
						});
					}
					selectValue(e, ...t) {
						this.connectOnce();
						const s = this.bindArgs(e, t);
						return new Promise((e, t) => {
							this.lastQuery = this.connection.query(s, (s, n, r) => {
								if (s) t(s);
								else {
									this.lastFields = r;
									const t = r[0].name;
									e(n[0][t]);
								}
							});
						});
					}
					selectExists(e, ...t) {
						const s = this.bindArgs(e, t);
						return (
							(s.sql = `SELECT EXISTS (${s.sql}) AS does_it_exist`),
							this.selectValue(s).then(Boolean)
						);
					}
					insert(e, ...t) {
						this.connectOnce();
						const s = this.bindArgs(e, t);
						return new Promise((e, t) => {
							this.lastQuery = this.connection.query(s, (s, n) => {
								s ? t(s) : e(n.insertId);
							});
						});
					}
					update(e, ...t) {
						this.connectOnce();
						const s = this.bindArgs(e, t);
						return new Promise((e, t) => {
							this.lastQuery = this.connection.query(s, (s, n) => {
								s ? t(s) : e(n.changedRows);
							});
						});
					}
					delete(e, ...t) {
						return this.update(e, ...t);
					}
					selectFrom(t, s = [], n = {}, r = '') {
						this.connectOnce();
						const c = s.map(t => e.default.escapeId(t)),
							i = `SELECT ${s.length ? c.join(', ') : '*'} FROM ${e.default.escapeId(
								t
							)} WHERE ${this.buildWheres(n) || '1'} ${r}`.trim();
						return this.select(i);
					}
					selectId(e, t) {
						return this.selectRecordByKey(e, 'id', t);
					}
					selectUuid(e, t) {
						return this.selectRecordByKey(e, 'uuid', t);
					}
					selectRecordByKey(t, s, n) {
						const r = e.default.escapeId(t),
							c = e.default.escapeId(s);
						return this.selectFirst(`SELECT * FROM ${r} WHERE ${c} = ?`, n);
					}
					findIdOrCreate(t, n, r, c = {}) {
						const i = e.default.escapeId(t),
							o = e.default.escapeId(n);
						return this.selectFirst(`SELECT id FROM ${i} WHERE ${o} = ?`, r).then(
							e => e || this.insertInto(t, s({ [n]: r }, c))
						);
					}
					insertInto(t, s) {
						return (
							this.connectOnce(),
							new Promise((n, r) => {
								const c = `INSERT INTO ${e.default.escapeId(t)} SET ?`;
								this.lastQuery = this.connection.query(c, s, e => {
									e
										? r(e)
										: this.connection.query('SELECT LAST_INSERT_ID() AS id', (e, t) => {
												e ? r(e) : n(t[0].id);
										  });
								});
							})
						);
					}
					updateTable(t, s, n = {}) {
						this.connectOnce();
						const r = `UPDATE ${e.default.escapeId(t)} SET ? WHERE ${this.buildWheres(n)}`;
						return this.select(r, s);
					}
					deleteFrom(t, s, n = null) {
						this.connectOnce();
						let r = `DELETE FROM ${e.default.escapeId(t)} WHERE ${this.buildWheres(s)}`;
						return n > 0 && (r = `${r}LIMIT ${n}`), this.delete(r);
					}
					buildWheres(e) {
						const t = [];
						for (const s in e) e.hasOwnProperty(s) && t.push(this.buildWhere(s, e[s]));
						return t.length ? t.join(' AND ') : '1';
					}
					buildWhere(t, s) {
						let [n, r] = t.split(' ');
						if (((n = e.default.escapeId(n)), 'BETWEEN' === (r = r ? r.toUpperCase() : '='))) {
							return `${n} BETWEEN ${e.default.escape(s[0])} AND ${e.default.escape(s[1])}`;
						}
						if (null === s) return '=' === r ? `${n} IS NULL` : `${n} IS NOT NULL`;
						if (Array.isArray(s)) {
							const t = s.map(t => e.default.escape(t));
							return '=' === r || 'IN' === r ? `${n} IN(${t})` : `${n} NOT IN(${t})`;
						}
						return `${n} ${r} ${e.default.escape(s)}`;
					}
					bindArgs(t, s) {
						const n = 'object' == typeof t ? t : { sql: t };
						return (
							'string' != typeof n.sql && (n.sql = ''),
							Array.isArray(s)
								? (s.forEach(t => {
										t && 'object' == typeof t && !Array.isArray(t)
											? (n.sql = n.sql.replace(/:([\w_]+)/g, (s, n) =>
													t.hasOwnProperty(n) ? e.default.escape(t[n]) : s
											  ))
											: (n.sql = n.sql.replace('?', e.default.escape(t)));
								  }),
								  n)
								: n
						);
					}
					escape(t) {
						return e.default.escape(t);
					}
					escapeQuoteless(t) {
						return e.default.escape(t).slice(1, -1);
					}
					tpl() {
						const t = {};
						return (
							[
								'select',
								'selectFirst',
								'selectList',
								'selectHash',
								'selectValue',
								'insert',
								'update',
								'delete',
							].forEach(s => {
								t[s] = (t, ...n) =>
									this[s](
										(function(t, s) {
											let n = t[0];
											return (
												s.forEach((s, r) => {
													(n += e.default.escape(s)), (n += t[r + 1]);
												}),
												n
											);
										})(t, n)
									);
							}),
							t
						);
					}
					mock(e, t) {
						return (
							0 === this.mocks.length &&
								(this.connection = {
									connect: function() {},
									query: function(e, s, n) {
										for (mock of this.mocks) {
											const { when: t, data: s } = mock;
											if ('string' == typeof t) {
												if (e.sql === t) return void n(s);
											} else if (t instanceof RegExp) {
												if (t.test(e.sql)) return void n(s);
											} else if ('function' == typeof t && t(e.sql)) return void n(s);
										}
										n(t);
									},
								}),
							this.mocks.push({ when: e, data: t }),
							this
						);
					}
				}
				exports.Db = r;
			},
			{},
		],
		ZHKI: [
			function(require, module, exports) {
				'use strict';
				Object.defineProperty(exports, '__esModule', { value: !0 }), (exports.Parser = void 0);
				var e = i(require('lodash.capitalize')),
					s = i(require('lodash.camelcase')),
					t = i(require('lodash.upperfirst')),
					r = i(require('lodash.trim'));
				function i(e) {
					return e && e.__esModule ? e : { default: e };
				}
				class n {
					constructor(e) {
						this.query = e;
					}
					_stripComments(e) {
						return (e = (e = (e = e.replace(/\/\*[\s\S]*?\*\//g, '')).replace(
							/--([\r\n]|\s+[^\r\n]+[\r\n])/g,
							''
						)).replace(/#[^\r\n]+[\r\n]/g, ''));
					}
					_extractSubqueries(e) {
						const s = {};
						let t = 0;
						const r = e => {
							const r = `~~SUBQUERY_${t++}~~`;
							return (s[r] = e), r;
						};
						return {
							sql: (e = (e = (e = e.replace(/\(\s*SELECT\s+.+\)\s+AS\s+[^\s,]+/, r)).replace(
								/\bIF\s*\(.+\)\s+AS\s+[^\s,]+/,
								r
							)).replace(/\bIN\s*\(SELECT\s.+?\)/, r)),
							subqueries: s,
						};
					}
					_injectSubqueries(e) {
						const s = s => e[s] || s,
							t = e => e.replace(/~~SUBQUERY_\d+~~/g, s);
						(this.query._columns = this.query._columns.map(s)),
							(this.query._joins = this.query._joins.map(t)),
							(this.query._wheres = this.query._wheres.map(t)),
							(this.query._havings = this.query._havings.map(t));
					}
					_split(e) {
						return e.split(
							/\b(SELECT|FROM|(?:INNER |LEFT OUTER |RIGHT OUTER |LEFT |RIGHT |CROSS |FULL |FULL OUTER )JOIN|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET)\b/i
						);
					}
					parse(e) {
						const r = this._stripComments(e),
							{ sql: i, subqueries: n } = this._extractSubqueries(r),
							h = this._split(i);
						let l = 1;
						for (; l < h.length; ) {
							const e = h[l++].trim(),
								r = (0, t.default)((0, s.default)(e)),
								i = h[l++].trim();
							this[`_handle${r}`](i);
						}
						return this._injectSubqueries(n), !0;
					}
					_handleSelect(e) {
						let s = e.split(/s*,s*/),
							t = '';
						s.forEach((e, s) => {
							if (0 === s) {
								const s = /^(SQL_CALC_FOUND_ROWS)\s+/i,
									t = e.match(s);
								t && (this.query.option(t[1]), (e = e.replace(s, '')));
							}
							t.length
								? ((t += e + ','), e.indexOf(')') > 0 && (t = ''))
								: e.match(/\([^)]+$/)
								? (t = e + ',')
								: this.query.column(e.trim());
						});
					}
					_handleFrom(e) {
						e.split(/\s*,\s*/).forEach(e => this.query.table(e));
					}
					_handleJoin(e) {
						this.query.innerJoin(e);
					}
					_handleInnerJoin(e) {
						this.query.innerJoin(e);
					}
					_handleLeftJoin(e) {
						this.query.leftJoin(e);
					}
					_handleLeftOuterJoin(e) {
						this.query.leftOuterJoin(e);
					}
					_handleRightJoin(e) {
						this.query.rightJoin(e);
					}
					_handleRightOuterJoin(e) {
						this.query.rightOuterJoin(e);
					}
					_handleCrossJoin(e) {
						this.query.crossJoin(e);
					}
					_handleFullJoin(e) {
						this.query.fullJoin(e);
					}
					_handleFullOuterJoin(e) {
						this.query.fullOuterJoin(e);
					}
					_handleWhere(e) {
						/^(1|'1'|true)$/i.test(e)
							? this.query._wheres.push(e)
							: this._handleConditions('where', e);
					}
					_handleHaving(e) {
						this._handleConditions('having', e);
					}
					_handleConditions(s, t) {
						t.split(/\bAND\b/i).forEach(t => {
							const i = t.split(/\bOR\b/i).map(r.default);
							if (1 === i.length) {
								const e = s;
								this.query[e](i[0]);
							} else {
								const t = 'or' + (0, e.default)(s);
								this.query[t](i);
							}
						});
					}
					_handleGroupBy(e) {
						e.split(/\s*,\s*/).forEach(e => this.query.groupBy(e));
					}
					_handleOrderBy(e) {
						e.split(/\s*,\s*/).forEach(e => this.query.orderBy(e));
					}
					_handleLimit(e) {
						this.limit(e);
					}
					_handleOffset(e) {
						this.offset(e);
					}
				}
				exports.Parser = n;
			},
			{},
		],
		PQRP: [
			function(require, module, exports) {
				'use strict';
				Object.defineProperty(exports, '__esModule', { value: !0 }), (exports.Select = void 0);
				var t = require('../Parser/Parser.js'),
					s = require('../Db/Db.js'),
					i = l(require('lodash.clonedeep')),
					e = l(require('lodash.escaperegexp')),
					n = l(require('lodash.forown')),
					h = l(require('lodash.uniq')),
					r = l(require('quickly-count-substrings')),
					o = l(require('mysql'));
				function l(t) {
					return t && t.__esModule ? t : { default: t };
				}
				class u {
					parse(s) {
						return this.reset(), new t.Parser(this).parse(s), this;
					}
					static parse(t) {
						const i = s.Db.factory();
						return u.init(i).parse(t);
					}
					constructor(t) {
						(this.db = t), this.reset();
					}
					static init(t) {
						return new u(t);
					}
					toString() {
						const t = [
							'SELECT',
							this._options.length ? `  ${this._options.join('\n  ')}` : null,
							this._columns.length ? `  ${this._columns.join(',\n  ')}` : '  *\n',
							`FROM ${this._tables.join(', ')}`,
							this._joins.length ? this._joins.join('\n') : null,
							this._wheres.length ? `WHERE ${this._wheres.join('\n  AND ')}` : null,
							this._groupBys.length ? `GROUP BY ${this._groupBys.join(',\n  ')}` : null,
							this._havings.length ? `HAVING ${this._havings.join('\n  AND ')}` : null,
							this._orderBys.length ? `ORDER BY ${this._orderBys.join(',\n  ')}` : null,
						];
						if (this._page > 0) {
							const s = (this._page - 1) * this._limit;
							t.push(`LIMIT ${this._limit}`), t.push(`OFFSET ${s}`);
						} else
							this._limit > 0 && t.push(`LIMIT ${this._limit}`),
								this._offset > 0 && t.push(`OFFSET ${this._offset}`);
						return t
							.filter(Boolean)
							.join('\n')
							.trim();
					}
					normalized() {
						const t = [
							'SELECT',
							this._options.length ? this._options.join(' ') : null,
							this._columns.length ? this._columns.join(', ') : '*',
							`FROM ${this._tables.join(', ')}`,
							this._joins.length ? this._joins.join(' ') : null,
							this._wheres.length ? `WHERE ${this._wheres.join(' AND ')}` : null,
							this._groupBys.length ? `GROUP BY ${this._groupBys.join(', ')}` : null,
							this._havings.length ? `HAVING ${this._havings.join(' AND ')}` : null,
							this._orderBys.length ? `ORDER BY ${this._orderBys.join(', ')}` : null,
						];
						if (this._page > 0) {
							const s = (this._page - 1) * this._limit;
							t.push(`LIMIT ${this._limit}`), t.push(`OFFSET ${s}`);
						} else
							this._limit > 0 && t.push(`LIMIT ${this._limit}`),
								this._offset > 0 && t.push(`OFFSET ${this._offset}`);
						return t
							.filter(Boolean)
							.join(' ')
							.trim();
					}
					reset(t = null) {
						if (Array.isArray(t)) return t.forEach(t => this.reset(t)), this;
						if (t) {
							let s = '_' + t.replace(/s$/, '');
							['option', 'column', 'table', 'where', 'having', 'groupBy', 'orderBy'].indexOf(t) >
								-1 && (s += 's'),
								(this[s] = ['limit', 'offset', 'page'].indexOf(t) > -1 ? null : []);
						} else
							(this._hasOne = []),
								(this._belongsTo = []),
								(this._hasMany = []),
								(this._habtm = []),
								(this._options = []),
								(this._columns = []),
								(this._tables = []),
								(this._joins = []),
								(this._wheres = []),
								(this._havings = []),
								(this._groupBys = []),
								(this._orderBys = []),
								(this._limit = null),
								(this._offset = null),
								(this._page = null),
								(this._bound = []);
						return this;
					}
					hasOne(t, s) {
						return this._hasOne.push({ thisProperty: t, thatTableAndColumn: s }), this;
					}
					belongsTo(t, s) {
						return this._belongsTo.push({ thisProperty: t, thatTableAndColumn: s }), this;
					}
					hasMany(t, s) {
						return this._hasMany.push({ thisProperty: t, thatTableAndColumn: s }), this;
					}
					habtm(t, s, i) {
						const e = i.match(/(?:LEFT JOIN\s*)?(.+)\s+ON\s+\1\.id\s*=\s*(.+)\.(.+)/),
							n = i.match(/(?:LEFT JOIN\s*)?(.+)\s+ON\s+(.+)\.(.+)\s*=\s*\1\.id/);
						if (!e && !n)
							throw new Error(
								`Select: Unknown join pattern: "${i}". Expecting format "joinTable ON joinTable.id = throughTable.foreignColumn"`
							);
						let [h, r, o, l] = e || n;
						return (
							this._habtm.push({
								thisProperty: t,
								idsColumn: s,
								join: i,
								joinTable: r,
								throughTable: o,
								foreignColumn: l,
							}),
							this
						);
					}
					hasAndBelongsToMany(t, s, i) {
						return this.habtm(t, s, i);
					}
					bind(t, s = null) {
						return 'object' == typeof t && null === s
							? ((0, n.default)(t, (t, s) => {
									this._bound[s] = t;
							  }),
							  this)
							: ((this._bound[t] = s), this);
					}
					unbind(t) {
						return Array.isArray(t)
							? (t.forEach(t => this.unbind(t)), this)
							: ((this._bound[t] = void 0), this);
					}
					async fetch(t = {}) {
						t.sql = this.toString();
						const s = await this.db.select(t, this._bound);
						return (
							await this._spliceHasOnes(s),
							await this._spliceBelongsTos(s),
							await this._spliceHasManys(s),
							await this._spliceHabtms(s),
							s
						);
					}
					async fetchFirst() {
						this.limit(1);
						const t = await this.fetch();
						return Array.isArray(t) && t.length ? t[0] : null;
					}
					fetchHash() {
						return this.db.selectHash(this.toString(), this._bound);
					}
					fetchValue() {
						return this.db.selectValue(this.toString(), this._bound);
					}
					async fetchIndexed(t) {
						const s = await this.fetch();
						if (!Array.isArray(s)) return !1;
						const i = {};
						return s.forEach(s => (i[s[t]] = s)), i;
					}
					async fetchGrouped(t) {
						const s = await this.fetch();
						if (!Array.isArray(s)) return !1;
						const i = {};
						return (
							s.forEach(s => {
								i[s[t]] || (i[s[t]] = []), i[s[t]].push(s);
							}),
							i
						);
					}
					getClone() {
						const t = new u();
						return (
							(t._hasOne = (0, i.default)(this._hasOne)),
							(t._belongsTo = (0, i.default)(this._belongsTo)),
							(t._hasMany = (0, i.default)(this._hasMany)),
							(t._habtm = (0, i.default)(this._habtm)),
							(t._options = (0, i.default)(this._options)),
							(t._columns = (0, i.default)(this._columns)),
							(t._tables = (0, i.default)(this._tables)),
							(t._joins = (0, i.default)(this._joins)),
							(t._wheres = (0, i.default)(this._wheres)),
							(t._havings = (0, i.default)(this._havings)),
							(t._groupBys = (0, i.default)(this._groupBys)),
							(t._orderBys = (0, i.default)(this._orderBys)),
							(t._limit = this._limit),
							(t._offset = this._offset),
							(t._page = this._page),
							(t._bound = (0, i.default)(this._bound)),
							t
						);
					}
					getFoundRowsQuery(t = '*') {
						if (0 === this._havings.length) {
							const s = this.getClone();
							return (
								(s._columns = [`COUNT(${t}) AS foundRows`]),
								(s._options = []),
								(s._groupBys = []),
								(s._orderBys = []),
								(s._limit = null),
								(s._offset = null),
								(s._page = null),
								s
							);
						}
						{
							const t = this.getClone();
							return (t._limit = null), (t._offset = null), (t._page = null), t;
						}
					}
					getFoundRowsSql(t, s = !1) {
						const i = this.getFoundRowsQuery(t);
						if (0 === this._havings.length) return s ? i.normalized() : i.toString();
						if (s) {
							return `SELECT COUNT(*) AS foundRows FROM (${i.normalized()}) AS subq`;
						}
						return `SELECT COUNT(*) AS foundRows FROM (\n\t${i
							.toString()
							.replace(/\n/g, '\n\t')}\n) AS subq`;
					}
					foundRows(t = '*') {
						const s = this.getFoundRowsSql(t);
						return this.db.selectValue(s, this._bound);
					}
					async _spliceHasOnes(t) {
						0 !== this._hasOne.length &&
							0 !== t.length &&
							this._hasOne.forEach(async s => {
								const i = s.thisProperty.match(/^([\w_]+) AS ([\w_]+)$/i);
								let e;
								i ? ((e = i[2]), (s.thisColumn = i[1])) : (e = s.thisProperty.replace(/_id$/, ''));
								const [n, r] = s.thatTableAndColumn.split('.');
								let o = [];
								if (
									(t.forEach(t => {
										t[s.thisColumn] && o.push(t[s.thisColumn]);
									}),
									0 === o.length)
								)
									return;
								o = (0, h.default)(o);
								const l = u
										.init()
										.table(n)
										.where(r, 'IN', o),
									a = await l.fetchIndexed(r);
								t.forEach(t => {
									t[e] = a[t[s.thisColumn]] || null;
								});
							});
					}
					async _spliceBelongsTos(t) {
						if (0 === this._belongsTo.length || 0 === t.length) return;
						const s = (0, h.default)(t.map(t => t.id));
						this._belongsTo.forEach(async i => {
							const [e, n] = i.thatTableAndColumn.split('.'),
								h = await u
									.init(this.db)
									.table(e)
									.where(n, 'IN', s)
									.fetchIndexed(n);
							t.forEach(t => {
								t[i.thisPropery] = h[t.id] || null;
							});
						});
					}
					async _spliceHasManys(t) {
						if (0 === this._hasMany.length || 0 === t.length) return;
						const s = (0, h.default)(t.map(t => t.id));
						this._hasMany.forEach(async i => {
							const [e, n] = i.thatTableAndColumn.split('.'),
								h = u
									.init()
									.table(e)
									.where(n, 'IN', s),
								r = await h.fetchGrouped(n);
							t.forEach(t => {
								t[i.thisPropery] = r[t.id] || [];
							});
						});
					}
					async _spliceHabtms(t) {
						if (0 === this._habtm.length || 0 === t.length) return;
						(0, h.default)(t.map(t => t.id));
						this._habtm.forEach(async t => {});
					}
					columns(t) {
						return (this._columns = [...this._columns, ...t]), this;
					}
					column(t) {
						return this._columns.push(t), this;
					}
					option(t) {
						return this._options.push(t), this;
					}
					table(t) {
						return this._tables.push(t), this;
					}
					from(t) {
						return this._tables.push(t), this;
					}
					join(t) {
						return this._joins.push(`INNER JOIN ${t}`), this;
					}
					leftJoin(t) {
						return this._joins.push(`LEFT JOIN ${t}`), this;
					}
					fullJoin(t) {
						return this._joins.push(`FULL JOIN ${t}`), this;
					}
					rightJoin(t) {
						return this._joins.push(`RIGHT JOIN ${t}`), this;
					}
					crossJoin(t) {
						return this._joins.push(`CROSS JOIN ${t}`), this;
					}
					innerJoin(t) {
						return this._joins.push(`INNER JOIN ${t}`), this;
					}
					leftOuterJoin(t) {
						return this._joins.push(`LEFT OUTER JOIN ${t}`), this;
					}
					fullOuterJoin(t) {
						return this._joins.push(`FULL OUTER JOIN ${t}`), this;
					}
					rightOuterJoin(t) {
						return this._joins.push(`RIGHT OUTER JOIN ${t}`), this;
					}
					unjoin(t) {
						return Array.isArray(t)
							? (t.forEach(t => this.unjoin(t)), this)
							: ((t = (0, e.default)(t)),
							  (this._joins = this._joins.filter(s => {
									return !new RegExp(`^([A-Z]+) JOIN ${t}\\b`).test(s);
							  })),
							  this);
					}
					_conditions(t, s) {
						if ('string' == typeof s) return t.push(s), this;
						const i = s.length;
						let [e, h, l] = s;
						if (Array.isArray(e))
							return (
								e.forEach(s => {
									this._conditions(t, [s]);
								}),
								this
							);
						if ('object' == typeof e)
							return (
								(0, n.default)(e, (s, i) => {
									this._conditions(t, [i, s]);
								}),
								this
							);
						if ((/^\w+$/.test(e) && (e = o.default.escapeId(e)), 1 === i)) return t.push(e), this;
						if (
							2 === i &&
							Array.isArray(h) &&
							h.length > 0 &&
							(0, r.default)(e, '?') === h.length
						) {
							const s = h;
							let i = 0;
							const n = e.replace(/(%)?\?(%)?/, (t, e, n) => {
								return `'${e}${this.escapeQuoteless(s[i++])}${n}'`;
							});
							return t.push(n), this;
						}
						if (2 === i) {
							l = h;
							const t = e.split(' ');
							(e = t.shift()), (h = t.join(' '));
						}
						h || (h = '=');
						const u = (h = h.toLocaleUpperCase()).match(/^(LIKE|NOT LIKE)(?: (\?|\?%|%\?|%\?%))?$/);
						if ('NOT BETWEEN' === h || 'BETWEEN' === h) {
							const s = o.default.escape(l[0]),
								i = o.default.escape(l[1]);
							t.push(`${e} ${h} ${s} AND ${i}`);
						} else if (u) {
							const s = this.escapeQuoteless(l);
							let i;
							'?' !== u[2] && u[2]
								? '?%' === u[2]
									? (i = `'${s}%'`)
									: '%?' === u[2]
									? (i = `'%${s}'`)
									: '%?%' === u[2] && (i = `'%${s}%'`)
								: (i = `'${s}'`),
								t.push(`${e} ${u[1]} ${i}`);
						} else if (null === l) t.push('=' === h ? `${e} IS NULL` : `${e} IS NOT NULL`);
						else if (Array.isArray(l)) {
							const s = l.map(t => o.default.escape(t)).join(',');
							t.push('=' === h || 'IN' === h ? `${e} IN(${s})` : `${e} NOT IN(${s})`);
						} else
							'IN' === h || 'NOT IN' === h
								? ((l = o.default.escape(l)), t.push(`${e} ${h} (${l})`))
								: ((l = o.default.escape(l)), t.push(`${e} ${h} ${l}`));
						return this;
					}
					groupBy(t) {
						return this._groupBys.push(t), this;
					}
					where(...t) {
						return this._conditions(this._wheres, t), this;
					}
					whereBetween(t, s) {
						return (
							s[0] && s[1]
								? this.where(t, 'BETWEEN', s)
								: s[0]
								? this.where(t, '>=', s[0])
								: s.length > 1 && this.where(t, '<=', s[1]),
							this
						);
					}
					orWhere(t) {
						const s = [];
						t.forEach(t => {
							this._conditions(s, t);
						});
						const i = s.join(' OR ');
						return (
							'(' === i.slice(0, 1) && ')' === i.slice(-1) ? this.where(i) : this.where(`(${i})`),
							this
						);
					}
					having(...t) {
						return this._conditions(this._havings, t), this;
					}
					orHaving(t) {
						const s = [];
						t.forEach(t => {
							this._conditions(s, t);
						});
						const i = s.join(' OR ');
						return this.having(`(${i})`), this;
					}
					orderBy(t) {
						return this._orderBys.push(t.replace(/^-(.+)/, '$1 DESC')), this;
					}
					sortField(t, s = {}) {
						const i = '-' === t.slice(0, 1) ? 'DESC' : 'ASC';
						return (t = s[(t = t.replace(/^-/, ''))] || t), this.orderBy(`${t} ${i}`), this;
					}
					limit(t) {
						return (this._limit = Number(t) || 0), this;
					}
					offset(t) {
						return (this._offset = Number(t) || 0), this;
					}
					page(t) {
						return (this._page = Number(t) || 0), this;
					}
					escape(t) {
						return o.default.escape(t);
					}
					escapeQuoteless(t) {
						const s = o.default.escape(t);
						return "'" === s.slice(0, 1) && "'" === s.slice(-1) ? s.slice(1, -1) : t;
					}
				}
				exports.Select = u;
			},
			{ '../Parser/Parser.js': 'ZHKI', '../Db/Db.js': 'Ez06' },
		],
		'97BZ': [
			function(require, module, exports) {
				'use strict';
				Object.defineProperty(exports, '__esModule', { value: !0 }),
					Object.defineProperty(exports, 'Db', {
						enumerable: !0,
						get: function() {
							return e.Db;
						},
					}),
					Object.defineProperty(exports, 'Parser', {
						enumerable: !0,
						get: function() {
							return r.Parser;
						},
					}),
					Object.defineProperty(exports, 'Select', {
						enumerable: !0,
						get: function() {
							return t.Select;
						},
					});
				var e = require('./Db/Db.js'),
					r = require('./Parser/Parser.js'),
					t = require('./Select/Select.js');
			},
			{ './Db/Db.js': 'Ez06', './Parser/Parser.js': 'ZHKI', './Select/Select.js': 'PQRP' },
		],
	},
	{},
	['97BZ'],
	null
);
//# sourceMappingURL=/index.map
