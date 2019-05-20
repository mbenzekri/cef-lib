import * as uuid from 'uuid/v4'
import * as os from 'os';
import * as fs from 'fs';
import { Declaration, Flowchart, Testcase, TestData, ParamsMap,State, PipeObj, StepObj, OutPortsMap, InPortsMap, error, debug, argfunc, globfunc, paramfunc,  quote, gettype } from './types'

let DEBUG = false;

const SOP = 'SOP';  // Start Of Pojos
const EOP = 'EOP';  // End Of Pojos

type TypeStep = { new(params: ParamsMap): Step; declaration: Declaration; }
const REGISTRY: { [key: string]: TypeStep } = {}


/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globs globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
class Batch {

    private _flowchart: Flowchart
    private _steps = new Map<string, Step>()
    private _globs: any = {}
    private _args: any = {}

    constructor(flowchart: Flowchart) {
        this._flowchart = flowchart
        DEBUG = process.argv.some((arg) => /^--DEBUG$/i.test(arg))
        // !!! eviter de faire des action supplementaire ici sinon valider avec Testbed 
    }
    get flowchart() { return this._flowchart }
    get steps() { return this._steps }
    get globs() { return this._globs }
    get args() { return this._args }
    toString() { return `${this._flowchart.id}[Batch: ${this._flowchart.title}]`; }
    error(message: string) { error(this, message) }

    private initargs() {
        const argv: any = {};
        // default value in batch declaration
        Object.keys(this._flowchart.args).forEach(name => {
            const type = this._flowchart.args[name].type
            const value = this._flowchart.args[name].value
            argv[name] = argfunc(type, value)
        })
        // then env variables
        Object.keys(this._flowchart.args).forEach(name => {
            if (name in process.env) {
                const type = this._flowchart.args[name].type
                const value = process.env[name]
                argv[name] = argfunc(type, value);
            }
        })
        // then process parameters
        process.argv.forEach((arg, i) => {
            if (i < 2) return; // skip 'node.exe' and 'script.js'
            if (/^--.*=.*$/.test(arg)) {
                const [name, value] = arg.replace(/^--?/, '').split(/=/)
                if (this._flowchart.args[name]) {
                    const type = this._flowchart.args[name].type
                    if (name in this._flowchart.args) {
                        this._args[name] = argfunc(type, value);
                    }
                }
            }
        })
        this._args = new Proxy(argv, {
            get: (target, property) => {
                try {
                    let type = gettype(this._flowchart.args[property.toString()].type)
                    return target[property](quote,type);
                } catch (e) {
                    error(this, `error "${e.message}" when evaluating arg parameter "${String(property)}"`);
                }
            },
        });

    }

    private initglobs() {
        // prepare lazy evaluation of parameters for each pojo
        const globs: any = {};
        Object.keys(this._flowchart.globs).forEach(name => {
            const type = this._flowchart.globs[name].type
            const value = this._flowchart.globs[name].value
            globs[name] = globfunc(type, value);
        });

        this._globs = new Proxy(globs, {
            get: (target, property) => {
                try {
                    let type = gettype(this._flowchart.globs[property.toString()].type)
                    return target[property](this._args, this.globs,quote,type);
                } catch (e) {
                    error(this, `error "${e.message}" when evaluating global parameter "${String(property)}"`);
                }
            },
        });
    }

    /**
     * method to add a step to this batch
     * @param {Step} step: a step to add to this batch
     */
    private initsteps() {
        // construct all steps 
        this._flowchart.steps.forEach(stepobj => {
            let aclass = REGISTRY[stepobj.gitid]
            if (!module) {
                // gitid is formed : <gitaccount>/<gitrepo>/steps/<step class name>
                const items = stepobj.gitid.split('/')
                items.shift()
                const globpath = items.join('/')
                try {
                    // for production mode modules install in node_modules
                    module = require(globpath)
                } catch (e) {
                    error(this, `unable to locate step "${stepobj.gitid}"  module searched with ${globpath}`)
                }
            }
            aclass = REGISTRY[stepobj.gitid]
            const step: Step = new aclass(stepobj.params)
            step.initparams(this.args, this.globs)
            this._steps.set(stepobj.id, step)
        })

        // connect all steps 
        this._flowchart.pipes.forEach((pipeobj, i) => {
            const step = this._steps.get(pipeobj.from)
            step || error(this, `unknown from step "${pipeobj.from}" in flowchart pipes no ${i}`);
            const target = this._steps.get(pipeobj.to)
            target || error(this, `unknown to step "${pipeobj.to}" in flowchart pipes no ${i}`);
            const outport = step.outport(pipeobj.outport)
            outport || error(this, `unknown outport "${pipeobj.outport}" in flowchart pipes no ${i}`);
            const inport = target.inport(pipeobj.inport)
            inport || error(this, `unknown inport "${pipeobj.inport}" in flowchart pipes no ${i}`);
            step.connect(outport, inport, (f: any) => f)
        })
    }

    async run(stepscb : (steps: Step[]) => void) {
        DEBUG && debug(this, `Starting batch (pid: ${process.pid})`)
        DEBUG && debug(this, `initialising arguments`)
        this.initargs()
        DEBUG && debug(this, `initialising globals`)
        this.initglobs()
        DEBUG && debug(this, `initialising steps`)
        this.initsteps()
        Object.freeze(this)

        const steps = Array.from(this._steps.values()) 
        try {
            stepscb && stepscb(steps)
        } catch(e) {
            this.error(`onstart callback error due to due to ${e.message}`)
        }
        DEBUG && debug(this, `executing all the batch's steps `)
        let promises: Promise<any>[] = []
        for (let step of steps) {
            promises.push(step.exec())
        }
        await Promise.all(promises)
    }
}


// async synchronisation beewteen a unique writer and multiple reader 
// create a temporary file
class Pipe {
    readonly tmpfile = `${os.tmpdir()}/tmp-${uuid()}.jsons`
    private _fd
    private _filepos = 0
    private _written = 0
    private _done = false
    private _readers: Map<InputPort, { filepos: number, read: 0, done: boolean }> = new Map()
    private _waits: { resolve: (value?: Promise<any>) => void, reject: (reason?: any) => void }[] = []


    readfrom(reader: InputPort) {
        this._readers.set(reader, { filepos: 0, read: 0, done: false })
    }

    open() {
        try {
            this._fd = fs.openSync(this.tmpfile, 'a+')
        } catch (e) {
            error('Pipe', `unable to open for read/write tempfile "${this.tmpfile}" due to ${e.message}`)
        }
    }
    closed(reader?: InputPort) {
        return (reader) ? this._readers.get(reader).done : this._done
    }

    close(reader?: InputPort) {
        if (reader) {
            // mark reader as done
            this._readers.get(reader).done = true
        } else {
            // mark writer as done
            this._done = true;
        }
        // if allcheck 
        if (this._done && Array.from(this._readers.values()).every(reader => reader.done)) {
            fs.closeSync(this._fd)
        }
    }

    pop(reader: InputPort): Promise<any> {
        if (!this._readers.has(reader)) return
        const r = this._readers.get(reader)
        const b = Buffer.alloc(10)
        let buf = Buffer.alloc(10000)

        return new Promise((resolve, reject) => {
            if (r.read < this._written) {
                fs.read(this._fd, b, 0, b.byteLength, r.filepos, (err, bytes) => {
                    err && error('Pipe', `unable to read fifo "${this.tmpfile}" due to ${err.message}`)
                    r.filepos += bytes;
                    const jsonlen = parseInt(b.toString('utf8'), 10)
                    buf = (buf.byteLength < jsonlen) ? Buffer.alloc(jsonlen) : buf
                    fs.read(this._fd, buf, 0, jsonlen, r.filepos, (err, bytes) => {
                        err && error('Pipe', `unable to read tempfile "${this.tmpfile}" due to ${err.message}`)
                        r.read++
                        r.filepos += bytes;
                        const obj = JSON.parse(buf.toString('utf8', 0, jsonlen))
                        resolve(obj)
                    })
                })
            } else {
                if (this._done) {
                    // emitter closed
                    this.close(reader)
                    // all receivers closed
                    if (Array.from(this._readers.values()).every(v => v.done)) return resolve(EOP)
                }
                // wait for a new object to be outputed
                this._waits.push({ resolve: () => resolve(this.pop(reader)), reject })
            }
        })
    }
    push(item: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const json = JSON.stringify(item)
            const jsonlen = Buffer.byteLength(json) + 1
            const len = `0000000000${jsonlen}`.slice(-10)
            const str = len + json + '\n'
            // we must write len+json in same call to avoid separate write du to concurrency
            fs.write(this._fd, str, this._filepos, (err, bytes) => {
                err && error('Pipe', `unable to write tempfile "${this.tmpfile}" due to ${err.message}`)
                this._filepos += bytes
                this._written++
                // release waiting readers
                const wp = this._waits
                this._waits = []
                wp.forEach(w => w.resolve())
                resolve()
            })
        })
    }
}

/**
 * class defining a port either an input port or an output port
 * port state is first idle
 * port state is started after receiving SOF (start of flow pojo)
 * port state is ended after receiving EOF (end of flow pojo)
 */
abstract class Port {
    get isinput(): boolean { return false };
    get isoutput(): boolean { return false };
    readonly name: string;
    readonly step: Step;
    private state: State = State.idle;

    get isstarted() { return this.state === State.started }
    get isended() { return this.state === State.ended }
    get isidle() { return this.state === State.idle }

    constructor(name: string, step: Step, capacity: number = 1) {
        this.name = name;
        this.step = step;
    }
    protected setState(pojo: any) {
        if (pojo === SOP && this.isidle) this.state = State.started;
        if (pojo === EOP && this.isstarted) this.state = State.ended;
    }
}

class OutputPort extends Port {
    readonly fifo: Pipe = new Pipe()
    get isoutput(): boolean { return true }

    async put(pojo: any) {
        this.setState(pojo)
        if (pojo === SOP) return await this.fifo.open()
        if (pojo === EOP) return await this.fifo.close()
        await this.fifo.push(pojo)
    }
}

class InputPort extends Port {
    fifos: Pipe[] = []
    get isinput(): boolean { return true };

    from(fifo: Pipe) {
        fifo.readfrom(this)
        this.fifos.push(fifo)
    }

    async get() {
        let pojo = EOP
        for (let i = 0; i < this.fifos.length; i++) {
            if (!this.fifos[i].closed(this)) {
                pojo = await this.fifos[i].pop(this)
                if (pojo === EOP) continue;
                break
            }
        }
        this.setState(pojo)
        return pojo;
    }
}

/**
 * @class Step 
 * extend this class to define the behavior of a new kind of step for the cloud batch
 * this class is used during execution time to process each step
 * @property id : step id
 * @property decl : the step declaration
 * @property batch : the batch containing this step
 * @property pipes : pipes output of this step
 * @property ports : input/output ports of this step
 * @property pojo : current pojo (available after first input)
 * @property params : parameters (dynamic see Proxy in constructor)
 */


abstract class Step {
    static register(aclass: TypeStep) {
        REGISTRY[aclass.declaration.gitid] = aclass
    }
    static getstep(stepid: string) {
        return REGISTRY[stepid] 
    }
    readonly id = uuid()
    readonly decl: Declaration
    //private ports: { [key: string]: Port } = {}
    private _inports: { [key: string]: InputPort } = {}
    private _outports: { [key: string]: OutputPort } = {}
    private pojo: any
    private state = State.idle
    private _params: any = {}

    // abstract start() method must be implemented by heriting classes 
    // start() is called for a step at batch ignition time when step have no input port
    // start() is called when step receive first pojo (SOF) from one of its input port
    async start() { }

    // abstract doit() method must be implemented by heriting classes 
    // doit() is called after start() termination
    abstract async doit()

    // abstract end() method must be implemented by heriting classes 
    // end() is called when step receive last pojo (EOF) from all of its input port
    async end() { }


    /**
     * constructor
     * @param decl declaration object for the step
     * @param params parameters expressions for the step
     * @param batch the batch containing this step
     */
    protected constructor(decl: Declaration, params: ParamsMap) {
        this.decl = decl
        Object.keys(decl.inputs).forEach(name => this._inports[name] = new InputPort(name, this))
        Object.keys(decl.outputs).forEach(name => this._outports[name] = new OutputPort(name, this))
        this._params = params;
    }
    get type() { return this.decl.gitid }
    get paramlist() { return Object.keys(this.decl.parameters) }
    get params(): any { return this._params }
    get isidle(): boolean { return this.state === State.idle }
    get isstarted(): boolean { return this.state === State.started }
    get isended(): boolean { return this.state === State.ended }
    get inports(): InputPort[] { return Object['values'](this._inports) }
    get outports(): OutputPort[] { return Object['values'](this._outports) }
    get isinitial() { return this.inports.length === 0 }
    get isfinal() { return this.outports.length === 0 }
    outport(name: string): OutputPort { return this._outports[name] }
    inport(name: string): InputPort { return this._inports[name] }
    toString() { return `${this.id}[Step: ${this.decl.gitid}]`; }
    isinport(portname: string) { return this._inports[portname] ? true : false }
    isoutport(portname: string) { return this._outports[portname] ? true : false }
    port(name: string): Port { return this._inports[name] || this._outports[name] }
    log(message: string) { console.log(message) }
    error(message: string) { error(this, message) }
    debug(message: string) { debug(this, message) }

    /**
     * initialize dynamic step parameter access
     * @param args: arguments map provided by the batch  
     * @param globs: globs map provided by the batch 
     */
    initparams(args: any, globs: any) {
        const paramsfn = {}
        this.paramlist.forEach(name => {
            !(name in this.decl.parameters) && error(this, `unknown parameter "${name}" it must be one of "${toString()}"`);
            paramsfn[name] = paramfunc(this.decl.parameters[name].type, this._params[name] || this.decl.parameters[name].default)
        });

        this._params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    let type = gettype(this.decl.parameters[property.toString()].type)
                    return target[property](args, globs, this._params, this.pojo,quote,type);
                } catch (e) {
                    error(this, `error when evaluating step parameter "${String(property)}" due to "${e.message}" `);
                }
            },
        });
    }

    /**
     * method to connect this step with a data pipe
     * @param outport name of the output port in this step
     * @param inport name of the input port in the target step
     * @param target target step of the pipe (where data flow)
     * @param filter filter function for flowing data
     */
    connect(outport: OutputPort, inport: InputPort, filter: (f: any) => boolean = f => true) {
        this.outports.indexOf(outport) >= 0 || error(this, `output port "${outport.name}" doesnt exists in this step trying to connect`)
        inport.from(outport.fifo);
    }
    private async init() {
        for (let i = 0; i < this.outports.length; i++) {
            const outport = this.outports[i]
            await outport.put(SOP)

        }
    }
    private async terminate() {
        for (let i = 0; i < this.outports.length; i++) {
            const outport = this.outports[i]
            await outport.put(EOP)
        }
    }

    /**
     * method to output a pojo throw the corresponding port
     * @param {string} outport: a port name
     * @param {any} pojo: the pojo to output
     */
    async output(outport: string, pojo: any) {
        const port = this._outports[outport]
        !port && error(this, `unknown output port  "${outport}".`);
        DEBUG && debug(this, `awaiting for output into port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `)
        const result = await port.put(pojo)
        DEBUG && debug(this, `pojo outputed on port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `)
    }

    /**
     * method to get next input pojo throw the corresponding port
     * @param {string} inport: a port name
     */
    async input(inport: string) {
        const port = this._inports[inport]
        !port && error(this, `unknown input port  "${inport}".`);
        DEBUG && debug(this, `awaiting for input into port "${port.name}" `)
        this.pojo = await port.get()
        DEBUG && debug(this, `pojo inputed on port "${port.name} pojo ${JSON.stringify(this.pojo).substr(0, 100)}" `)
        return this.pojo
    }

    async exec() {
        DEBUG && debug(this, `init phase `)
        await this.init()
        DEBUG && debug(this, `start phase `)
        await this.start()
        DEBUG && debug(this, `doit phase `)
        await this.doit()
        DEBUG && debug(this, `end phase `)
        await this.end()
        DEBUG && debug(this, `terminate phase `)
        await this.terminate()
    }
}


class TestbedOutput extends Step {
    static readonly gitid = 'mbenzekri/pojoe/steps/TestbedOutput'
    static readonly declaration: Declaration = {
        gitid: TestbedOutput.gitid,
        title: 'output test pojos to the tested step',
        desc: 'this step inject all the provided test pojos into the tested step',
        inputs: {},
        outputs: { /* to be dynamicaly created at test initialisation */ },
        parameters: {
            'dataforinjection': { default: '${ JSON.stringify(globs.dataforinjection)}', type: 'json', title: 'data to inject into the step' }
        },
    };
    constructor() {
        super(TestbedOutput.declaration, {})
    }

    async doit() {
        // output all the provided pojos for the test
        const data = this.params.dataforinjection
        for (let outport in this.decl.outputs) {
            if (data[outport]) {
                for (let i = 0; i < data[outport].length; i++) {
                    await this.output(outport, data[outport][i])
                }
            }
        }
    }
}



class TestbedInput extends Step {
    static readonly gitid: 'mbenzekri/pojoe/steps/TestbedInput'
    static readonly declaration: Declaration = {
        gitid: TestbedInput.gitid,
        title: 'get pojos from the tested step and validate',
        desc: 'this step receives all the pojos of the tested step and validate them among the expected data',
        inputs: {/* to be dynamicaly created at test initialisation */ },
        outputs: {},
        parameters: {
            'dataforvalidation': { default: '${ JSON.stringify(globs.dataforvalidation)}', type: 'json', title: 'data to inject into the step' }
        },
    }
    constructor() {
        super(TestbedInput.declaration, {})
    }

    async doit() {
        // get all the outputed result pojos for the test
        const result: TestData = {}
        for (let input in this.decl.inputs) {
            result[input] = []
            let pojo = await this.input(input)
            while (pojo !== EOP) {
                result[input].push(pojo)
                pojo = await this.input(input)
            }
        }
        // checks equality with expected pojos 
        const dataval = this.params.dataforvalidation
        for (let input in dataval) {
            const ouputed = result[input] || []
            const expected = dataval[input] || []
            // test if resdata in expected (same order)
            const equals1 = ouputed.every((pojo, i) => JSON.stringify(pojo) === JSON.stringify(expected[i]))
            // test if expected in resdata (same order)
            const equals2 = expected.every((pojo, i) => JSON.stringify(pojo) === JSON.stringify(ouputed[i]))
            if (!equals1 || !equals2) this.error(`test failed due to outputed data !== expected data on port "${input}"` +
                `\n --- EXPECTED: \n${JSON.stringify(expected,undefined, 4)} \n --- OUTPUTED: \n${JSON.stringify(ouputed,undefined, 4)} \n`)
        }
    }
}

/**
 * WARNING !!! du to singleton TESTCASE
 * It's ACTUALY IMPOSSIBLE TO RUN MULTIPLE TESTCASE in parallele
 */
Step.register(TestbedOutput)
Step.register(TestbedInput)

class Testbed extends Batch {
    static pipes(stepid: string): PipeObj[] {
        const stepmod = REGISTRY[stepid]
        stepmod || error('Testbed', `${stepid} not registered`);
        const outpipes = Object.keys(stepmod.declaration.inputs).map(
            inport => <PipeObj>{ from: 'testbedoutput', outport: inport, to: 'testtostep', inport: inport }
        )
        const inpipes = Object.keys(stepmod.declaration.outputs).map(
            outport => <PipeObj>{ from: 'testtostep', outport: outport, to: 'testbedinput', inport: outport }
        )
        const outdecl = REGISTRY[TestbedOutput.gitid].declaration
        const indecl = REGISTRY[TestbedInput.gitid].declaration
        outdecl.outputs = Object.keys(stepmod.declaration.inputs).reduce((prev, port) => {
                prev[port] = { title: 'dynamic ouput test port' }
                return prev
        }, <OutPortsMap>{})
        indecl.inputs = Object.keys(stepmod.declaration.outputs).reduce((prev,port) => {
            prev[port] = { title: 'dynamic input test port' }
            return prev
        }, <InPortsMap>{})
        return outpipes.concat(inpipes)
    }
    static steps(stepid: string, params: ParamsMap): StepObj[] {
        return [
            { id: 'testbedoutput', gitid: TestbedOutput.gitid, params: {} },
            { id: 'testtostep', gitid: stepid, params: params },
            { id: 'testbedinput', gitid: TestbedInput.gitid, params: {} },
        ]
    }
    constructor(testcase: Testcase) {
        super({
            id: uuid(),
            title: `Testbed for step : ${testcase.stepid}`,
            desc: `Testbed for step : ${testcase.stepid}`,
            args: {},
            globs: {
                "dataforvalidation": { type: 'json', value: JSON.stringify(testcase.expected), desc: '' },
                "dataforinjection": { type: 'json', value: JSON.stringify(testcase.injected), desc: '' },
            },
            steps: Testbed.steps(testcase.stepid, testcase.params),
            pipes: Testbed.pipes(testcase.stepid)
        })
    }
    static async run(tests: Testcase[]) {
        for (let i = 0; i < tests.length; i++) {
            try {
                const testcase = tests[i]
                const test = new Testbed(testcase)
                let tested : Step
                await test.run((steps:Step[]) =>{
                    tested = steps.find(step => step.decl.gitid === testcase.stepid) 
                    tested && testcase.onstart && testcase.onstart(tested)
                })
                tested && testcase.onend && testcase.onend(tested)
                console.log(`SUCCESS: test ${tests[i].title}`);
            } catch (e) {
                console.error(`FAILURE: test ${tests[i].title} due to: ${e.message}`);
            }
        }
    }
}

export {
    Declaration, Flowchart, Testcase, Batch, Testbed, Step, ParamsMap, SOP, EOP
};
