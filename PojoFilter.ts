import { Step, Declaration, ParamsMap, EOP } from './pojoe'

const declaration: Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoFilter',
    title: 'filter pojos',
    desc: ' filter each inputed pojo with boolean expression',
    inputs: {
        'pojos': {
            title: 'pojo to filter'
        }
    },
    outputs: {
        'filtered': {
            title: 'filtered pojos'
        }
    },
    parameters: {
        'test': {
            title: 'filter expression',
            type: 'boolean',
            default: 'true'
        },
    }
}

export class PojoFilter extends Step {
    static readonly declaration = declaration
    constructor (params: ParamsMap) {
        super(declaration, params)
    }
    async input(inport:string, pojo: any) {
        if (inport ===  'pojos') {
            if (this.params.test) await this.output('filtered',pojo)
        }
    }
}

Step.register(PojoFilter);

