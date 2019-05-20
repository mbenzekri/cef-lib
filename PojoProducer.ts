import { Step, Declaration, ParamsMap, EOP } from './pojoe'

const declaration: Declaration = {
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
            default: '${JSON.stringify(params.pojo)}',
        },
    }
}

export class PojoProducer extends Step {
    static declaration: Declaration = declaration
    constructor (params: ParamsMap) {
        super(declaration, params)
    }
    async doit() {
        this.output("pojo", this.params.pojo)
    }
}

Step.register(declaration, PojoProducer);
