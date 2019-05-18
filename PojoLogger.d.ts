import * as pe from './pojoe';
export default class PojoLogger extends pe.Step {
    constructor(params: pe.ParamsMap);
    doit(): Promise<void>;
}
