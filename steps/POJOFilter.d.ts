import * as cef from './step';
export declare const declaration: cef.Declaration;
declare class POJOFilter extends cef.Step {
    constructor(params: cef.ParamsMap);
    start(): void;
    input_pojos(feature: any): void;
    end(): void;
}
export declare function create(params: cef.ParamsMap): POJOFilter;
export {};
