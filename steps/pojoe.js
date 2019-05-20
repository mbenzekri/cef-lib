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
const SOP = 'SOF'; // Start Of Pojos
exports.SOP = SOP;
const EOP = 'EOF'; // End Of Pojos
exports.EOP = EOP;
const REGISTRY = {};
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
function quote(str) {
    let quoted = str.replace(/\\{2}/g, '²');
    quoted = quoted.replace(/\\{1}([^fnrt"])/g, '\\\\$1');
    quoted = quoted.replace(/²/g, '\\\\');
    return quoted;
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
            body = ` 
            const expanded = String.raw\`${cleanstr}\`;
            let quoted = expanded
            //let quoted = quote(expanded)
            let parsed = {}
            try {
                parsed=JSON.parse(quoted)
            } catch(e) { 
                throw(new Error('JSON parsing fails for parameter value '+ quoted)) 
            }
            return parsed
            `;
            break;
        case 'json[]':
            body = `const arr=JSON.parse(\`${cleanstr}\`.replace(/\\{1}[^fnrt"]/,'\\\\')); return Array.isArray(arr) ? arr : [arr] `;
            break;
        case 'regexp':
            body = `return new RegExp(\`${cleanstr}\`)`;
            break;
        case 'string':
            body = `return (String.raw\`${cleanstr}\`)`;
            break;
        case 'string[]':
            body = `return (String.raw\`${cleanstr}\`).split(/,/)`;
            break;
    }
    return body;
}
function argfunc(type, strvalue) {
    return new Function('quote', bodyfunc(type, strvalue));
}
function globfunc(type, strvalue) {
    const body = bodyfunc(type, strvalue);
    return new Function('args', 'globs', 'quote', body);
}
function paramfunc(type, strvalue) {
    return new Function('args', 'globs', 'params', 'pojo', 'quote', bodyfunc(type, strvalue));
}
/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globs globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
class Batch {
    constructor(flowchart) {
        this._steps = new Map();
        this._globs = {};
        this._args = {};
        this._flowchart = flowchart;
        DEBUG = process.argv.some((arg) => /^--DEBUG$/i.test(arg));
        // !!! eviter de faire des action supplementaire ici sinon valider avec Testbed 
    }
    get flowchart() { return this._flowchart; }
    get steps() { return this._steps; }
    get globs() { return this._globs; }
    get args() { return this._args; }
    toString() { return `${this._flowchart.id}[Batch: ${this._flowchart.title}]`; }
    error(message) { error(this, message); }
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
            if (/^--.*==.*$/.test(arg)) {
                const [name, value] = arg.replace(/^--?/, '').split(/=/);
                if (this._flowchart.args[name]) {
                    const type = this._flowchart.args[name].type;
                    if (name in this._flowchart.args) {
                        this._args[name] = argfunc(type, value);
                    }
                }
            }
        });
        this._args = new Proxy(argv, {
            get: (target, property) => {
                try {
                    return target[property](quote);
                }
                catch (e) {
                    error(this, `error "${e.message}" when evaluating arg parameter "${String(property)}"`);
                }
            },
        });
    }
    initglobs() {
        // prepare lazy evaluation of parameters for each pojo
        const globs = {};
        Object.keys(this._flowchart.globs).forEach(name => {
            const type = this._flowchart.globs[name].type;
            const value = this._flowchart.globs[name].value;
            globs[name] = globfunc(type, value);
        });
        this._globs = new Proxy(globs, {
            get: (target, property) => {
                try {
                    return target[property](this._args, this.globs, quote);
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
            let module;
            module = REGISTRY[stepobj.gitid];
            if (!module) {
                // gitid is formed : <gitaccount>/<gitrepo>/steps/<step class name>
                const items = stepobj.gitid.split('/');
                items.shift();
                const globpath = items.join('/');
                try {
                    // for production mode modules install in node_modules
                    module = require(globpath);
                }
                catch (e) {
                    error(this, `unable to locate step "${stepobj.gitid}"  module searched with ${globpath}`);
                }
            }
            module = REGISTRY[stepobj.gitid];
            const step = module.create(stepobj.params);
            step.initparams(this.args, this.globs);
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
    run(stepscb) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(this, `Starting batch (pid: ${process.pid})`);
            debug(this, `initialising arguments`);
            this.initargs();
            debug(this, `initialising globals `);
            this.initglobs();
            debug(this, `initialising steps`);
            this.initsteps();
            Object.freeze(this);
            const steps = Array.from(this._steps.values());
            stepscb && stepscb(steps);
            debug(this, `executing all the batch's steps `);
            let promises = [];
            for (let step of steps) {
                promises.push(step.exec());
            }
            yield Promise.all(promises);
        });
    }
}
exports.Batch = Batch;
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
                    // emitter closed
                    this.close(reader);
                    // all receivers closed
                    if (Array.from(this._readers.values()).every(v => v.done))
                        return resolve(EOP);
                }
                // wait for a new object to be outputed
                this._waits.push({ resolve: () => resolve(this.pop(reader)), reject });
            }
        });
    }
    push(item) {
        return new Promise((resolve, reject) => {
            const json = JSON.stringify(item);
            const jsonlen = Buffer.byteLength(json) + 1;
            const len = `0000000000${jsonlen}`.slice(-10);
            const str = len + json + '\n';
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
        if (pojo === SOP && this.isidle)
            this.state = State.started;
        if (pojo === EOP && this.isstarted)
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
            if (pojo === SOP)
                return yield this.fifo.open();
            if (pojo === EOP)
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
            let pojo = EOP;
            for (let i = 0; i < this.fifos.length; i++) {
                if (!this.fifos[i].closed(this)) {
                    pojo = yield this.fifos[i].pop(this);
                    if (pojo === EOP)
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
    static Register(declaration, create) {
        REGISTRY[declaration.gitid] = { declaration, create };
    }
    static getstep(stepid) {
        return REGISTRY[stepid];
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
    toString() { return `${this.id}[Step: ${this.decl.gitid}]`; }
    isinport(portname) { return this._inports[portname] ? true : false; }
    isoutport(portname) { return this._outports[portname] ? true : false; }
    port(name) { return this._inports[name] || this._outports[name]; }
    log(message) { console.log(message); }
    error(message) { error(this, message); }
    debug(message) { debug(this, message); }
    /**
     * initialize dynamic step parameter access
     * @param args: arguments map provided by the batch
     * @param globs: globs map provided by the batch
     */
    initparams(args, globs) {
        const paramsfn = {};
        this.paramlist.forEach(name => {
            !(name in this.decl.parameters) && error(this, `unknown parameter "${name}" it must be one of "${toString()}"`);
            paramsfn[name] = paramfunc(this.decl.parameters[name].type, this._params[name] || this.decl.parameters[name].default);
        });
        this._params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    return target[property](args, globs, this._params, this.pojo, quote);
                }
                catch (e) {
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
    connect(outport, inport, filter = f => true) {
        this.outports.indexOf(outport) >= 0 || error(this, `output port "${outport.name}" doesnt exists in this step trying to connect`);
        inport.from(outport.fifo);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < this.outports.length; i++) {
                const outport = this.outports[i];
                yield outport.put(SOP);
            }
        });
    }
    terminate() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < this.outports.length; i++) {
                const outport = this.outports[i];
                yield outport.put(EOP);
            }
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
            debug(this, `awaiting for input into port "${port.name}" `);
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
class TestbedOutput extends Step {
    constructor() {
        super(TestbedOutput.decl, {});
    }
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            // output all the provided pojos for the test
            const data = this.params.dataforinjection;
            for (let outport in this.decl.outputs) {
                if (data[outport]) {
                    for (let i = 0; i < data[outport].length; i++) {
                        yield this.output(outport, data[outport][i]);
                    }
                }
            }
        });
    }
}
TestbedOutput.gitid = 'mbenzekri/pojoe/steps/TestbedOutput';
TestbedOutput.decl = {
    gitid: TestbedOutput.gitid,
    title: 'output test pojos to the tested step',
    desc: 'this step inject all the provided test pojos into the tested step',
    inputs: {},
    outputs: { /* to be dynamicaly created at test initialisation */},
    parameters: {
        'dataforinjection': { default: '${ JSON.stringify(globs.dataforinjection)}', type: 'json', title: 'data to inject into the step' }
    },
};
class TestbedInput extends Step {
    constructor() {
        super(TestbedInput.decl, {});
    }
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            // get all the outputed result pojos for the test
            const result = {};
            for (let input in this.decl.inputs) {
                result[input] = [];
                let pojo = yield this.input(input);
                while (pojo !== EOP) {
                    result[input].push(pojo);
                    pojo = yield this.input(input);
                }
            }
            // checks equality with expected pojos 
            const dataval = this.params.dataforvalidation;
            for (let input in dataval) {
                const ouputed = result[input] || [];
                const expected = dataval[input] || [];
                // test if resdata in expected (same order)
                const equals1 = ouputed.every((pojo, i) => JSON.stringify(pojo) === JSON.stringify(expected[i]));
                // test if expected in resdata (same order)
                const equals2 = expected.every((pojo, i) => JSON.stringify(pojo) === JSON.stringify(ouputed[i]));
                if (!equals1 || !equals2)
                    this.error(`test failed due to outputed data !== expected data on port "${input}"` +
                        `\n --- EXPECTED: \n${JSON.stringify(expected, undefined, 4)} \n --- OUTPUTED: \n${JSON.stringify(ouputed, undefined, 4)} \n`);
            }
        });
    }
}
TestbedInput.decl = {
    gitid: TestbedInput.gitid,
    title: 'get pojos from the tested step and validate',
    desc: 'this step receives all the pojos of the tested step and validate them among the expected data',
    inputs: { /* to be dynamicaly created at test initialisation */},
    outputs: {},
    parameters: {
        'dataforvalidation': { default: '${ JSON.stringify(globs.dataforvalidation)}', type: 'json', title: 'data to inject into the step' }
    },
};
/**
 * WARNING !!! du to singleton TESTCASE
 * It's ACTUALY IMPOSSIBLE TO RUN MULTIPLE TESTCASE in parallele
 */
Step.Register(TestbedOutput.decl, (params) => new TestbedOutput());
Step.Register(TestbedInput.decl, (params) => new TestbedInput());
class Testbed extends Batch {
    static pipes(stepid) {
        const stepmod = REGISTRY[stepid];
        stepmod || error('Testbed', `${stepid} not registered`);
        const outpipes = Object.keys(stepmod.declaration.inputs).map(inport => ({ from: 'testbedoutput', outport: inport, to: 'testtostep', inport: inport }));
        const inpipes = Object.keys(stepmod.declaration.outputs).map(outport => ({ from: 'testtostep', outport: outport, to: 'testbedinput', inport: outport }));
        const outdecl = REGISTRY[TestbedOutput.gitid].declaration;
        const indecl = REGISTRY[TestbedInput.gitid].declaration;
        outdecl.outputs = Object.keys(stepmod.declaration.inputs).reduce((prev, port) => {
            prev[port] = { title: 'dynamic ouput test port' };
            return prev;
        }, {});
        indecl.inputs = Object.keys(stepmod.declaration.outputs).reduce((prev, port) => {
            prev[port] = { title: 'dynamic input test port' };
            return prev;
        }, {});
        return outpipes.concat(inpipes);
    }
    static steps(stepid, params) {
        return [
            { id: 'testbedoutput', gitid: TestbedOutput.gitid, params: {} },
            { id: 'testtostep', gitid: stepid, params: params },
            { id: 'testbedinput', gitid: TestbedInput.gitid, params: {} },
        ];
    }
    constructor(testcase) {
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
        });
    }
    static run(tests) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < tests.length; i++) {
                try {
                    const testcase = tests[i];
                    const test = new Testbed(testcase);
                    let tested;
                    yield test.run((steps) => {
                        tested = steps.find(step => step.decl.gitid === testcase.stepid);
                        tested && testcase.onstart && testcase.onstart(tested);
                    });
                    tested && testcase.onend && testcase.onend(tested);
                    console.log(`SUCCESS: test ${tests[i].title}`);
                }
                catch (e) {
                    console.error(`FAILURE: test ${tests[i].title} due to: ${e.message}`);
                }
            }
        });
    }
}
exports.Testbed = Testbed;
//# sourceMappingURL=pojoe.js.map