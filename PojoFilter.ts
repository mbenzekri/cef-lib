import * as pe from './pojoe'

const declaration: pe.Declaration = {
    gitid: 'mbenzekri/cef-js/steps/POJOFilter',
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

export default class PojoFilter extends pe.Step {
    constructor (params: pe.ParamsMap) {
        super(declaration, params)
    }

    async doit() {
        let pojo = await this.input('pojos'); 
        while (pojo !== pe.EOP) {
            if (this.params.test) await this.output('filtered',pojo)
            pojo = await this.input('pojos');
        } 
    }
}

pe.Step.Register(declaration, (params: pe.ParamsMap) =>  new PojoFilter(params));

