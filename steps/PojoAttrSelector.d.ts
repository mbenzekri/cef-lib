import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoAttrSelector extends Step {
    static readonly declaration: Declaration;
    private renmap;
    private copylist;
    private remlist;
    private keeplist;
    constructor(params: ParamsMap);
    start(): Promise<void>;
    input(inport: string, pojo: any): Promise<void>;
}
