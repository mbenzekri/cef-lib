import { Step, Declaration, ParamsMap } from './pojoe';
export declare class PojoProducer extends Step {
    static readonly declaration: Declaration;
    off: boolean;
    repeat: boolean;
    interval: number;
    constructor(params: ParamsMap);
    start(): Promise<void>;
    stoptimer(): void;
    timeout(resolve: () => any, reject: () => any): void;
    process(): Promise<void>;
}
