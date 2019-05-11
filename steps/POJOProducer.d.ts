import * as cef from './step';
export declare const declaration: cef.Declaration;
declare class POJOProducer extends cef.Step {
    constructor(params: cef.ParamsMap);
    start(): void;
    end(): void;
}
export declare function create(params: cef.ParamsMap): POJOProducer;
export {};
