"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const url = require("url");
const fs = require("fs");
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
})(State = exports.State || (exports.State = {}));
exports.intType = {
    typename: 'int',
    fromString: (str) => parseInt(str, 10),
    toString: (val) => (val).toString(),
};
exports.intArrayType = {
    typename: 'int[]',
    fromString: (str) => str.split(/,/).map(v => parseInt(v, 10)),
    toString: (val) => val.map(v => (v).toString()).join(','),
};
exports.numberType = {
    typename: 'number',
    fromString: (str) => parseFloat(str),
    toString: (val) => (val).toString(),
};
exports.numberArrayType = {
    typename: 'number[]',
    fromString: (str) => str.split(/,/).map(v => parseFloat(v)),
    toString: (val) => val.map(v => (v).toString()).join(','),
};
exports.booleanType = {
    typename: 'boolean',
    fromString: (str) => (str === 'true') ? true : false,
    toString: (val) => (val).toString(),
};
exports.booleanArrayType = {
    typename: 'boolean[]',
    fromString: (str) => str.split(/,/).map(v => (v === 'true') ? true : false),
    toString: (val) => val.map(v => v ? 'true' : 'false').join(','),
};
exports.dateType = {
    typename: 'date',
    fromString: (str) => new Date(str),
    toString: (val) => val.toISOString(),
};
exports.dateArrayType = {
    typename: 'date[]',
    fromString: (str) => str.split(/,/).map(v => exports.dateType.fromString(v)),
    toString: (val) => val.map(v => exports.dateType.toString(v)).join(','),
};
exports.jsonType = {
    typename: 'json',
    fromString: (str) => JSON.parse(str),
    toString: (val) => JSON.stringify(val),
};
exports.jsonArrayType = {
    typename: 'json[]',
    fromString: (str) => str.split(/,/).map(v => exports.jsonType.fromString(v)),
    toString: (val) => val.map(v => exports.jsonType.toString(v)).join(','),
};
exports.regexpType = {
    typename: 'regexp',
    fromString: (str) => {
        const arr = str.match(/^ *(\/)(.*)(\/)([gimsuy]*)? *$/);
        if (arr[1] !== '/' || arr[3] !== '/') {
            throw new Error(`regexpType : regexp must start with '/' and end with '/[imsuy]' for ${str}`);
        }
        const flags = arr[5] ? arr[5].replace(/[imsuy]/g, '') : 'i';
        try {
            return new RegExp(arr[2], flags);
        }
        catch (e) {
            throw new Error(`regexpType : parameter value not a correct RegExp ${str}`);
        }
    },
    toString: (val) => val.toString(),
};
exports.stringType = {
    typename: 'string',
    fromString: (str) => str,
    toString: (val) => val,
};
exports.stringArrayType = {
    typename: 'string[]',
    fromString: (str) => str.split(/,/),
    toString: (val) => val.join(','),
};
class Url {
    constructor(urlstr) {
        this.url = url.parse(urlstr);
    }
    get protocol() { return this.url.protocol; }
    get slashes() { return this.url.slashes; }
    get auth() { return this.url.auth; }
    get host() { return this.url.host; }
    get port() { return this.url.port; }
    get hostname() { return this.url.hostname; }
    get hash() { return this.url.hash; }
    get search() { return this.url.search; }
    get query() { return this.url.query; }
    get pathname() { return this.url.pathname; }
    get path() { return this.url.path; }
    get href() { return this.url.href; }
    toString() { return decodeURI(this.url.href); }
}
exports.Url = Url;
exports.urlType = {
    typename: 'url',
    fromString: (str) => new Url(str),
    toString: (val) => decodeURI(val.href),
};
class Path extends String {
    get dirname() { return new Path(path.dirname(this.toString())); }
    get extname() { return path.extname(this.toString()); }
    get pathnormalize() { return path.normalize(this.toString()); }
    get sep() { return path.sep; }
    get delimiter() { return path.delimiter; }
    get basename() { return path.basename(this.toString()); }
    get exists() { return fs.existsSync(this.pathnormalize); }
    get isAbsolute() { return path.isAbsolute(this.toString()); }
    get isDirectory() { return fs.existsSync(this.pathnormalize) && fs.statSync(this.pathnormalize).isDirectory; }
    get isFile() { return fs.existsSync(this.pathnormalize) && fs.statSync(this.pathnormalize).isFile; }
}
exports.Path = Path;
exports.pathType = {
    typename: 'path',
    fromString: (str) => new Path(str),
    toString: (val) => path.toString(),
};
const PARAMTYPES = {
    'string': exports.stringType,
    'string[]': exports.stringArrayType,
    'int': exports.intType,
    'int[]': exports.intArrayType,
    'number': exports.numberType,
    'number[]': exports.numberArrayType,
    'boolean': exports.booleanType,
    'boolean[]': exports.booleanArrayType,
    'date': exports.dateType,
    'date[]': exports.dateArrayType,
    'json': exports.jsonType,
    'json[]': exports.jsonArrayType,
    'regexp': exports.regexpType,
    'url': exports.urlType,
    'path': exports.pathType,
};
function equals(expected, outputed) {
    let result = true;
    if (Array.isArray(expected) && Array.isArray(expected)) {
        if (expected.length !== outputed.length)
            return false;
        result = expected.every((v, i) => equals(v, outputed[i]));
    }
    else if (expected instanceof Url && outputed instanceof Url) {
        result = expected.toString() === outputed.toString();
    }
    else if (expected instanceof Path && outputed instanceof Path) {
        result = expected.toString() === outputed.toString();
    }
    else if (expected instanceof Date && outputed instanceof Date) {
        result = expected.toString() === outputed.toString();
    }
    else if (expected instanceof RegExp && outputed instanceof RegExp) {
        result = expected.toString() === outputed.toString();
    }
    else if (expected instanceof Object && outputed instanceof Object) {
        if (Object.keys(expected).length !== Object.keys(outputed).length)
            return false;
        result = Object.keys(expected).every(property => equals(expected[property], outputed[property]));
    }
    else {
        result = outputed === expected;
    }
    return result;
}
exports.equals = equals;
function gettype(typename) {
    return PARAMTYPES[typename];
}
exports.gettype = gettype;
//# sourceMappingURL=types.js.map