import * as pe from './pojoe'

const declaration: pe.Declaration = {
    gitid: 'mbenzekri/cef-js/steps/POJOLogger',
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

export default class PojoLogger extends pe.Step {
    constructor (params: pe.ParamsMap) {
        super(declaration, params)
    }
    async doit() {
        let pojo = await this.input('pojos');
        while (pojo !== pe.EOP) {
            console.log(this.params.expression)
            pojo = await this.input('pojos');
        } 
    }
}

pe.Step.Register(declaration, (params: pe.ParamsMap): pe.Step =>  new PojoLogger(params));
