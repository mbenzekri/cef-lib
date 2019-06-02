import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoLookup extends Step {
    static readonly declaration: Declaration;
    private mode;
    private multiple;
    private lookup;
    constructor(params: ParamsMap);
    start(): Promise<void>;
    input(inport: string, pojo: any): Promise<Map<string, any[]> | void[]>;
}
