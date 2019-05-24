import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoFilter extends Step {
    static readonly declaration: Declaration;
    constructor(params: ParamsMap);
    input(inport: string, pojo: any): Promise<void>;
}
