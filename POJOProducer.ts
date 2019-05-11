import * as cef from './step'

export const declaration: cef.Declaration = {
    gitid: 'mbenzekri/cef-lib/steps/POJOProducer',
    title: 'emit a POJO  (Plain Javascript Object) ',
    desc: 'emit one pojo for an object literal expression',
    inputs: {
    },
    outputs: {
        'pojo': {
            desc: 'the plain javascript objet'
        }
    },
    parameters: {
        'json': {
            desc: 'the POJO literal',
            type: 'json',
        },
    },
    fields: [
        {
            key: 'literal',
            type: 'text',
            defaultValue: '${ { aint : 1, abool: true, astring: "hello world" adate: new Date()} }',
            templateOptions: {
                label: 'object literal expression',
                required: true,
            }
        },
    ]
}

class POJOProducer extends cef.Step {
    constructor (params: cef.ParamsMap) {
        super(declaration, params)
    }

    start() {
        this.open('object')
        this.output("pojo", this.params.json) 
        this.close('files')
    }
    end() {
    }
}

export function  create(params: cef.ParamsMap) : POJOProducer  { return new POJOProducer(params) };
