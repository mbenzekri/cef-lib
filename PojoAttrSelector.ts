import { Step, Declaration, ParamsMap, EOP } from './pojoe'

const declaration: Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoAttrSelector',
    title: 'alter property names in pojos',
    desc: 'rename, copy, remove keep attribute in pojos',
    inputs: {
        'pojos': {
            title: 'pojo to transform'
        }
    },
    outputs: {
        'pojos': {
            title: 'altered pojos'
        },
    },
    parameters: {
        'rename': {
            title: 'list of attributes to rename: old1,new1,old2,new2, ...',
            type: 'string[]',
            default: ''
        },
        'copy': {
            title: 'list of attributes to copy: from1,to1,from2,to2, ...',
            type: 'string[]',
            default: ''
        },
        'remove': {
            title: 'list of attributes to remove',
            type: 'string[]',
            default: ''
        },
        'keep': {
            title: 'list of attributes to keep',
            type: 'string[]',
            default: ''
        },
    }
}

export class PojoAttrSelector extends Step {
    static readonly declaration = declaration
    private renmap = {}
    private copylist:[string,string][] = []
    private remlist: string[] = []
    private keeplist: string[] = []
    constructor (params: ParamsMap) {
        super(declaration, params)
    }
    async start() {
        const rename: string[] = this.params.rename
        for(let i=0;i+1 < rename.length; i+=2) {
            this.renmap[rename[i]] =  rename[i+1]
        }
        const copy: string[] = this.params.copy
        for(let i=0;i+1 < copy.length; i+=2) {
            this.copylist.push([copy[i],copy[i+1]])
        }
        this.remlist = this.params.remove
        this.keeplist = this.params.keep
    }
    async input(inport:string, pojo: any) {
        if (inport ===  'pojos') {
            // rename
            const renpojo = {}
            Object.keys(pojo).forEach(property => renpojo[(property in this.renmap) ? this.renmap[property] : property ] = pojo[property])
            // copy
            const copypojo = renpojo
            this.copylist.forEach(fromto => {
                const [from, to] = fromto
                copypojo[to] = renpojo[from]
            })
            // remove
            const rempojo = {}
            Object.keys(copypojo).filter(property => !this.remlist.find(v => v === property) ).forEach(property => rempojo[property] = copypojo[property])

            // keep
            let keeppojo = rempojo
            if (this.keeplist.length) {
                keeppojo = {}
                Object.keys(rempojo).filter(property => this.keeplist.find(v => v === property) ).forEach(property => keeppojo[property] = rempojo[property])
            } 
            await this.output('pojos',keeppojo)
        }
    }
}

Step.register(PojoAttrSelector);

