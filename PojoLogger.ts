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
    static readonly declaration = declaration
    constructor(params: ParamsMap) {
        super(declaration, params)
    }
    async input(inport:string, pojo: any) {
        console.log(this.params.expression)
    }
}

Step.register(PojoLogger);
