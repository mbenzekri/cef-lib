"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const url = require("url");
var PortType;
(function (PortType) {
    PortType[PortType["input"] = 0] = "input";
    PortType[PortType["output"] = 1] = "output";
})(PortType || (PortType = {}));
var State;
(function (State) {
    State[State["idle"] = 0] = "idle";
    State[State["started"] = 1] = "started";
    State[State["ended"] = 2] = "ended";
    State[State["error"] = 3] = "error";
})(State || (State = {}));
exports.State = State;
function error(obj, message) {
    const e = new Error();
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':');
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-';
    const script = path.basename(__filename);
    throw new Error(`${script}@${line}: ${obj.toString()} => ${message}`);
}
exports.error = error;
function debug(obj, message) {
    const e = new Error();
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':');
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-';
    const script = path.basename(__filename);
    console.log(`${script}@${line}: ${obj.toString()} => ${message}`);
    return true;
}
exports.debug = debug;
function quote(str) {
    let quoted = str.replace(/\\{2}/g, '²');
    quoted = quoted.replace(/\\{1}([^fnrt"])/g, '\\\\$1');
    quoted = quoted.replace(/²/g, '\\\\');
    return quoted;
}
exports.quote = quote;
const intType = {
    typename: 'int',
    fromString: (str) => parseInt(str, 10),
    toString: (val) => (val).toString(),
};
const intArrayType = {
    typename: 'int[]',
    fromString: (str) => str.split(/,/).map(v => parseInt(v, 10)),
    toString: (val) => val.map(v => (v).toString()).join(','),
};
const numberType = {
    typename: 'number',
    fromString: (str) => parseFloat(str),
    toString: (val) => (val).toString(),
};
const numberArrayType = {
    typename: 'number[]',
    fromString: (str) => str.split(/,/).map(v => parseFloat(v)),
    toString: (val) => val.map(v => (v).toString()).join(','),
};
const booleanType = {
    typename: 'boolean',
    fromString: (str) => (str === 'true') ? true : false,
    toString: (val) => (val).toString(),
};
const booleanArrayType = {
    typename: 'boolean[]',
    fromString: (str) => str.split(/,/).map(v => (v === 'true') ? true : false),
    toString: (val) => val.map(v => v ? 'true' : 'false').join(','),
};
const dateType = {
    typename: 'date',
    fromString: (str) => new Date(str),
    toString: (val) => val.toISOString(),
};
const dateArrayType = {
    typename: 'date[]',
    fromString: (str) => str.split(/,/).map(v => dateType.fromString(v)),
    toString: (val) => val.map(v => dateType.toString(v)).join(','),
};
const jsonType = {
    typename: 'json',
    fromString: (str) => JSON.parse(str),
    toString: (val) => JSON.stringify(val),
};
const jsonArrayType = {
    typename: 'json[]',
    fromString: (str) => str.split(/,/).map(v => jsonType.fromString(v)),
    toString: (val) => val.map(v => jsonType.toString(v)).join(','),
};
const regexpType = {
    typename: 'regexp',
    fromString: (str) => JSON.parse(str),
    toString: (val) => JSON.stringify(val),
};
const stringType = {
    typename: 'string',
    fromString: (str) => str,
    toString: (val) => val,
};
const stringArrayType = {
    typename: 'string[]',
    fromString: (str) => str.split(/,/),
    toString: (val) => val.join(','),
};
const urlType = {
    typename: 'url',
    fromString: (str) => url.parse(str),
    toString: (val) => decodeURI(val.href),
};
class Path extends String {
    get dirname() { return path.dirname(this.toString()); }
    get extname() { return path.extname(this.toString()); }
    get isAbsolute() { return path.isAbsolute(this.toString()); }
    get clean() { return path.normalize(this.toString()); }
    get sep() { return path.sep; }
    get delimiter() { return path.delimiter; }
    get basename() { return path.basename(this.toString()); }
}
const pathType = {
    typename: 'path',
    fromString: (str) => url.parse(str),
    toString: (val) => decodeURI(val.href),
};
const PARAMTYPES = {
    'string': stringType,
    'string[]': stringArrayType,
    'int': intType,
    'int[]': intArrayType,
    'number': intType,
    'number[]': intArrayType,
    'boolean': booleanType,
    'boolean[]': booleanArrayType,
    'date': dateType,
    'date[]': dateArrayType,
    'json': jsonType,
    'json[]': jsonArrayType,
    'regexp': regexpType,
    'url': urlType,
    'path': pathType,
};
function bodyfunc(type, strvalue) {
    const cleanstr = strvalue.replace(/\`/, '${"`"}');
    let body = `
        try {
            const raw = String.raw\`${cleanstr}\`
            return type.fromString(raw)
        } catch(e) { 
            throw(new Error('parsing type "'+ type.name +'" fails for parameter value '+ raw)) 
        }
    `;
    return body;
}
function argfunc(type, strvalue) {
    return new Function('quote', 'type', bodyfunc(type, strvalue));
}
exports.argfunc = argfunc;
function globfunc(type, strvalue) {
    const body = bodyfunc(type, strvalue);
    return new Function('args', 'globs', 'quote', 'type', body);
}
exports.globfunc = globfunc;
function paramfunc(type, strvalue) {
    return new Function('args', 'globs', 'params', 'pojo', 'quote', 'type', bodyfunc(type, strvalue));
}
exports.paramfunc = paramfunc;
function gettype(typename) {
    return PARAMTYPES[typename];
}
exports.gettype = gettype;
//# sourceMappingURL=types.js.map