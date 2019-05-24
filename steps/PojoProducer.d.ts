import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoProducer extends Step {
    static readonly declaration: Declaration;
    constructor(params: ParamsMap);
    process(): Promise<void>;
}
