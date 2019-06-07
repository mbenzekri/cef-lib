import { Step, Declaration, ParamsMap, EOP } from './pojoe'

const declaration: Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoTimer',
    title: 'output a pojo at timed intervals',
    desc: 'this step emit pojos at a given time interval or just one after a certain time interval',
    inputs: { },
    outputs: {
        'pojos': {
            title: 'the pojos outputed'
        }
    },
    parameters: {
        'interval': {
            title: 'interval of time in ms',
            type: 'int',
            default: '10000',
        },
        'repeat': {
            title: 'if true repeat the pojo output at each interval time',
            type: 'boolean',
            default: 'true',
        },
        'pojo': {
            title: 'the outputed pojo',
            type: 'json',
            default: '{ "date": "${new Date()}" }',
        },
    }
}

export class PojoProducer extends Step {

    static readonly declaration = declaration
    off: boolean = false
    repeat: boolean = false
    interval: number = 10000

    constructor (params: ParamsMap) {
        super(declaration, params)
    }

    async start() {
        this.interval = this.params.interval
        this.repeat = this.params.repeat
    }

    stoptimer() {
        this.off = true
    }

    timeout(resolve: () => any, reject: () => any) {
        setTimeout(_ => {
            const pojo = this.params.pojo
            this.output('pojos',pojo)
            .then(_ => {
                if (this.off || !this.repeat) return resolve()
                this.timeout(resolve,reject)
            }).catch(reject)
        }, this.interval)
    }
    
    async process() {
        return new Promise<void>((resolve,reject) => {
            this.timeout(resolve,reject)
        })
    }
}

Step.register(PojoProducer);
