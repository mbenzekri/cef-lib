/**
 *  on memory step registry (Step Map)
 */
export declare type Declaration = {
    gitid: string;
    title: string;
    desc: string;
    features?: string[];
    parameters: ParamsMapDef;
    inputs: InPortsMap;
    outputs: OutPortsMap;
    examples?: {
        title: string;
        desc: string;
    }[];
};
export declare enum State {
    idle = 0,
    started = 1,
    ended = 2,
    error = 3
}
declare type ParamsMapDef = {
    [key: string]: {
        title: string;
        desc?: string;
        type: string;
        default: string;
        enum?: {
            [key: string]: any;
        };
        examples?: {
            value: string;
            title: string;
            desc?: string;
        }[];
    };
};
export declare type InPortsMap = {
    [key: string]: {
        title: string;
        desc?: string;
        properties?: PropertiesMap;
    };
};
export declare type OutPortsMap = {
    [key: string]: {
        title: string;
        desc?: string;
        properties?: PropertiesMap;
    };
};
declare type PropertiesMap = {
    [key: string]: {
        title: string;
        desc?: string;
        type: string;
    };
};
export declare type ParamsMap = {
    [key: string]: string;
};
export declare type TypedParamsMap = {
    [key: string]: {
        value: string;
        type: string;
        desc: string;
    };
};
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
export declare type Flowchart = {
    id: string;
    title: string;
    desc: string;
    args: TypedParamsMap;
    globs: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
};
export declare type TestData = {
    [key: string]: any[];
};
export declare type Testcase = {
    stepid: string;
    title: string;
    args?: TypedParamsMap;
    globs?: TypedParamsMap;
    params: ParamsMap;
    injected: TestData;
    expected: TestData;
    onstart?: (teststep: any) => void;
    onend?: (teststep: any) => void;
};
declare type ParamType<T> = {
    typename: string;
    fromString: (str: string) => T;
    toString: (val: T) => string;
};
export declare const intType: ParamType<number>;
export declare const intArrayType: ParamType<number[]>;
export declare const numberType: ParamType<number>;
export declare const numberArrayType: ParamType<number[]>;
export declare const booleanType: ParamType<boolean>;
export declare const booleanArrayType: ParamType<boolean[]>;
export declare const dateType: ParamType<Date>;
export declare const dateArrayType: ParamType<Date[]>;
export declare const jsonType: ParamType<object>;
export declare const jsonArrayType: ParamType<object[]>;
export declare const regexpType: ParamType<RegExp>;
export declare const stringType: ParamType<string>;
export declare const stringArrayType: ParamType<string[]>;
export declare class Url {
    private url;
    constructor(urlstr: string);
    readonly protocol: string;
    readonly slashes: boolean;
    readonly auth: string;
    readonly host: string;
    readonly port: string;
    readonly hostname: string;
    readonly hash: string;
    readonly search: string;
    readonly query: string;
    readonly pathname: string;
    readonly path: string;
    readonly href: string;
    toString(): string;
}
export declare const urlType: ParamType<Url>;
export declare class Path extends String {
    readonly dirname: Path;
    readonly extname: string;
    readonly clean: string;
    readonly sep: "\\" | "/";
    readonly delimiter: ";" | ":";
    readonly basename: string;
    readonly exists: boolean;
    readonly isAbsolute: boolean;
    readonly isDirectory: () => boolean;
    readonly isFile: () => boolean;
}
export declare const pathType: ParamType<Path>;
export declare function equals(expected: any, outputed: any): boolean;
export declare function gettype(typename: string): any;
export {};
