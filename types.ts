import * as path from 'path';
import * as url from 'url'
import * as fs from 'fs';

/**
 *  on memory step registry (Step Map)
 */
export type Declaration = {
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

export enum State { idle, started, ended, error }

//enum BaseType { int, ints, number, numbers, boolean, date, dates, regexp, string, strings }
//type BaseType = ('int'|'ints'|'number'|'numbers'|'regexp'|'boolean'|'date'|'dates'|'regexp'|'string'|'strings')

type ParamsMapDef = { [key: string]: { title: string, desc?: string; type: string, default: string, examples?: { value: string, title: string, desc?: string }[] } };
export type InPortsMap = { [key: string]: { title: string, desc?: string, properties?: PropertiesMap } }
export type OutPortsMap = { [key: string]: { title: string, desc?: string, properties?: PropertiesMap } }
type PropertiesMap = { [key: string]: { title: string, desc?: string, type: string } }
export type ParamsMap = { [key: string]: string }
export type TypedParamsMap = { [key: string]: { value: string, type: string, desc: string } }

export interface StepObj {
    id: string;
    gitid: string;
    params: ParamsMap;
}

export interface PipeObj {
    from: string;
    outport: string;
    to: string;
    inport: string;
}

export type Flowchart = {
    id: string;
    title: string;
    desc: string;
    args: TypedParamsMap;
    globs: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
}

export type TestData = { [key: string]: any[] }
export type Testcase = {
    stepid: string;
    title: string;
    args?: TypedParamsMap;
    globs?: TypedParamsMap;
    params: ParamsMap;
    injected: TestData;
    expected: TestData;
    onstart?: (teststep: any) => void
    onend?: (teststep: any) => void
}

type ParamType<T> = {
    typename: string;
    fromString: (str: string) => T;
    toString: (val: T) => string;
}
export const intType: ParamType<number> = {
    typename: 'int',
    fromString: (str: string): number => parseInt(str, 10),
    toString: (val: number): string => (val).toString(),
}
export const intArrayType: ParamType<number[]> = {
    typename: 'int[]',
    fromString: (str: string): number[] => str.split(/,/).map(v => parseInt(v, 10)),
    toString: (val: number[]): string => val.map(v => (v).toString()).join(','),
}
export const numberType: ParamType<number> = {
    typename: 'number',
    fromString: (str: string): number => parseFloat(str),
    toString: (val: number): string => (val).toString(),
}
export const numberArrayType: ParamType<number[]> = {
    typename: 'number[]',
    fromString: (str: string): number[] => str.split(/,/).map(v => parseFloat(v)),
    toString: (val: number[]): string => val.map(v => (v).toString()).join(','),
}
export const booleanType: ParamType<boolean> = {
    typename: 'boolean',
    fromString: (str: string): boolean => (str === 'true') ? true : false,
    toString: (val: boolean): string => (val).toString(),
}
export const booleanArrayType: ParamType<boolean[]> = {
    typename: 'boolean[]',
    fromString: (str: string): boolean[] => str.split(/,/).map(v => (v === 'true') ? true : false),
    toString: (val: boolean[]): string => val.map(v => v ? 'true' : 'false').join(','),
}
export const dateType: ParamType<Date> = {
    typename: 'date',
    fromString: (str: string): Date => new Date(str),
    toString: (val: Date): string => val.toISOString(),
}
export const dateArrayType: ParamType<Date[]> = {
    typename: 'date[]',
    fromString: (str: string): Date[] => str.split(/,/).map(v => dateType.fromString(v)),
    toString: (val: Date[]): string => val.map(v => dateType.toString(v)).join(','),
}

export const jsonType: ParamType<object> = {
    typename: 'json',
    fromString: (str: string): object => JSON.parse(str),
    toString: (val: object): string => JSON.stringify(val),
}
export const jsonArrayType: ParamType<object[]> = {
    typename: 'json[]',
    fromString: (str: string): object[] => str.split(/,/).map(v => jsonType.fromString(v)),
    toString: (val: Date[]): string => val.map(v => jsonType.toString(v)).join(','),
}

export const regexpType: ParamType<RegExp> = {
    typename: 'regexp',
    fromString: (str: string): RegExp => {
        const arr = str.match(/^( *\/)(.*)(\/([gimsuy]*) *)$/);
        const flags = arr[4] ? arr[4].replace(/g/,'') : 'i'
        try { return new RegExp(arr[2],flags) } catch(e) {
            throw new Error(`regexpType : parameter value not a correct RegExp ${str}`)
        }
    },
    toString: (val: RegExp): string => val.toString(),
}

export const stringType: ParamType<string> = {
    typename: 'string',
    fromString: (str: string): string => str,
    toString: (val: string): string => val,
}

export const stringArrayType: ParamType<string[]> = {
    typename: 'string[]',
    fromString: (str: string): string[] => str.split(/,/),
    toString: (val: string[]): string => val.join(','),
}
export class Url {
    private url : url.UrlWithStringQuery
    constructor(  urlstr: string) {
        this.url = url.parse(urlstr)
    }
    get protocol(){ return this.url.protocol }
    get slashes(){ return this.url.slashes }
    get auth(){ return this.url.auth }
    get host(){ return this.url.host }
    get port(){ return this.url.port }
    get hostname(){ return this.url.hostname }
    get hash(){ return this.url.hash }
    get search(){ return this.url.search }
    get query(){ return this.url.query }
    get pathname(){ return this.url.pathname }
    get path(){ return this.url.path }
    get href(){ return this.url.href }
    toString():string { return decodeURI(this.url.href) }
}

export const urlType: ParamType<Url> = {
    typename: 'url',
    fromString: (str: string): Url => new Url(str),
    toString: (val: Url): string => decodeURI(val.href),
}
export class Path extends String {
    get dirname() { return new Path(path.dirname(this.toString())) }
    get extname() { return path.extname(this.toString()) }
    get clean() { return path.normalize(this.toString()) }
    get sep() { return path.sep }
    get delimiter() { return path.delimiter }
    get basename() { return path.basename(this.toString()) }
    get exists() { return fs.existsSync(this.clean) }
    get isAbsolute() { return path.isAbsolute(this.toString()) }
    get isDirectory() { return fs.existsSync(this.clean) && fs.statSync(this.clean).isDirectory }
    get isFile() { return fs.existsSync(this.clean) && fs.statSync(this.clean).isFile }
}
export const pathType: ParamType<Path> = {
    typename: 'path',
    fromString: (str: string): Path => new Path(str),
    toString: (val: Path): string => path.toString(),
}

const PARAMTYPES = {
    'string': stringType,
    'string[]': stringArrayType,
    'int': intType,
    'int[]': intArrayType,
    'number': numberType,
    'number[]': numberArrayType,
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

export function equals(expected: any,outputed:any): boolean {
    let result:boolean = true
    let i = 0
    if (Array.isArray(expected) && Array.isArray(expected)) {
        if (expected.length !== outputed.length) return false
        result =  expected.every((v, i) => equals(v,outputed[i]))
        i++
    } else if (expected instanceof Url && outputed instanceof Url ) {
        result =  expected.toString() === outputed.toString()
        i++
    } else if (expected instanceof Path && outputed instanceof Path ) {
        result =  expected.toString() === outputed.toString()
        i++
    } else if (expected instanceof Date && outputed instanceof Date ) {
        result =  expected.toString()  === outputed.toString() 
        i++
    } else if (expected instanceof RegExp && outputed instanceof RegExp ) {
        result =  expected.toString()  === outputed.toString() 
        i++
    } else if (expected instanceof Object && outputed instanceof Object ) {
        i++
        if (Object.keys(expected).length !== Object.keys(outputed).length) return false
        result =  Object.keys(expected).every(property =>
            equals(expected[property],outputed[property])
        )
        i++
    } else {
        i++
        result = outputed === expected
        i++
    }
    return result
}

export function gettype(typename: string) {
    return PARAMTYPES[typename]
}
