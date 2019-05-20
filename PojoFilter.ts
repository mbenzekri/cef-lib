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
    static declaration: Declaration = declaration
    constructor (params: ParamsMap) {
        super(declaration, params)
    }

    async doit() {
        let pojo = await this.input('pojos'); 
        while (pojo !== EOP) {
            if (this.params.test) await this.output('filtered',pojo)
            pojo = await this.input('pojos');
        } 
    }
}

Step.register(PojoFilter);

