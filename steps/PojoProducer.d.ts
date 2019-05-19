import * as pe from './pojoe';
export default class PojoProducer extends pe.Step {
    static readonly declaration: pe.Declaration;
    constructor(params: pe.ParamsMap);
    doit(): Promise<void>;
}
