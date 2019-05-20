import { Step, Declaration, ParamsMap, EOP } from './pojoe'

const declaration: Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoLogger',
    title: 'Logs pojos',
    desc: ' logs each inputed pojo through console',
    inputs: {
        'pojos': {
            title: 'pojo to log'
        }
    },
    outputs: {
    },
    parameters: {
        'expression': {
            title: 'expression to log',
            type: 'string',
            default: '${JSON.stringify(pojo)}',
        },
    }
}

export class PojoLogger extends Step {
    static declaration: Declaration = declaration
    constructor(params: ParamsMap) {
        super(declaration, params)
    }
    async doit() {
        let pojo = await this.input('pojos');
        while (pojo !== EOP) {
            console.log(this.params.expression)
            pojo = await this.input('pojos');
        }
    }
}

Step.register(declaration, PojoLogger);
