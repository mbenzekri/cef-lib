import { Step, Declaration, ParamsMap } from './pojoe'

const declaration: Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoLookup',
    title: 'transform pojos through a lookup table',
    desc: 'transform pojos through a lookup table',
    inputs: {
        'lookup': {
            title: 'pojo to form the lookup table'
        },
        'pojos': {
            title: 'pojo to test match'
        }
    },
    outputs: {
        'matched': {
            title: 'pojos that match the looup table'
        },
        'unmatched': {
            title: 'pojos that not match the looup table'
        },
    },
    parameters: {
        'lookupkey': {
            title: 'key of the lookup table ',
            type: 'string',
            default: ''
        },
        'pojokey': {
            title: 'key to match with the lookup table key',
            type: 'string',
            default: ''
        },
        'multiple': {
            title: 'on multiple match what to do',
            desc: '"multiple" options indicates to PojoLookup how to handle multiple math found on lookup' +
                '\n   - first : return one pojo on first match' +
                '\n   - last : return one pojo on last match' +
                '\n   - all : return all matched pojo' +
                '\n   - unmatch : consider pojo is unmatched when multiple match (more than one)',
            type: 'string',
            default: 'first',
            enum: { first: 'first', last: 'last', all: 'all', unmatch: 'unmatch' }
        },
        'mode': {
            title: 'add to pojo or replace pojo',
            desc: '"mode" options indicates to PojoLookup how is constructed the matched pojo' +
                '\n   - add : add all properties found in "pojo" provided parameter to input pojo' +
                '\n   - replace : only pojo provided by "pojo" parameter is outputed through "matched" port',
            type: 'string',
            default: 'add',
            enum: { add: 'add', replace: 'replace' }
        },
        'changes': {
            title: 'changes to add to the pojo or to replace the pojo (see "add" parameter)',
            type: 'json',
            default: ''
        },
    }
}

class PojoLookup extends Step {
    static readonly declaration = declaration
    private mode = 'add'
    private multiple = 'first'
    private lookup: Map<string, any[]> = new Map()
    constructor(params: ParamsMap) {
        super(declaration, params)
    }
    async start() {
        this.mode = this.params.mode
        this.multiple = this.params.multiple
    }
    async input(inport: string, pojo: any) {
        const promises: Promise<void>[] = []
        if (inport === 'lookup') {
            const key: string = this.params.lookupkey
            const exists = this.lookup.has(key)
            // construct lookup table considering "multiple" option
            if (!exists) return this.lookup.set(key, [pojo])
            if (this.multiple === 'first') return
            if (this.multiple === 'last') return this.lookup.set(key, [pojo])
            this.lookup.get(key).push(pojo)
        }
        if (inport === 'pojos') {
            const key: string = this.params.pojokey
            // not matched if multiple == 'unmatch' and more than one match 
            if (!this.lookup.has(key) || (this.multiple === 'unmatch' && this.lookup.get(key).length > 1)) {
                promises.push(this.output('unmatched', pojo))
            } else {
                const matched = this.lookup.get(key)
                matched.forEach(match => {
                    this.locals.match = match
                    const changes: object = this.params.changes
                    if (this.mode === 'add') {
                        const newpojo = JSON.parse(JSON.stringify(pojo))
                        Object.keys(changes).forEach(key => newpojo[key] = changes[key])
                        promises.push(this.output('matched', newpojo))
                    } else {
                        promises.push(this.output('matched', changes))
                    }
                })
            }
        }
        return Promise.all(promises)
    }
}

Step.register(PojoLookup);

