import * as cef from './step'

export const declaration: cef.Declaration = {
    gitid: 'mbenzekri/cef-fs/steps/POJOFilter',
    title: 'filter pojos',
    desc: ' filter each inputed pojo with boolean expression',
    inputs: {
        'pojos': {
            desc: 'pojo to filter'
        }
    },
    outputs: {
        'filtered': {
            desc: 'filtered pojos'
        }
    },
    parameters: {
        'test': {
            desc: 'filter expression',
            type: 'boolean',
        },
    },
    fields: [
        {
            key: 'test',
            type: 'boolean',
            defaultValue: '${ true }',
            templateOptions: {
                label: 'filter expression',
                required: true,
            }
        },
    ]
}

class POJOFilter extends cef.Step {
    constructor (params: cef.ParamsMap) {
        super(declaration, params)
    }

    start() {
    }
    input_pojos(feature: any) {
        if (this.params.test) this.output('filtered',feature)
    }
    end() {
    }
}

export function  create(params: cef.ParamsMap) : POJOFilter  { return new POJOFilter(params) };
