/**
 *  on memory step registry (Step Map)
 */
declare type Declaration = {
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
declare enum State {
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
        examples?: {
            value: string;
            title: string;
            desc?: string;
        }[];
    };
};
declare type InPortsMap = {
    [key: string]: {
        title: string;
        desc?: string;
        properties?: PropertiesMap;
    };
};
declare type OutPortsMap = {
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
declare type ParamsMap = {
    [key: string]: string;
};
declare type TypedParamsMap = {
    [key: string]: {
        value: string;
        type: string;
        desc: string;
    };
};
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
declare type Flowchart = {
    id: string;
    title: string;
    desc: string;
    args: TypedParamsMap;
    globs: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
};
declare type TestData = {
    [key: string]: any[];
};
declare type Testcase = {
    stepid: string;
    title: string;
    params: ParamsMap;
    injected: TestData;
    expected: TestData;
    onstart?: (teststep: any) => void;
    onend?: (teststep: any) => void;
};
declare function error(obj: any, message: string): boolean;
declare function debug(obj: any, message: string): boolean;
declare function quote(str: string): string;
declare function argfunc(type: string, strvalue: string): Function;
declare function globfunc(type: string, strvalue: string): Function;
declare function paramfunc(type: string, strvalue: string): Function;
declare function gettype(typename: string): any;
export { Declaration, Flowchart, Testcase, TestData, ParamsMap, State, PipeObj, StepObj, OutPortsMap, InPortsMap, error, debug, argfunc, globfunc, paramfunc, quote, gettype };
