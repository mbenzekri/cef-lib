import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoLogger extends Step {
    static readonly declaration: Declaration;
    constructor(params: ParamsMap);
    doit(): Promise<void>;
}
