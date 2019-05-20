import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoProducer extends Step {
    static declaration: Declaration;
    constructor(params: ParamsMap);
    doit(): Promise<void>;
}
