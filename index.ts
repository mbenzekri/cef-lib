import * as uuid from 'uuid/v4'
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'

let DEBUG = false;

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
                    if (Array.from(this._readers.values()).every(v => v.done)) return resolve(EOF)
                }
                // wait for a new object to be outputed
                this._waits.push({ resolve: () => resolve(this.pop(reader)), reject })
            }
        })
    }
    push(item: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const json = JSON.stringify(item)
            const jsonlen = Buffer.byteLength(json)+1
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


function error(obj: any, message: string): boolean {
    const e = new Error()
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':')
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-'
    const script = path.basename(__filename)
    throw new Error(`${script}@${line}: ${obj.toString()} => ${message}`)
}

function debug(obj: any, message: string): boolean {
    if (DEBUG) {
        const e = new Error()
        const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':')
        const line = (frame.length > 1) ? frame[frame.length - 2] : '-'
        const script = path.basename(__filename)
        console.log(`${script}@${line}: ${obj.toString()} => ${message}`)
    }
    return true
}

function bodyfunc(type: string, strvalue: string): string {
    const cleanstr = strvalue.replace(/\`/, '\\`')
    let body = `return \`${cleanstr}\``;
    switch (type) {
        case 'int': body = `return parseInt(\`${cleanstr}\`,10)`;
            break;
        case 'int[]': body = `return (\`${cleanstr}\`).split(/,/).map(v => parseInt(v,10))`;
            break;
        case 'number': body = `return parseFloat(\`${cleanstr}\`)`;
            break;
        case 'number[]': body = `return (\`${cleanstr}\`).split(/,/).map(v => parseFloat(v))`;
            break;
        case 'boolean': body = `return \`${cleanstr}\`=== 'true' ? true : false `;
            break;
        case 'boolean[]': body = `return  (\`${cleanstr}\`).split(/,/).map(v => v === 'true' ? true : false) `;
            break;
        case 'date': body = `return new Date(\`${cleanstr}\`)`;
            break;
        case 'date[]': body = `return (\`${cleanstr}\`).split(/,/).map(v => new Date(v))`;
            break;
        case 'json': body = `return JSON.parse(\`${cleanstr}\`)`;
            break;
        case 'json[]': body = `const arr=JSON.parse(\`${cleanstr}\`); return Array.isArray(arr) ? arr : [arr] `;
            break;
        case 'regexp': body = `return new RegExp(\`${cleanstr}\`)`;
            break;
        case 'string': body = `return \`${cleanstr}\``;
            break;
        case 'string[]': body = `return (\`${cleanstr}\`).split(/,/)`;
            break;
    }
    return body;
}

function argfunc(type: string, strvalue: string): Function {
    return new Function(bodyfunc(type, strvalue));
}

function globfunc(type: string, strvalue: string): Function {
    return new Function('args', 'globals', bodyfunc(type, strvalue));
}

function paramfunc(type: string, strvalue: string): Function {
    return new Function('args', 'globals', 'params', 'pojo', bodyfunc(type, strvalue));
}

const SOF = 'SOF';
const EOF = 'EOF';

// steps registry
const DECLARATIONS = {}

enum PortType { input, output, }

enum State { idle, started, ended, error }

//enum BaseType { int, ints, number, numbers, boolean, date, dates, regexp, string, strings }
//type BaseType = ('int'|'ints'|'number'|'numbers'|'regexp'|'boolean'|'date'|'dates'|'regexp'|'string'|'strings')

type ParamsMapDef = { [key: string]: { desc: string; type: string } };
type PortsMap = { [key: string]: { desc: string } }

type Declaration = {
    gitid: string;
    title: string;
    desc: string;
    parameters: ParamsMapDef;
    inputs: PortsMap;
    outputs: PortsMap;
    fields: any[];
}

type ParamsMap = { [key: string]: string }
type TypedParamsMap = { [key: string]: { value: string, type: string, desc: string } }

interface StepObj {
    id: string;
    gitid: string;
    params: ParamsMap;
}

interface PipeObj {
    from: string;
    outport: string;
    to: string;
    inport: string;
}

type Flowchart = {
    name: string;
    title: string;
    args: TypedParamsMap;
    globals: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
}


/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globals globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
class Batch {

    private _flowchart: Flowchart
    private _steps = new Map<string, Step>()
    private _globals: any = {}
    private _args: any = {}

    constructor(flowchart: Flowchart) {
        this._flowchart = flowchart
    }
    get flowchart() { return this._flowchart }
    get steps() { return this._steps }
    get globals() { return this._globals }
    get args() { return this._args }
    get starts() {
        const steps: Step[] = [];
        this._steps.forEach(step => { if (step.isinitial) steps.push(step) });
        return steps
    }

    /**
     * the toString() legacy method
     */
    toString() { return `[${this._flowchart.name}]`; }


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
            if (arg == '--DEBUG') return DEBUG = true
            const [name, value] = arg.replace(/^--?/, '').split(/=/)
            const type = this._flowchart.args[name].type
            if (name in this._flowchart.args) {
                this._args[name] = argfunc(type, value);
            }
        })
        this._args = new Proxy(argv, {
            get: (target, property) => {
                try {
                    return target[property]();
                } catch (e) {
                    error(this, `error "${e.message}" when evaluating arg parameter "${String(property)}"`);
                }
            },
        });

    }

    private initglobs() {
        // prepare lazy evaluation of parameters for each pojo
        const globals: any = {};
        Object.keys(this._flowchart.globals).forEach(name => {
            const type = this._flowchart.globals[name].type
            const value = this._flowchart.globals[name].value
            globals[name] = globfunc(type, value);
        });

        this._globals = new Proxy(globals, {
            get: (target, property) => {
                try {
                    return target[property](this._args, this.globals);
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
            // gitid is formed : <gitaccount>/<gitrepo>/steps/<step class name>
            const items = stepobj.gitid.split('/')
            items.shift()
            let module;
            const globpath = items.join('/')
            try {
                // for production mode modules install in node_modules
                module = require(globpath)
            } catch (e) {
                error(this, `unable to locate step "${stepobj.gitid}"  module searched with ${globpath}`)
            }
            const step: Step = module.create(stepobj.params)
            step.initparams(this.args, this.globals)
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

    async run() {
        // start nodes without predecessor
        try {
            debug(this, `initialising arguments`)
            this.initargs()
            debug(this, `initialising globals `)
            this.initglobs()
            debug(this, `initialising steps parameters`)
            this.initsteps()
            Object.freeze(this)
            // collect initial steps an
            debug(this, `executing all the batch's steps `)
            let promises: Promise<any>[] = []
            this._steps.forEach(step => {
                promises.push(step.exec())
            })
            await Promise.all(promises)
        } catch (e) {
            console.error(`Error: ${e.message}`)
        }
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
        if (pojo === SOF && this.isidle) this.state = State.started;
        if (pojo === EOF && this.isstarted) this.state = State.ended;
    }
}

class OutputPort extends Port {
    readonly fifo: Pipe = new Pipe()
    get isoutput(): boolean { return true }

    async put(pojo: any) {
        this.setState(pojo)
        if (pojo === SOF) return await this.fifo.open()
        if (pojo === EOF) return await this.fifo.close()
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
        let pojo = EOF
        for (let i = 0; i < this.fifos.length; i++) {
            if (!this.fifos[i].closed(this)) {
                pojo = await this.fifos[i].pop(this)
                if (pojo === EOF) continue;
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
    toString() { return `[${this.decl.gitid} / ${this.id}]`; }
    isinport(portname: string) { return this._inports[portname] ? true : false }
    isoutport(portname: string) { return this._outports[portname] ? true : false }
    port(name: string): Port { return this._inports[name] || this._outports[name] }
    log(message: string) { console.log(message) }

    /**
     * initialize dynamic step parameter access
     * @param args: arguments map provided by the batch  
     * @param globals: globals map provided by the batch 
     */
    initparams(args: any, globals: any) {
        const paramsfn = {}
        this.paramlist.forEach(name => {
            !(name in this.decl.parameters) && error(this, `parameter "${name}" unknown must be one of "${toString()}"`);
            paramsfn[name] = paramfunc(this.decl.parameters[name].type, this._params[name])
        });

        this._params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    return target[property](args, globals, this._params, this.pojo);
                } catch (e) {
                    error(this, `error "${e.message}" when evaluating step parameter "${String(property)}"`);
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
            await this.open(outport.name)
        }
    }
    private async terminate() {
        this.outports.forEach(outport => this.close(outport.name))
    }
    /**
     * method to declare output termination throw the corresponding port
     * @param name: a port name
     */
    private async close(outport: string) {
        const port = this._outports[outport]
        !port && error(this, `unknown output port  "${outport}".`);
        return port.put(EOF)
    }
    /**
     * method to declare output starting throw the corresponding port
     * @param name: a port name
     */
    private async open(outport: string) {
        const port = this._outports[outport]
        !port && error(this, `unknown output port  "${outport}".`);
        return await port.put(SOF)
    }

    /**
     * method to output a pojo throw the corresponding port
     * @param {string} outport: a port name
     * @param {any} pojo: the pojo to output
     */
    async output(outport: string, pojo: any) {
        const port = this._outports[outport]
        !port && error(this, `unknown output port  "${outport}".`);
        debug(this, `awaiting for output into port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `)
        const result = await port.put(pojo)
        debug(this, `pojo outputed on port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `)
    }

    /**
     * method to get next input pojo throw the corresponding port
     * @param {string} inport: a port name
     */
    async input(inport: string) {
        const port = this._inports[inport]
        !port && error(this, `unknown input port  "${inport}".`);
        debug(this, `awaiting for input into port "${port.name} " `)
        this.pojo = await port.get()
        debug(this, `pojo inputed on port "${port.name} pojo ${JSON.stringify(this.pojo).substr(0, 100)}" `)
        return this.pojo
    }

    async exec() {
        debug(this, `init phase `)
        await this.init()
        debug(this, `start phase `)
        await this.start()
        debug(this, `doit phase `)
        await this.doit()
        debug(this, `end phase `)
        await this.end()
        debug(this, `terminate phase `)
        await this.terminate()
    }
}

export {
    Declaration, Flowchart, Batch, Step, ParamsMap, SOF, EOF
};
