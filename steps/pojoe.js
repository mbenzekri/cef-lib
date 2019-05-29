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
const os = require("os");
const fs = require("fs");
const path = require("path");
const types_1 = require("./types");
function error(obj, message) {
    const e = new Error();
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':');
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-';
    const script = path.basename(__filename);
    throw new Error(`${script}@${line}: ${obj.toString()} => ${message}`);
}
function debug(obj, message) {
    const e = new Error();
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':');
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-';
    const script = path.basename(__filename);
    console.log(`${script}@${line}: ${obj.toString()} => ${message}`);
    return true;
}
function bodyfunc(type, strvalue) {
    const cleanstr = strvalue.replace(/\`/, '${"`"}');
    let body = `
        let raw = '';
        try {
            raw = String.raw\`${cleanstr}\`
            return type.fromString(raw)
        } catch(e) { 
            throw(new Error(\`evaluation of "${strvalue}" of type "${type}" fails due to => \\n    $\{e.message}\`)) 
        }
    `;
    return body;
}
function argfunc(type, strvalue) {
    const body = bodyfunc(type, strvalue);
    return new Function('type', body);
}
function globfunc(type, strvalue) {
    const body = bodyfunc(type, strvalue);
    return new Function('args', 'globs', 'type', body);
}
function paramfunc(type, strvalue) {
    const body = bodyfunc(type, strvalue);
    return new Function('args', 'globs', 'params', 'pojo', 'type', body);
}
let DEBUG = false;
let COUNT = false;
const SOP = 'SOP'; // Start Of Pojos
exports.SOP = SOP;
const EOP = 'EOP'; // End Of Pojos
exports.EOP = EOP;
const REGISTRY = {};
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
        COUNT = process.argv.some((arg) => /^--COUNT$/i.test(arg));
        // !!! eviter de faire des action supplementaire ici sinon valider avec Testbed 
    }
    get startdate() { return this._startdate; }
    get enddate() { return this._enddate; }
    get flowchart() { return this._flowchart; }
    get steps() { return this._steps; }
    get globs() { return this._globs; }
    get args() { return this._args; }
    toString() { return `[Batch: ${this._flowchart.title}]`; }
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
            if (process.env[name]) {
                const type = this._flowchart.args[name].type;
                const value = process.env[name];
                argv[name] = argfunc(type, value);
            }
        });
        // then process parameters
        process.argv.forEach((arg, i) => {
            if (i < 2)
                return; // skip 'node.exe' and 'script.js'
            if (/^--.*=.*$/.test(arg)) {
                const [name, value] = arg.replace(/^--?/, '').split(/=/);
                if (this._flowchart.args[name]) {
                    const type = this._flowchart.args[name].type;
                    if (name in this._flowchart.args) {
                        argv[name] = argfunc(type, value);
                    }
                }
            }
        });
        argv['POJOE_TEMP_DIR'] = process.env['POJOE_TEMP_DIR'] || os.tmpdir();
        this._args = new Proxy(argv, {
            get: (target, property) => {
                try {
                    let argdef = this._flowchart.args[property.toString()];
                    argdef || this.error(`unknown argument variable "${property.toString()}" used`);
                    let type = types_1.gettype(argdef.type);
                    return target[property](type);
                }
                catch (e) {
                    this.error(`error "${e.message}" when evaluating arg parameter "${String(property)}"`);
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
                let globdef = this._flowchart.globs[property.toString()];
                globdef || this.error(`unknown global variable "${property.toString()}" used`);
                let type = types_1.gettype(globdef.type);
                try {
                    return target[property](this._args, this.globs, type);
                }
                catch (e) {
                    this.error(`error "${e.message}" when evaluating global parameter "${String(property)}" due to =>\n    ${e.message}`);
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
            let aclass = REGISTRY[stepobj.gitid];
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
            aclass = REGISTRY[stepobj.gitid];
            const step = new aclass(stepobj.params);
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
    logcounts(timed = false) {
        const now = new Date();
        let duration;
        timed && (duration = Math.floor(this.enddate.getTime() / 1000 - this.startdate.getTime() / 1000));
        timed && console.log(`--- ${this.flowchart.title} -------------------------------------------------`);
        timed && console.log(`duration: ${duration} sec. start:${this.startdate.toISOString()} end:${this.enddate.toISOString()}`);
        this.steps.forEach(step => {
            const inlog = step.inports.length ? `IN[ ${step.inports.map(port => port.name + '=' + port.count).join(' , ')} ]` : '';
            const outlog = step.outports.length ? `OUT[ ${step.outports.map(port => port.name + '=' + port.count).join(' , ')} ]` : '';
            console.log(`${now.toISOString()} : ${step.decl.gitid.split('/')[3]} ${inlog} ${outlog}`);
        });
        timed && console.log(`--- ${this.flowchart.title} -------------------------------------------------`);
    }
    run(stepscb) {
        return __awaiter(this, void 0, void 0, function* () {
            let timeout;
            this._startdate = new Date();
            COUNT && (timeout = setInterval(this.logcounts.bind(this), 10000));
            DEBUG && debug(this, `Starting batch => ${this._flowchart.title} @pid: ${process.pid}`);
            DEBUG && debug(this, `initialising arguments`);
            this.initargs();
            DEBUG && debug(this, `initialising globals`);
            this.initglobs();
            DEBUG && debug(this, `initialising steps`);
            this.initsteps();
            const steps = Array.from(this._steps.values());
            try {
                stepscb && stepscb(steps);
            }
            catch (e) {
                this.error(`onstart callback error due to => \n    ${e.message}`);
            }
            DEBUG && debug(this, `executing all the batch's steps `);
            let promises = [];
            for (let step of steps) {
                promises.push(step.exec());
            }
            yield Promise.all(promises);
            this._enddate = new Date();
            COUNT && clearInterval(timeout);
            this.logcounts(true);
        });
    }
}
exports.Batch = Batch;
// async synchronisation beewteen a unique writer and multiple reader 
// create a temporary file
class Pipe {
    constructor() {
        this.tmpfile = `${os.tmpdir()}/tmp-${uuid()}.jsons`;
        this._towrite = 0;
        this.capacity = 20000;
        this._consumed = 0;
        this._readers = new Map();
        this._writer = { fd: -1, filepos: 0, written: 0, done: false, waiting: false, resolve: null, reject: null };
        this._lasts = [];
        this._fifo = [];
    }
    get readended() {
        for (const [_, rstate] of this._readers)
            if (!rstate.done)
                return false;
        return true;
    }
    get writeended() { return this._writer.done && this._writer.written >= this._towrite; }
    get ended() { return this.writeended && this.readended; }
    get hasreaders() { return this._readers.size > 0; }
    fwdread(rstate, bytes) {
        rstate.read++;
        rstate.filepos += bytes;
        rstate.done = this.writeended && rstate.read >= this._towrite;
        if (this.ended)
            fs.closeSync(this._writer.fd);
    }
    fwdwrite(wstate, bytes) {
        this._writer.written++;
        this._writer.filepos += bytes;
    }
    open() {
        try {
            (this._writer.fd === -1) && (this._writer.fd = fs.openSync(this.tmpfile, 'w'));
            this._readers.forEach(reader => (reader.fd === -1) && (reader.fd = fs.openSync(this.tmpfile, 'r')));
        }
        catch (e) {
            error('Pipe', `unable to open for read/write tempfile "${this.tmpfile}" due to => \n    ${e.message}`);
        }
    }
    close() {
        this._writer.done = true;
        this.releasereaders();
    }
    releasereaders() {
        // release all the waiting readers
        for (let [_, rstate] of this._readers) {
            if (rstate.waiting) {
                rstate.resolve();
                rstate.waiting = false;
                rstate.resolve = null;
                rstate.reject = null;
            }
        }
    }
    releasewriter() {
        // release the waiting writer
        if (this._writer.waiting) {
            this._writer.resolve();
            this._writer.waiting = false;
            this._writer.resolve = null;
            this._writer.reject = null;
        }
    }
    write(wstate, pojo, resolve, reject) {
        // one capacity consumed
        this._consumed++;
        // calculating json string and size to write
        const json = JSON.stringify(pojo) + '\n';
        // we must write len+json in same call to avoid separate write due to concurrency
        fs.write(this._writer.fd, json, this._writer.filepos, (err, bytes) => {
            if (err)
                return reject(new Error(`Pipe unable to write tempfile "${this.tmpfile}" due to  => \n    ${err.message}`));
            // return one capacity returned then release writer
            this._consumed--;
            this.fwdwrite(wstate, bytes);
            this.releasewriter();
            // forward writer means data is provided then release readers
            this.releasereaders();
            resolve();
        });
    }
    read(rstate, resolve, reject) {
        let buf = Buffer.alloc(10000);
        if (this._fifo.length > 0) {
            // extract item from fifo
            const pojo = JSON.parse(this._fifo.shift());
            // forward reader data is consumed
            rstate.read++;
            rstate.done = this.writeended && rstate.read >= this._towrite;
            if (this.ended)
                fs.closeSync(this._writer.fd);
            return resolve(pojo);
        }
        fs.read(rstate.fd, buf, 0, buf.byteLength, rstate.filepos, (err, bytes) => {
            if (err)
                return reject(new Error(`Pipe unable to read size object from file "${this.tmpfile}" due to => \n    ${err.message}`));
            rstate.filepos += bytes;
            let start = 0;
            buf.forEach((byte, end) => {
                if (byte === 10) {
                    this._lasts.push(buf.toString('utf8', start, end));
                    const line = this._lasts.join('');
                    this._fifo.push(line);
                    start = end + 1;
                    this._lasts = [];
                }
            });
            if (start <= bytes)
                this._lasts.push(buf.toString('utf8', start, bytes));
            // continue reading
            this.read(rstate, resolve, reject);
        });
    }
    awaitreader(reader, resolve, reject) {
        const rstate = this._readers.get(reader);
        rstate.waiting = true;
        rstate.resolve = () => resolve(this.pop(reader));
        rstate.reject = reject;
    }
    awaitwriter(item, resolve, reject) {
        this._writer.waiting = true;
        this._writer.resolve = () => resolve(this.push(item));
        this._writer.reject = reject;
    }
    addreader(reader) {
        this._readers.set(reader, { fd: -1, filepos: 0, read: 0, done: false, waiting: false, resolve: null, reject: null });
    }
    isdone(port) {
        return this._readers.get(port).done;
    }
    pop(reader) {
        return __awaiter(this, void 0, void 0, function* () {
            const rstate = this._readers.get(reader);
            // reader terminated return EOP (End Of Pojos) 
            if (rstate.done)
                return EOP;
            if (rstate.read == this._towrite && this.writeended) {
                // case for no pojos ouputed (open followed by close)
                rstate.done = true;
                return EOP;
            }
            return rstate && new Promise((resolve, reject) => {
                // data ready ?
                if (rstate.read < this._writer.written)
                    // reader have items to read go read
                    this.read(rstate, resolve, reject);
                else
                    // wait for new data that will be ready after a write termination
                    this.awaitreader(reader, resolve, reject);
            });
        });
    }
    push(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (item === SOP) {
                this.open();
                return;
            }
            if (item === EOP) {
                this.close();
                return;
            }
            this._towrite++;
            return new Promise((resolve, reject) => {
                // free capacity ?
                if (this._consumed < this.capacity)
                    // enough capacity go write
                    this.write(this._writer, item, resolve, reject);
                else
                    // wait for capacity that will be released after a write termination
                    this.awaitwriter(item, resolve, reject);
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
    constructor(name, step) {
        this.state = types_1.State.idle;
        this._count = 0;
        this.name = name;
        this.step = step;
    }
    get count() { return this._count; }
    get isinput() { return false; }
    ;
    get isoutput() { return false; }
    ;
    get isconnected() { return false; }
    ;
    get isstarted() { return this.state === types_1.State.started; }
    get isended() { return this.state === types_1.State.ended; }
    get isidle() { return this.state === types_1.State.idle; }
    setState(pojo) {
        if (pojo === SOP && this.isidle)
            this.state = types_1.State.started;
        if (pojo === EOP && this.isstarted)
            this.state = types_1.State.ended;
    }
}
class OutputPort extends Port {
    constructor() {
        super(...arguments);
        this.pipe = new Pipe();
    }
    get isoutput() { return true; }
    get isconnected() { return this.pipe.hasreaders; }
    put(pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setState(pojo);
            yield this.pipe.push(pojo).then(_ => pojo !== SOP && pojo !== EOP && this._count++).catch(e => Promise.reject(e));
        });
    }
}
class InputPort extends Port {
    constructor(name, step) {
        super(name, step);
        this.pipes = [];
        this._eopcnt = 0;
        this.state = types_1.State.started;
    }
    get isinput() { return true; }
    ;
    get isconnected() { return this.pipes.length > 0; }
    from(pipe) {
        pipe.addreader(this);
        this.pipes.push(pipe);
    }
    setState(pojo) {
        if (pojo === SOP && this.isidle)
            this.state = types_1.State.started;
        if (pojo === EOP && this.isstarted && ++this._eopcnt >= this.pipes.length)
            this.state = types_1.State.ended;
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            let pojo = EOP;
            for (let i = 0; i < this.pipes.length; i++) {
                if (!this.pipes[i].isdone(this)) {
                    pojo = yield this.pipes[i].pop(this);
                    this.setState(pojo);
                    if (pojo !== EOP) {
                        this._count++;
                        return pojo;
                    }
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
        this.locals = {};
        this.id = uuid();
        this._inports = {};
        this._outports = {};
        this._state = types_1.State.idle;
        this._params = {};
        this.decl = decl;
        Object.keys(decl.inputs).forEach(name => this._inports[name] = new InputPort(name, this));
        Object.keys(decl.outputs).forEach(name => this._outports[name] = new OutputPort(name, this));
        this._params = params;
    }
    static register(aclass) {
        REGISTRY[aclass.declaration.gitid] = aclass;
    }
    static getstep(stepid) {
        return REGISTRY[stepid];
    }
    /**
     * start() method may be implemented by heriting classes
     * start() is called for a step at batch ignition
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            // default method do nothing
        });
    }
    /**
     * end() method may be implemented by heriting classes
     * end() is called when step finished process()
     */
    end() {
        return __awaiter(this, void 0, void 0, function* () {
            // default method do nothing
        });
    }
    /**
     * abstract input() method must be implemented by heriting classes
     * input() is called for each received pojo
     * @param inport input port name receiving the pojo
     * @param pojo the received pojo
     */
    input(inport, pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            // default method do nothing with pojos received
        });
    }
    //  
    // process() is called after all data inputs completed
    /**
     * abstract process() method must be implemented by heriting classes
     */
    process() {
        return __awaiter(this, void 0, void 0, function* () {
            // default method do nothing
        });
    }
    get pojo() { return this.pojo; }
    get startdate() { return this._startdate; }
    get enddate() { return this._enddate; }
    get type() { return this.decl.gitid; }
    get paramlist() { return Object.keys(this.decl.parameters); }
    get params() { return this._params; }
    get isidle() { return this._state === types_1.State.idle; }
    get isstarted() { return this._state === types_1.State.started; }
    get isended() { return this._state === types_1.State.ended; }
    get inports() { return Object['values'](this._inports); }
    get outports() { return Object['values'](this._outports); }
    get isinitial() { return this.inports.length === 0; }
    get isfinal() { return this.outports.length === 0; }
    outport(name) { return this._outports[name]; }
    inport(name) { return this._inports[name]; }
    toString() { return `[Step: ${this.decl.gitid}]`; }
    isinport(portname) { return this._inports[portname] ? true : false; }
    isoutport(portname) { return this._outports[portname] ? true : false; }
    port(name) { return this._inports[name] || this._outports[name]; }
    log(message) { console.log(message); }
    error(message) { error(this, message); }
    debug(message) { debug(this, message); }
    inconnected(port) { return this._inports[port].isconnected ? true : false; }
    outconnected(port) { return this._outports[port] ? true : false; }
    /**
     * initialize dynamic step parameter access
     * @param args: arguments map provided by the batch
     * @param globs: globs map provided by the batch
     */
    initparams(args, globs) {
        const paramsfn = {};
        this.paramlist.forEach(name => {
            !(name in this.decl.parameters) && error(this, `unknown parameter "${name}" it must be one of "${toString()}"`);
            paramsfn[name] = paramfunc(this.decl.parameters[name].type, this._params[name] || this.decl.parameters[name].default).bind(this.locals || {});
        });
        this._params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    let paramdef = this.decl.parameters[property.toString()];
                    paramdef || this.error(`unknown parameter "${property.toString()}" used`);
                    const type = types_1.gettype(paramdef.type);
                    return target[property](args, globs, this._params, this._pojo, type);
                }
                catch (e) {
                    error(this, `error when evaluating step parameter "${String(property)}" due to  => \n    "${e.message}" `);
                }
            },
        });
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
     * dry up a port to receive all inputed data through a given port
     * @param port port to dry up
     */
    dryup(port) {
        return __awaiter(this, void 0, void 0, function* () {
            DEBUG && debug(this, `awaiting for input into port "${port.name}" `);
            let pojo = yield port.get();
            if (pojo === EOP)
                return;
            this._pojo = pojo;
            DEBUG && debug(this, `pojo inputed on port "${port.name} pojo ${JSON.stringify(this._pojo).substr(0, 100)}" `);
            yield this.input(port.name, pojo);
            DEBUG && debug(this, `pojo consumed on port "${port.name} pojo ${JSON.stringify(this._pojo).substr(0, 100)}" `);
            return this.dryup(port);
        });
    }
    /**
     * dry up all ports to receive all inputed data through all ports
     * @param port port to dry up
     */
    pump() {
        return __awaiter(this, void 0, void 0, function* () {
            const dryers = this.inports.map(port => this.dryup(port));
            return Promise.all(dryers);
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
        inport.from(outport.pipe);
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
            DEBUG && debug(this, `awaiting for output into port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `);
            yield port.put(pojo);
            DEBUG && debug(this, `pojo outputed on port "${port.name} pojo ${JSON.stringify(pojo).substr(0, 100)}" `);
        });
    }
    exec() {
        return __awaiter(this, void 0, void 0, function* () {
            this._startdate = new Date();
            DEBUG && debug(this, `init phase `);
            yield this.init();
            DEBUG && debug(this, `start phase `);
            yield this.start();
            DEBUG && debug(this, `pump phase `);
            yield this.pump();
            DEBUG && debug(this, `process phase `);
            yield this.process();
            DEBUG && debug(this, `end phase `);
            yield this.end();
            DEBUG && debug(this, `terminate phase `);
            yield this.terminate();
            this._enddate = new Date();
        });
    }
}
exports.Step = Step;
class TestbedOutput extends Step {
    constructor() {
        super(TestbedOutput.declaration, {});
    }
    process() {
        return __awaiter(this, void 0, void 0, function* () {
            // output all the provided pojos for the test
            const data = this.params.dataforinjection;
            for (let outport in this.decl.outputs) {
                if (data[outport]) {
                    for (let i = 0; i < data[outport].length; i++) {
                        const pojo = data[outport][i];
                        yield this.output(outport, pojo);
                    }
                }
            }
        });
    }
}
TestbedOutput.gitid = 'mbenzekri/pojoe/steps/TestbedOutput';
TestbedOutput.declaration = {
    gitid: TestbedOutput.gitid,
    title: 'output test pojos to the tested step',
    desc: 'this step inject all the provided test pojos into the tested step',
    inputs: {},
    outputs: { /* to be dynamicaly created at test initialisation */},
    parameters: {
        'dataforinjection': { default: '${ JSON.stringify(globs.dataforinjection)}', type: 'json', title: 'data to inject into the step' }
    },
};
const TestbedInput_gitid = 'mbenzekri/pojoe/steps/TestbedInput';
const TestbedInput_declaration = {
    gitid: TestbedInput_gitid,
    title: 'get pojos from the tested step and validate',
    desc: 'this step receives all the pojos of the tested step and validate them among the expected data',
    inputs: { /* to be dynamicaly created at test initialisation */},
    outputs: {},
    parameters: {
        'dataforvalidation': { default: '${ JSON.stringify(globs.dataforvalidation)}', type: 'json', title: 'data to inject into the step' }
    },
};
class TestbedInput extends Step {
    constructor() {
        super(TestbedInput_declaration, {});
        this.result = this.inports.reduce((prev, port) => { prev[port.name] = []; return prev; }, {});
    }
    input(inport, pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            this.result[inport].push(pojo);
        });
    }
    process() {
        return __awaiter(this, void 0, void 0, function* () {
            // checks equality with expected pojos 
            const dataval = this.params.dataforvalidation;
            for (let input in dataval) {
                const outputed = this.result[input] || [];
                const expected = dataval[input] || [];
                const isequal = types_1.equals(expected, outputed);
                if (!isequal)
                    this.error(`test failed due to outputed data !== expected data on port "${input}"` +
                        `\n --- EXPECTED: \n${JSON.stringify(expected, undefined, 4)} \n --- OUTPUTED: \n${JSON.stringify(outputed, undefined, 4)} \n`);
            }
        });
    }
}
TestbedInput.gitid = TestbedInput_gitid;
TestbedInput.declaration = TestbedInput_declaration;
Step.register(TestbedOutput);
Step.register(TestbedInput);
class Testbed extends Batch {
    static globs(globs1, globs2) {
        if (globs2) {
            Object.keys(globs2).forEach(name => {
                globs1[name] = globs2[name];
            });
        }
        return globs1;
    }
    static pipes(stepid) {
        const stepmod = REGISTRY[stepid];
        stepmod || error('Testbed', `${stepid} not registered`);
        const outpipes = Object.keys(stepmod.declaration.inputs).map(inport => ({ from: 'testbedoutput', outport: inport, to: 'testtostep', inport: inport }));
        const inpipes = Object.keys(stepmod.declaration.outputs).map(outport => ({ from: 'testtostep', outport: outport, to: 'testbedinput', inport: outport }));
        const outdecl = REGISTRY[TestbedOutput.gitid].declaration;
        const indecl = REGISTRY[TestbedInput_gitid].declaration;
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
            { id: 'testbedinput', gitid: TestbedInput_gitid, params: {} },
        ];
    }
    constructor(testcase) {
        super({
            id: uuid(),
            title: `${testcase.title} =>  Testbed for step : ${testcase.stepid}`,
            desc: `${testcase.title} => Testbed for step : ${testcase.stepid}`,
            args: testcase.args || {},
            globs: Testbed.globs({
                "dataforvalidation": { type: 'json', value: JSON.stringify(testcase.expected), desc: '' },
                "dataforinjection": { type: 'json', value: JSON.stringify(testcase.injected), desc: '' },
            }, testcase.globs),
            steps: Testbed.steps(testcase.stepid, testcase.params),
            pipes: Testbed.pipes(testcase.stepid)
        });
    }
    static run(tests, debug = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const fgred = "\x1b[31m";
            const fggreen = "\x1b[32m";
            const reset = "\x1b[0m";
            const results = [];
            for (let i = 0; i < tests.length; i++) {
                try {
                    const testcase = tests[i];
                    const test = new Testbed(testcase);
                    DEBUG = debug;
                    let tested;
                    yield test.run((steps) => {
                        tested = steps.find(step => step.decl.gitid === testcase.stepid);
                        tested && testcase.onstart && testcase.onstart(tested);
                    });
                    tested && testcase.onend && testcase.onend(tested);
                    results.push(`${fggreen}SUCCESS: test ${tests[i].title}${reset}`);
                }
                catch (e) {
                    results.push(`${fgred}FAILURE: test ${tests[i].title} due to => \n    ${e.message}${reset}`);
                }
            }
            DEBUG = false;
            results.forEach(result => console.log(result));
        });
    }
}
exports.Testbed = Testbed;
//# sourceMappingURL=pojoe.js.map