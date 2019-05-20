import * as path from 'path';
import * as url from 'url'

/**
 *  on memory step registry (Step Map)
 */
type Declaration = {
    gitid: string;
    title: string;
    desc: string;
    features?: string[];
    parameters: ParamsMapDef;
    inputs: InPortsMap;
    outputs: OutPortsMap;
    examples?: { title: string, desc: string }[];
}

enum PortType { input, output, }

enum State { idle, started, ended, error }

//enum BaseType { int, ints, number, numbers, boolean, date, dates, regexp, string, strings }
//type BaseType = ('int'|'ints'|'number'|'numbers'|'regexp'|'boolean'|'date'|'dates'|'regexp'|'string'|'strings')

type ParamsMapDef = { [key: string]: { title: string, desc?: string; type: string, default: string, examples?: { value: string, title: string, desc?: string }[] } };
type InPortsMap = { [key: string]: { title: string, desc?: string, properties?: PropertiesMap } }
type OutPortsMap = { [key: string]: { title: string, desc?: string, properties?: PropertiesMap } }
type PropertiesMap = { [key: string]: { title: string, desc?: string, type: string } }
type ParamsMap = { [key: string]: string }
type TypedParamsMap = { [key: string]: { value: string, type: string, desc: string } }

interface StepObj {
    id: string;
    gitid: string;
    params: ParamsMap;
}

interface PipeObj {
    from: string;
    outport: string;
    to: string;
    inport: string;
}

type Flowchart = {
    id: string;
    title: string;
    desc: string;
    args: TypedParamsMap;
    globs: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
}

type TestData = { [key: string]: any[] }
type Testcase = {
    stepid: string;
    title: string;
    params: ParamsMap;
    injected: TestData;
    expected: TestData;
    onstart?: (teststep: any) => void
    onend?: (teststep: any) => void
}


function error(obj: any, message: string): boolean {
    const e = new Error()
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':')
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-'
    const script = path.basename(__filename)
    throw new Error(`${script}@${line}: ${obj.toString()} => ${message}`)
}

function debug(obj: any, message: string): boolean {
    const e = new Error()
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':')
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-'
    const script = path.basename(__filename)
    console.log(`${script}@${line}: ${obj.toString()} => ${message}`)
    return true
}

function quote(str: string) {
    let quoted = str.replace(/\\{2}/g, '²')
    quoted = quoted.replace(/\\{1}([^fnrt"])/g, '\\\\$1')
    quoted = quoted.replace(/²/g, '\\\\')
    return quoted
}

type ParamType<T> = {
    typename: string;
    fromString: (str: string) => T;
    toString: (val: T) => string;
}
const intType: ParamType<number> = {
    typename: 'int',
    fromString: (str: string): number => parseInt(str, 10),
    toString: (val: number): string => (val).toString(),
}
const intArrayType: ParamType<number[]> = {
    typename: 'int[]',
    fromString: (str: string): number[] => str.split(/,/).map(v => parseInt(v, 10)),
    toString: (val: number[]): string => val.map(v => (v).toString()).join(','),
}
const numberType: ParamType<number> = {
    typename: 'number',
    fromString: (str: string): number => parseFloat(str),
    toString: (val: number): string => (val).toString(),
}
const numberArrayType: ParamType<number[]> = {
    typename: 'number[]',
    fromString: (str: string): number[] => str.split(/,/).map(v => parseFloat(v)),
    toString: (val: number[]): string => val.map(v => (v).toString()).join(','),
}
const booleanType: ParamType<boolean> = {
    typename: 'boolean',
    fromString: (str: string): boolean => (str === 'true') ? true : false,
    toString: (val: boolean): string => (val).toString(),
}
const booleanArrayType: ParamType<boolean[]> = {
    typename: 'boolean[]',
    fromString: (str: string): boolean[] => str.split(/,/).map(v => (v === 'true') ? true : false),
    toString: (val: boolean[]): string => val.map(v => v ? 'true' : 'false').join(','),
}
const dateType: ParamType<Date> = {
    typename: 'date',
    fromString: (str: string): Date => new Date(str),
    toString: (val: Date): string => val.toISOString(),
}
const dateArrayType: ParamType<Date[]> = {
    typename: 'date[]',
    fromString: (str: string): Date[] => str.split(/,/).map(v => dateType.fromString(v)),
    toString: (val: Date[]): string => val.map(v => dateType.toString(v)).join(','),
}

const jsonType: ParamType<object> = {
    typename: 'json',
    fromString: (str: string): object => JSON.parse(str),
    toString: (val: object): string => JSON.stringify(val),
}
const jsonArrayType: ParamType<object[]> = {
    typename: 'json[]',
    fromString: (str: string): object[] => str.split(/,/).map(v => jsonType.fromString(v)),
    toString: (val: Date[]): string => val.map(v => jsonType.toString(v)).join(','),
}

const regexpType: ParamType<RegExp> = {
    typename: 'regexp',
    fromString: (str: string): RegExp => JSON.parse(str),
    toString: (val: RegExp): string => JSON.stringify(val),
}

const stringType: ParamType<string> = {
    typename: 'string',
    fromString: (str: string): string => str,
    toString: (val: string): string => val,
}

const stringArrayType: ParamType<string[]> = {
    typename: 'string[]',
    fromString: (str: string): string[] => str.split(/,/),
    toString: (val: string[]): string => val.join(','),
}

const urlType: ParamType<url.UrlWithStringQuery> = {
    typename: 'url',
    fromString: (str: string): url.UrlWithStringQuery => url.parse(str),
    toString: (val: url.UrlWithStringQuery): string => decodeURI(val.href),
}
class Path extends String {
    get dirname() { return path.dirname(this.toString()) }
    get extname() { return path.extname(this.toString()) }
    get isAbsolute() { return path.isAbsolute(this.toString()) }
    get clean() { return path.normalize(this.toString()) }
    get sep() { return path.sep }
    get delimiter() { return path.delimiter }
    get basename() { return path.basename(this.toString()) }
}
const pathType: ParamType<url.UrlWithStringQuery> = {
    typename: 'path',
    fromString: (str: string): url.UrlWithStringQuery => url.parse(str),
    toString: (val: url.UrlWithStringQuery): string => decodeURI(val.href),
}

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
}

function bodyfunc(type: string, strvalue: string): string {
    const cleanstr = strvalue.replace(/\`/, '${"`"}')
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

function argfunc(type: string, strvalue: string): Function {
    return new Function('quote', 'type', bodyfunc(type, strvalue));
}

function globfunc(type: string, strvalue: string): Function {
    const body = bodyfunc(type, strvalue)
    return new Function('args', 'globs', 'quote', 'type', body);
}

function paramfunc(type: string, strvalue: string): Function {
    return new Function('args', 'globs', 'params', 'pojo', 'quote', 'type', bodyfunc(type, strvalue));
}

function gettype(typename: string) {
    return PARAMTYPES[typename]
}

export { Declaration, Flowchart, Testcase, TestData, ParamsMap, State, PipeObj, StepObj, OutPortsMap, InPortsMap, error, debug, argfunc, globfunc, paramfunc, quote, gettype }