import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoExec extends Step {
    static readonly declaration: Declaration;
    constructor(params: ParamsMap);
    execcmd(): Promise<void>;
    input(inport: string, pojo: any): Promise<void>;
    process(): Promise<void>;
}
