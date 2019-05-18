import * as pe from './pojoe';
export default class PojoFilter extends pe.Step {
    constructor(params: pe.ParamsMap);
    doit(): Promise<void>;
}
