import * as cef from '.'

export const declaration: cef.Declaration = {
    gitid: 'mbenzekri/cef-js/steps/POJOFilter',
    title: 'Lorem ipsum',
    desc: ' Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    inputs: {
        'inpojos': {
            title: 'it is a pojo input port for doing many things ...',
            properties: {
                '<propnameA>': { type: 'string', title: 'this is an expected property' },
            }
        }
    },
    outputs: {
        'outpojos': {
            title: 'outputed pojos produced by the step processing...',
            properties: {
                '<propnameB>': { type: 'string', title: 'this is a provided property' },
                '<propnameD>': { type: 'int', title: 'this is an other provided property' },
            }
        },
    },
    parameters: {
        'parameter1': {
            title: 'first parameter',
            type: 'string',
            default: 'hello world !',
        },
        'parameter2': {
            title: 'second parameter',
            type: 'number',
            default: '101',
        },
        'parameter3': {
            title: 'third parameter',
            desc: 'description is not mandatory but may be useful..',
            type: 'boolean',
            default: 'true',
        },
    },
    examples : [
        {title:'first example', desc: `
    hello world !!!
    a long code to example ....         
        `},
        {title:'second example', desc: `
    hello world !!!
    a long code to example ....         
        `},
    ]
}

class AStep extends cef.Step {
    constructor(params: cef.ParamsMap) {
        super(declaration, params)
    }

    async doit() {
        throw ('NOT IMPLEMENTED must be done ...')
    }
}

export function create(params: cef.ParamsMap): AStep { return new AStep(params) };
