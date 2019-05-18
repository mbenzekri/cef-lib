import * as pe from './pojoe'

const declaration: pe.Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoProducer',
    title: 'output a pojo',
    desc: 'this step emit one pojo provided in a parameter object literal expression',
    inputs: { },
    outputs: {
        'pojo': {
            title: 'the pojo'
        }
    },
    parameters: {
        'pojo': {
            title: 'the pojo literal',
            type: 'json',
            default: 'json',
        },
    }
}

export default class PojoProducer extends pe.Step {
    static readonly declaration = declaration;
    constructor (params: pe.ParamsMap) {
        super(declaration, params)
    }
    async doit() {
        this.output("pojo", this.params.json)
    }
}

pe.Step.Register(declaration, (params: pe.ParamsMap) =>  new PojoProducer(params));
