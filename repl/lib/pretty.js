const { gray, blue, yellow, red, cyan, green } = require('chalk');
const moment = require('moment');

const format = {
	symbol: str => str,
	quote: str => format.symbol('"') + str + format.symbol('"'),
	null: () => yellow('NULL'),
	date: str =>
		gray('[Date ') +
		blue(moment(str).format('YYYY-MM-DDTHH:mm:ss')) +
		gray(']'),
	string: str => format.quote(green(str)),
	number: str => red(str),
	prop: str => cyan(str),
	boolean: str => yellow(str ? 'true' : 'false'),
	undefined: () => yellow('undefined'),
	circular: () => cyan('(Circular Reference)'),
};

function indent(level) {
	return new Array(level).join('    ');
}

function pretty(value) {
	const seen = [];
	return walk(value);

	function walk(value, level = 0) {
		if (Array.isArray(value)) {
			if (seen.includes(value)) {
				return indent(level) + format.circular();
			}
			seen.push(value);
			return [
				indent(level),
				format.symbol('['),
				'\n',
				indent(level + 1),
				value.map(v => walk(v, level + 1)).join(',\n'),
				'\n',
				indent(level),
				format.symbol(']'),
			].join('');
		}
		if (value === null) {
			return format.null();
		}
		if (value === undefined) {
			return format.undefined();
		}
		if (value instanceof Date) {
			return format.date(value);
		}
		if (typeof value === 'object') {
			if (seen.includes(value)) {
				return format.circular();
			}
			seen.push(value);
			return [
				indent(level + 1),
				format.symbol('{'),
				'\n',
				Object.keys(value)
					.map(prop => {
						const val = value[prop];
						return [
							indent(level + 2),
							format.prop(prop),
							format.symbol(':'),
							' ',
							walk(val, level + 1),
							format.symbol(','),
							'\n',
						].join('');
					})
					.join(''),
				indent(level + 1),
				format.symbol('}'),
			].join('');
		}
		if (typeof value === 'string') {
			return format.string(value);
		}
		if (typeof value === 'number') {
			return format.number(value);
		}
		if (typeof value === 'boolean') {
			return format.boolean(value);
		}
	}
}

module.exports = pretty;
