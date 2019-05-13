"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const os = require("os");
let DEBUG = false;
// async synchronisation beewteen a unique writer and multiple reader 
// create a temporary file
class Pipe {
    constructor() {
        this.tmpfile = `${os.tmpdir()}/tmp-${uuid()}.jsons`;
        this._filepos = 0;
        this._written = 0;
        this._done = false;
        this._readers = new Map();
        this._waits = [];
    }
    readfrom(reader) {
        this._readers.set(reader, { filepos: 0, read: 0, done: false });
    }
    open() {
        try {
            this._fd = fs.openSync(this.tmpfile, 'a+');
        }
        catch (e) {
            error('Pipe', `unable to open for read/write tempfile "${this.tmpfile}" due to ${e.message}`);
        }
    }
    closed(reader) {
        return (reader) ? this._readers.get(reader).done : this._done;
    }
    close(reader) {
        if (reader) {
            // mark reader as done
            this._readers.get(reader).done = true;
        }
        else {
            // mark writer as done
            this._done = true;
        }
        // if allcheck 
        if (this._done && Array.from(this._readers.values()).every(reader => reader.done)) {
            fs.closeSync(this._fd);
        }
    }
    pop(reader) {
        if (!this._readers.has(reader))
            return;
        const r = this._readers.get(reader);
        const b = Buffer.alloc(10);
        let buf = Buffer.alloc(10000);
        return new Promise((resolve, reject) => {
            if (r.read < this._written) {
                fs.read(this._fd, b, 0, b.byteLength, r.filepos, (err, bytes) => {
                    err && error('Pipe', `unable to read fifo "${this.tmpfile}" due to ${err.message}`);
                    r.filepos += bytes;
                    const jsonlen = parseInt(b.toString('utf8'), 10);
                    buf = (buf.byteLength < jsonlen) ? Buffer.alloc(jsonlen) : buf;
                    fs.read(this._fd, buf, 0, jsonlen, r.filepos, (err, bytes) => {
                        err && error('Pipe', `unable to read tempfile "${this.tmpfile}" due to ${err.message}`);
                        r.read++;
                        r.filepos += bytes;
                        const obj = JSON.parse(buf.toString('utf8', 0, jsonlen));
                        resolve(obj);
                    });
                });
            }
            else {
                if (this._done) {
                    this.close(reader);
                    return resolve(EOF);
                }
                // wait for a new object to be outputed
                this._waits.push({ resolve: () => resolve(this.pop(reader)), reject });
            }
        });
    }
    push(item) {
        return new Promise((resolve, reject) => {
            const json = JSON.stringify(item);
            const jsonlen = Buffer.byteLength(json);
            const len = `0000000000${jsonlen}`.slice(-10);
            const str = len + json;
            // we must write len+json in same call to avoid separate write du to concurrency
            fs.write(this._fd, str, this._filepos, (err, bytes) => {
                err && error('Pipe', `unable to write tempfile "${this.tmpfile}" due to ${err.message}`);
                this._filepos += bytes;
                this._written++;
                // release waiting readers
                const wp = this._waits;
                this._waits = [];
                wp.forEach(w => w.resolve());
                resolve();
            });
        });
    }
}
function error(obj, message) {
    const e = new Error();
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':');
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-';
    const script = path.basename(__filename);
    throw new Error(`${script}@${line}: ${obj.toString()} => ${message}`);
}
function debug(obj, message) {
    if (DEBUG) {
        const e = new Error();
        const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':');
        const line = (frame.length > 1) ? frame[frame.length - 2] : '-';
        const script = path.basename(__filename);
        console.log(`${script}@${line}: ${obj.toString()} => ${message}`);
    }
    return true;
}
function bodyfunc(type, strvalue) {
    const cleanstr = strvalue.replace(/\`/, '\\`');
    let body = `return \`${cleanstr}\``;
    switch (type) {
        case 'int':
            body = `return parseInt(\`${cleanstr}\`,10)`;
            break;
        case 'int[]':
            body = `return (\`${cleanstr}\`).split(/,/).map(v => parseInt(v,10))`;
            break;
        case 'number':
            body = `return parseFloat(\`${cleanstr}\`)`;
            break;
        case 'number[]':
            body = `return (\`${cleanstr}\`).split(/,/).map(v => parseFloat(v))`;
            break;
        case 'boolean':
            body = `return \`${cleanstr}\`=== 'true' ? true : false `;
            break;
        case 'boolean[]':
            body = `return  (\`${cleanstr}\`).split(/,/).map(v => v === 'true' ? true : false) `;
            break;
        case 'date':
            body = `return new Date(\`${cleanstr}\`)`;
            break;
        case 'date[]':
            body = `return (\`${cleanstr}\`).split(/,/).map(v => new Date(v))`;
            break;
        case 'json':
            body = `return JSON.parse(\`${cleanstr}\`)`;
            break;
        case 'json[]':
            body = `const arr=JSON.parse(\`${cleanstr}\`); return Array.isArray(arr) ? arr : [arr] `;
            break;
        case 'regexp':
            body = `return new RegExp(\`${cleanstr}\`)`;
            break;
        case 'string':
            body = `return \`${cleanstr}\``;
            break;
        case 'string[]':
            body = `return (\`${cleanstr}\`).split(/,/)`;
            break;
    }
    return body;
}
function argfunc(type, strvalue) {
    return new Function(bodyfunc(type, strvalue));
}
function globfunc(type, strvalue) {
    return new Function('args', 'globals', bodyfunc(type, strvalue));
}
function paramfunc(type, strvalue) {
    return new Function('args', 'globals', 'params', 'pojo', bodyfunc(type, strvalue));
}
const SOF = 'SOF';
exports.SOF = SOF;
const EOF = 'EOF';
exports.EOF = EOF;
// steps registry
const DECLARATIONS = {};
var PortType;
(function (PortType) {
    PortType[PortType["input"] = 0] = "input";
    PortType[PortType["output"] = 1] = "output";
})(PortType || (PortType = {}));
var State;
(function (State) {
    State[State["idle"] = 0] = "idle";
    State[State["started"] = 1] = "started";
    State[State["ended"] = 2] = "ended";
    State[State["error"] = 3] = "error";
})(State || (State = {}));
/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globals globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
class Batch {
    constructor(flowchart) {
        this._steps = new Map();
        this._globals = {};
        this._args = {};
        this._flowchart = flowchart;
    }
    get flowchart() { return this._flowchart; }
    get steps() { return this._steps; }
    get globals() { return this._globals; }
    get args() { return this._args; }
    get starts() {
        const steps = [];
        this._steps.forEach(step => { if (step.isinitial)
            steps.push(step); });
        return steps;
    }
    /**
     * the toString() legacy method
     */
    toString() { return `[${this._flowchart.name}]`; }
    initargs() {
        const argv = {};
        // default value in batch declaration
        Object.keys(this._flowchart.args).forEach(name => {
            const type = this._flowchart.args[name].type;
            const value = this._flowchart.args[name].value;
            argv[name] = argfunc(type, value);
        });
        // then env variables
        Object.keys(this._flowchart.args).forEach(name => {
            if (name in process.env) {
                const type = this._flowchart.args[name].type;
                const value = process.env[name];
                argv[name] = argfunc(type, value);
            }
        });
        // then process parameters
        process.argv.forEach((arg, i) => {
            if (i < 2)
                return; // skip 'node.exe' and 'script.js'
            if (arg == '--DEBUG')
                return DEBUG = true;
            const [name, value] = arg.replace(/^--?/, '').split(/=/);
            const type = this._flowchart.args[name].type;
            if (name in this._flowchart.args) {
                this._args[name] = argfunc(type, value);
            }
        });
        this._args = new Proxy(argv, {
            get: (target, property) => {
                try {
                    return target[property]();
                }
                catch (e) {
                    error(this, `error "${e.message}" when evaluating arg parameter "${String(property)}"`);
                }
            },
        });
    }
    initglobs() {
        // prepare lazy evaluation of parameters for each pojo
        const globals = {};
        Object.keys(this._flowchart.globals).forEach(name => {
            const type = this._flowchart.globals[name].type;
            const value = this._flowchart.globals[name].value;
            globals[name] = globfunc(type, value);
        });
        this._globals = new Proxy(globals, {
            get: (target, property) => {
                try {
                    return target[property](this._args, this.globals);
                }
                catch (e) {
                    error(this, `error "${e.message}" when evaluating global parameter "${String(property)}"`);
                }
            },
        });
    }
    /**
     * method to add a step to this batch
     * @param {Step} step: a step to add to this batch
     */
    initsteps() {
        // construct all steps 
        this._flowchart.steps.forEach(stepobj => {
            // gitid is formed : <gitaccount>/<gitrepo>/steps/<step class name>
            const items = stepobj.gitid.split('/');
            items.shift();
            let module;
            const locpath = (process.env.CEF_PATH || '.') + '/' + items.join('/');
            const globpath = items.join('/');
            try {
                // during dev testing this module module js file is in project "steps" directory
                // ENV variable process.env.CEF_PATH is needed to locate dev "steps" path
                module = require(locpath);
            }
            catch (e) {
                try {
                    // for production mode modules install in node_modules
                    module = require(globpath);
                }
                catch (e) {
                    error(this, `unable to locate step "${stepobj.gitid}"  module searched at ${globpath} and ${locpath} \n (did you forget process.env.CEF_PATH affectaion during dev )`);
                }
            }
            const step = module.create(stepobj.params);
            step.initparams(this.args, this.globals);
            this._steps.set(stepobj.id, step);
        });
        // connect all steps 
        this._flowchart.pipes.forEach((pipeobj, i) => {
            const step = this._steps.get(pipeobj.from);
            step || error(this, `unknown from step "${pipeobj.from}" in flowchart pipes no ${i}`);
            const target = this._steps.get(pipeobj.to);
            target || error(this, `unknown to step "${pipeobj.to}" in flowchart pipes no ${i}`);
            const outport = step.outport(pipeobj.outport);
            outport || error(this, `unknown outport "${pipeobj.outport}" in flowchart pipes no ${i}`);
            const inport = target.inport(pipeobj.inport);
            inport || error(this, `unknown inport "${pipeobj.inport}" in flowchart pipes no ${i}`);
            step.connect(outport, inport, (f) => f);
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            // start nodes without predecessor
            try {
                debug(this, `initialising arguments`);
                this.initargs();
                debug(this, `initialising globals `);
                this.initglobs();
                debug(this, `initialising steps parameters`);
                this.initsteps();
                Object.freeze(this);
                // collect initial steps an
                debug(this, `executing all the batch's steps `);
                let promises = [];
                this._steps.forEach(step => {
                    promises.push(step.exec());
                });
                yield Promise.all(promises);
            }
            catch (e) {
                console.error(`Error: ${e.message}`);
            }
        });
    }
}
exports.Batch = Batch;
/**
 * class defining a port either an input port or an output port
 * port state is first idle
 * port state is started after receiving SOF (start of flow pojo)
 * port state is ended after receiving EOF (end of flow pojo)
 */
class Port {
    constructor(name, step, capacity = 1) {
        this.state = State.idle;
        this.name = name;
        this.step = step;
    }
    get isinput() { return false; }
    ;
    get isoutput() { return false; }
    ;
    get isstarted() { return this.state === State.started; }
    get isended() { return this.state === State.ended; }
    get isidle() { return this.state === State.idle; }
    setState(pojo) {
        if (pojo === SOF && this.isidle)
            this.state = State.started;
        if (pojo === EOF && this.isstarted)
            this.state = State.ended;
    }
}
class OutputPort extends Port {
    constructor() {
        super(...arguments);
        this.fifo = new Pipe();
    }
    get isoutput() { return true; }
    put(pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setState(pojo);
            if (pojo === SOF)
                return yield this.fifo.open();
            if (pojo === EOF)
                return yield this.fifo.close();
            yield this.fifo.push(pojo);
        });
    }
}
class InputPort extends Port {
    constructor() {
        super(...arguments);
        this.fifos = [];
    }
    get isinput() { return true; }
    ;
    from(fifo) {
        fifo.readfrom(this);
        this.fifos.push(fifo);
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            let pojo = EOF;
            for (let i = 0; i < this.fifos.length; i++) {
                if (!this.fifos[i].closed(this)) {
                    pojo = yield this.fifos[i].pop(this);
                    if (pojo === EOF)
                        continue;
                    break;
                }
            }
            this.setState(pojo);
            return pojo;
        });
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
class Step {
    /**
     * constructor
     * @param decl declaration object for the step
     * @param params parameters expressions for the step
     * @param batch the batch containing this step
     */
    constructor(decl, params) {
        this.id = uuid();
        //private ports: { [key: string]: Port } = {}
        this._inports = {};
        this._outports = {};
        this.state = State.idle;
        this._params = {};
        this.decl = decl;
        Object.keys(decl.inputs).forEach(name => this._inports[name] = new InputPort(name, this));
        Object.keys(decl.outputs).forEach(name => this._outports[name] = new OutputPort(name, this));
        this._params = params;
    }
    // abstract start() method must be implemented by heriting classes 
    // start() is called for a step at batch ignition time when step have no input port
    // start() is called when step receive first pojo (SOF) from one of its input port
    start() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    // abstract end() method must be implemented by heriting classes 
    // end() is called when step receive last pojo (EOF) from all of its input port
    end() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    get type() { return this.decl.gitid; }
    get paramlist() { return Object.keys(this.decl.parameters); }
    get params() { return this._params; }
    get isidle() { return this.state === State.idle; }
    get isstarted() { return this.state === State.started; }
    get isended() { return this.state === State.ended; }
    get inports() { return Object['values'](this._inports); }
    get outports() { return Object['values'](this._outports); }
    get isinitial() { return this.inports.length === 0; }
    get isfinal() { return this.outports.length === 0; }
    outport(name) { return this._outports[name]; }
    inport(name) { return this._inports[name]; }
    toString() { return `[${this.decl.gitid} / ${this.id}]`; }
    isinport(portname) { return this._inports[portname] ? true : false; }
    isoutport(portname) { return this._outports[portname] ? true : false; }
    port(name) { return this._inports[name] || this._outports[name]; }
    log(message) { console.log(message); }
    /**
     * initialize dynamic step parameter access
     * @param args: arguments map provided by the batch
     * @param globals: globals map provided by the batch
     */
    initparams(args, globals) {
        const paramsfn = {};
        this.paramlist.forEach(name => {
            !(name in this.decl.parameters) && error(this, `parameter "${name}" unknown must be one of "${toString()}"`);
            paramsfn[name] = paramfunc(this.decl.parameters[name].type, this._params[name]);
        });
        this._params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    return target[property](args, globals, this._params, this.pojo);
                }
                catch (e) {
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
    connect(outport, inport, filter = f => true) {
        this.outports.indexOf(outport) >= 0 || error(this, `output port "${outport.name}" doesnt exists in this step trying to connect`);
        inport.from(outport.fifo);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < this.outports.length; i++) {
                const outport = this.outports[i];
                yield this.open(outport.name);
            }
        });
    }
    terminate() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outports.forEach(outport => this.close(outport.name));
        });
    }
    /**
     * method to declare output termination throw the corresponding port
     * @param name: a port name
     */
    close(outport) {
        return __awaiter(this, void 0, void 0, function* () {
            const port = this._outports[outport];
            !port && error(this, `unknown output port  "${outport}".`);
            return port.put(EOF);
        });
    }
    /**
     * method to declare output starting throw the corresponding port
     * @param name: a port name
     */
    open(outport) {
        return __awaiter(this, void 0, void 0, function* () {
            const port = this._outports[outport];
            !port && error(this, `unknown output port  "${outport}".`);
            return yield port.put(SOF);
        });
    }
    /**
     * method to output a pojo throw the corresponding port
     * @param {string} outport: a port name
     * @param {any} pojo: the pojo to output
     */
    output(outport, pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            const port = this._outports[outport];
            !port && error(this, `unknown output port  "${outport}".`);
            debug(this, `awaiting for output into port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `);
            const result = yield port.put(pojo);
            debug(this, `pojo outputed on port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `);
        });
    }
    /**
     * method to get next input pojo throw the corresponding port
     * @param {string} inport: a port name
     */
    input(inport) {
        return __awaiter(this, void 0, void 0, function* () {
            const port = this._inports[inport];
            !port && error(this, `unknown input port  "${inport}".`);
            debug(this, `awaiting for input into port "${port.name} " `);
            this.pojo = yield port.get();
            debug(this, `pojo inputed on port "${port.name} pojo ${JSON.stringify(this.pojo).substr(0, 100)}" `);
            return this.pojo;
        });
    }
    exec() {
        return __awaiter(this, void 0, void 0, function* () {
            debug(this, `init phase `);
            yield this.init();
            debug(this, `start phase `);
            yield this.start();
            debug(this, `doit phase `);
            yield this.doit();
            debug(this, `end phase `);
            yield this.end();
            debug(this, `terminate phase `);
            yield this.terminate();
        });
    }
}
exports.Step = Step;
//# sourceMappingURL=step.js.map