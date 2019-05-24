import { Step, Declaration, ParamsMap, EOP } from './pojoe'

const declaration: Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoProducer',
    title: 'output a pojo',
    desc: 'this step emit one pojo provided in a parameter object literal expression',
    inputs: { },
    outputs: {
        'pojos': {
            title: 'the pojos outputed'
        }
    },
    parameters: {
        'pojos': {
            title: 'a json object or array literal',
            type: 'json',
            default: '[ { "num" : 1 },{ "num" : 2 },{ "num" : 3 } ]',
        },
    }
}

export class PojoProducer extends Step {
    static readonly declaration = declaration
    constructor (params: ParamsMap) {
        super(declaration, params)
    }
    async process() {
        const pojos = this.params.pojos
        if(Array.isArray(pojos)) {
            for (let pojo of pojos) {
                await this.output("pojos", pojo)
            }
        } else {
            await this.output("pojos", pojos)
        }
    }
}

Step.register(PojoProducer);
