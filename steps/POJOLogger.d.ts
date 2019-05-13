import * as cef from './step';
export declare const declaration: cef.Declaration;
declare class POJOLogger extends cef.Step {
    constructor(params: cef.ParamsMap);
    doit(): Promise<void>;
}
export declare function create(params: cef.ParamsMap): POJOLogger;
export {};
