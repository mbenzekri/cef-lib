import * as cef from '.';
export declare const declaration: cef.Declaration;
declare class AStep extends cef.Step {
    constructor(params: cef.ParamsMap);
    doit(): Promise<void>;
}
export declare function create(params: cef.ParamsMap): AStep;
export {};
