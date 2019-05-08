"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
const path = require("path");
function isfunc(f) {
    return (typeof f === 'function');
}
function error(obj, message) {
    const e = new Error();
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '');
    const items = frame.split(':');
    const line = (items.length > 1) ? items[items.length - 2] : '-';
    const script = path.basename(__filename);
    return new Error(`${script}@${line}: ${obj.toString()} => ${message}`);
}
function bodyfunc(type, strvalue) {
    let body = `return \`${strvalue}\``;
    switch (type) {
        case 'int':
            body = `return parseInt(\`${strvalue}\`,10)`;
            break;
        case 'ints':
            body = `return (\`${strvalue}\`).split(/,/).map(v => parseInt(v,10))`;
            break;
        case 'number':
            body = `return parseFloat(\`${strvalue}\`)`;
            break;
        case 'numbers':
            body = `return (\`${strvalue}\`).split(/,/).map(v => parseFloat(v))`;
            break;
        case 'boolean':
            body = `return \`${strvalue ? true : false}\` === 'true' `;
            break;
        case 'date':
            body = `return new Date(\`${strvalue}\`)`;
            break;
        case 'dates':
            body = `return (\`${strvalue}\`).split(/,/).map(v => new Date(v))`;
            break;
        case 'regexp':
            body = `return new RegExp(\`${strvalue}\`)`;
            break;
        case 'string':
            body = `return \`${strvalue}\``;
            break;
        case 'strings':
            body = `return (\`${strvalue}\`).split(/,/)`;
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
    return new Function('args', 'globals', 'feature', bodyfunc(type, strvalue));
}
const SOF = {};
const EOF = {};
// steps repository déclaration
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
})(State || (State = {}));
/**
 * class for step declaration
 * use this class to declare a new kind of step for the cloud engine factory
 * @member declobj declaration
 */
class Declaration {
    // create a Declaration object from declaration options
    constructor(declobj) {
        this.declobj = declobj;
        DECLARATIONS[this.gitid] = this;
    }
    // get step id (universal through / github )
    get gitid() { return this.declobj.gitid; }
    // get step name
    get name() { return this.declobj.gitid.split(/@/)[0]; }
    // get github repo
    get repository() { return this.declobj.gitid.split(/@/)[1]; }
    // get step title
    get title() { return this.declobj.title; }
    // get step description
    get desc() { return this.declobj.desc; }
    // get step fields description (ngx-formly fields)
    get fields() { return this.declobj.fields; }
    // get step inputs
    get inputs() { return this.declobj.inputs; }
    // get step outputs
    get outputs() { return this.declobj.outputs; }
    // get step parameters
    get parameters() { return this.declobj.parameters; }
}
exports.Declaration = Declaration;
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
        this._starts = [];
        this._feature = {};
        this._globals = {};
        this._args = {};
        this._flowchart = flowchart;
    }
    get batch() { return this._flowchart; }
    get steps() { return this._steps; }
    get feature() { return this._feature; }
    get globals() { return this._globals; }
    get args() { return this._args; }
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
                    throw error(this, `error "${e.message}" when evaluating arg parameter "${String(property)}"`);
                }
            },
        });
    }
    initglobs() {
        // prepare lazy evaluation of parameters for each feature
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
                    throw error(this, `error "${e.message}" when evaluating global parameter "${String(property)}"`);
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
            const items = stepobj.gitid.split('@');
            let module;
            try {
                module = require(items[0]);
            }
            catch (e) {
                const modpath = process.env.CEF_PATH + '/' + items[0];
                module = require(modpath);
            }
            const account = items[1];
            const step = module.create(stepobj.params, this);
            this._steps.set(stepobj.id, step);
        });
        // connect all steps 
        this._flowchart.pipes.forEach((pipeobj, i) => {
            const step = this._steps.get(pipeobj.from);
            if (!step)
                throw error(this, `unknown from step "${pipeobj.from}" in flowchart pipes no ${i}`);
            const target = this._steps.get(pipeobj.to);
            if (!target)
                throw error(this, `unknown to step "${pipeobj.to}" in flowchart pipes no ${i}`);
            const outport = step.ports[pipeobj.outport];
            if (!outport)
                throw error(this, `unknown outport "${pipeobj.outport}" in flowchart pipes no ${i}`);
            const inport = target.ports[pipeobj.inport];
            if (!inport)
                throw error(this, `unknown inport "${pipeobj.inport}" in flowchart pipes no ${i}`);
            step.pipe(outport, inport, (f) => f);
        });
        // collect initial steps
        this.steps.forEach((step, id) => {
            const ports = Object.keys(step.ports).map(k => step.ports[k]);
            if (ports.every(port => port.type !== PortType.input))
                this._starts.push(step);
        });
    }
    run() {
        // start nodes without predecessor
        try {
            this.initargs();
            this.initglobs();
            this.initsteps();
            Object.freeze(this);
            this._starts.forEach(step => step.start());
        }
        catch (e) {
            console.error(`Error: ${e.message}`);
        }
    }
}
exports.Batch = Batch;
/**
 * class defining a port either an input port or an output port
 * port state is first idle
 * port state is started after receiving SOF (start of flow feature)
 * port state is ended after receiving EOF (end of flow feature)
 */
class Port {
    constructor(type, name, step) {
        this.pipes = [];
        this.state = State.idle;
        this.type = type;
        this.name = name;
        this.step = step;
    }
    add(pipe) {
        this.pipes.push(pipe);
    }
    output(feature) {
        if (this.type !== PortType.output)
            throw error(this, `feature outputed in an input port "${this.name}" `);
        if (feature === SOF && this.state === State.idle)
            this.state = State.started;
        if (feature === EOF && this.pipes.every(p => p.state === State.ended))
            this.state = State.ended;
        this.pipes.forEach(p => p.send(feature));
    }
    input(feature) {
        if (this.type !== PortType.input)
            throw error(this, `feature inputed in an output port "${this.name}" `);
        if (feature === SOF && this.state === State.idle)
            this.state = State.started;
        if (feature === EOF && this.pipes.every(p => p.state === State.ended))
            this.state = State.ended;
        this.step.input(this.name, feature);
    }
}
/**
 * class representing link between two ports during execution phase
 * data flow through pipes from outport to in port
 * @member outport port from which data is outputed
 * @member inport: port from which data is inputed
 * @member filter: filtering object
 * @member state: execution state of the pipe (idle, started, ended)
 */
class Pipe {
    /**
     * Pipe constructor
     * @param outport: port from which data is outputed
     * @param inport: port from which data is outputed
     * @param filter: filtering object to filter flowing data
     */
    constructor(outport, inport, filter) {
        this._state = State.idle;
        this.outport = outport;
        this.inport = inport;
        this.filter = filter;
        this._state = State.idle;
    }
    get state() { return this._state; }
    /**
     * flow data through this pipe
     * @param feature send feature from this.outport to this.inport
     */
    send(feature) {
        if (this._state === State.idle)
            this._state = State.started;
        if (feature === EOF)
            return this._state = State.ended;
        if (!this.filter || this.filter(feature))
            this.inport.input(feature);
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
 * @property feature : current feature (available after first input)
 * @property params : parameters (dynamic see Proxy in constructor)
 */
class Step {
    /**
     * constructor
     * @param decl declaration object for the step
     * @param params parameters expressions for the step
     * @param batch the batch containing this step
     */
    constructor(decl, params, batch) {
        this.id = uuid();
        this.pipes = [];
        this.ports = {};
        this.binds = {};
        this.state = State.idle;
        this.params = {};
        this.decl = decl;
        Object.keys(decl.inputs).forEach(name => {
            this.ports[name] = new Port(PortType.input, name, this);
        });
        Object.keys(decl.outputs).forEach(name => {
            this.ports[name] = new Port(PortType.output, name, this);
        });
        const paramsfn = {};
        Object.keys(params).forEach(name => {
            if (name in this.decl.parameters) {
                paramsfn[name] = paramfunc(this.decl.parameters[name].type, params[name]);
            }
            else {
                throw error(this, `parameter "${name}" unknown must be one of "${Object.keys(this.decl.parameters).toString()}"`);
            }
        });
        this.params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    return target[property](batch.args, batch.globals, this.feature);
                }
                catch (e) {
                    throw error(this, `error "${e.message}" when evaluating step parameter "${String(property)}"`);
                }
            },
        });
    }
    /**
     * the toString() legacy method
     */
    toString() { return `[${this.decl.name} / ${this.id}]`; }
    /**
     * check for an input port name existance
     */
    isinport(port) { return this.ports[port] && this.ports[port].type === PortType.input; }
    /**
     * check for an output port name existance
     */
    isoutport(port) { return this.ports[port] && this.ports[port].type === PortType.output; }
    log(message) {
        console.log(message);
    }
    /**
     * bind an input port name to a callback method that will be called to receive input features
     * @param {string} inport: the input port name to bind with the method
     * @param {function} method: a method to call for each inputed feature
     */
    bind(inport, method) {
        if (!this.isinport(inport))
            throw error(this, `unknown input port "${inport}".`);
        if (!isfunc(method))
            throw error(this, `method argument is not a function "${method}"`);
        this.binds[inport] = method;
    }
    /**
     * method to connect this step with a data pipe
     * @param outport name of the output port in this step
     * @param inport name of the input port in the target step
     * @param target target step of the pipe (where data flow)
     * @param filter filter function for flowing data
     */
    pipe(outport, inport, filter = f => true) {
        const pipe = new Pipe(outport, inport, filter);
        outport.add(pipe);
        inport.add(pipe);
    }
    /**
     * set typedef for an output port
     * @param {*} name: output a port name
     * @param {*} typedef: type definition for features to be outputed
     */
    // type(port, typedef) {
    //     if (this.ports[port]) this.ports[port].type(typedef);
    // }
    /**
     * method to declare output termination throw the corresponding port
     * @param name: a port name
     */
    close(name) {
        if (this.ports[name])
            this.ports[name].output(EOF);
    }
    /**
     * method to declare output starting throw the corresponding port
     * @param name: a port name
     */
    open(name) {
        if (this.ports[name])
            this.ports[name].output(SOF);
    }
    /**
     * method to output a feature throw the corresponding port
     * @param {*} port: a port name
     * @param {*} feature: the feature to output
     */
    output(outport, feature) {
        if (!this.isoutport(outport))
            throw error(this, `unknown output port  "${outport}".`);
        this.ports[outport].output(feature);
    }
    input(inport, feature) {
        this.feature = feature;
        if (!this.isinport(inport))
            throw error(this, `unknown input port  "${inport}".`);
        if (typeof this[`input_${inport}`] !== 'function')
            throw error(this, `method "input_${inport}" not implemented.`);
        this[`input_${inport}`](feature);
    }
}
exports.Step = Step;
//# sourceMappingURL=step.js.map