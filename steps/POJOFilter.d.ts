import * as cef from './step';
export declare const declaration: cef.Declaration;
declare class POJOFilter extends cef.Step {
    constructor(params: cef.ParamsMap);
    doit(): Promise<void>;
}
export declare function create(params: cef.ParamsMap): POJOFilter;
export {};
