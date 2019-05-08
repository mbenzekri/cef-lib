import uuid from 'uuid/v4';
import * as path from 'path';

function isfunc(f: any): boolean {
    return (typeof f === 'function')
}

function error(message: string): Error {
    const e = new Error()
    const frame = e.stack.split('\n')[2]
    const line = frame.split(':')[1]
    const func = frame.split(' ')[5]
    const script = path.basename(__filename)
    return new Error(`${func}()@${script}:${line} ${message}`)
}

function bodyfunc(type: string, strvalue:string): string {
    let body = `return \`${strvalue}\``;
    switch (type) {
        case 'int': body = `return parseInt(\`${strvalue}\`,10)`;
            break;
        case 'ints': body = `return (\`${strvalue}\`).split(/,/).map(v => parseInt(v,10))`;
            break;
        case 'number': body = `return parseFloat(\`${strvalue}\`)`;
            break;
        case 'numbers': body = `return (\`${strvalue}\`).split(/,/).map(v => parseFloat(v))`;
            break;
        case 'boolean': body = `return \`${strvalue ? true : false}\` === 'true' `;
            break;
        case 'date': body = `return new Date(\`${strvalue}\`)`;
            break;
        case 'dates': body = `return (\`${strvalue}\`).split(/,/).map(v => new Date(v))`;
            break;
        case 'regexp': body = `return new RegExp(\`${strvalue}\`)`;
            break;
        case 'string': body = `return \`${strvalue}\``;
            break;
        case 'strings': body = `return (\`${strvalue}\`).split(/,/)`;
            break;
    }
    return body;
}

function argfunc(type: string, strvalue:string ): Function  {
    return new Function(bodyfunc(type, strvalue));
}

function globfunc(type: string, strvalue:string ): Function  {
    return new Function('args','globals',bodyfunc(type, strvalue));
}

function paramfunc(type: string, strvalue:string ): Function  {
    return new Function('args','globals','feature',bodyfunc(type, strvalue));
}

const SOF = {};
const EOF = {};

// steps repository déclaration
const DECLARATIONS = {}

enum PortType { input, output, }

enum State { idle, started, ended, }

//enum BaseType { int, ints, number, numbers, boolean, date, dates, regexp, string, strings }
//type BaseType = ('int'|'ints'|'number'|'numbers'|'regexp'|'boolean'|'date'|'dates'|'regexp'|'string'|'strings')

type ParamsMapDef = {
    [key: string]: { desc: string; type: string }
};

type PortsMap = {
    [key: string]: { desc: string }
}

interface DeclObj {
    gitid: string;
    title: string;
    desc: string;
    parameters: ParamsMapDef;
    inputs: PortsMap;
    outputs: PortsMap;
    fields: any[];
}

type ParamsMap = {
    [key: string]: string
}

type TypedParamsMap = { [key: string]: { value: string, type: string,  desc: string } }

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

interface FlowchartObj {
    name: string;
    title: string;
    args: TypedParamsMap;
    globals: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
}

/**
 * class for step declaration
 * use this class to declare a new kind of step for the cloud engine factory
 * @member declobj declaration
 */
class Declaration {

    declobj: DeclObj;

    // create a Declaration object from declaration options
    constructor(declobj: DeclObj) {
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

/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globals globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
class Batch {

    _flowchart: FlowchartObj
    _steps = new Map<string, Step>()
    _starts: Step[] = []
    _feature: any = {}
    _globals: any = {}
    _args: any = {}

    constructor(flowchart: FlowchartObj) {
        this._flowchart = flowchart
        this.initargs()
        this.initglobs()
        Object.freeze(this)
    }
    get batch() { return this._flowchart }
    get steps() { return this._steps }
    get feature() { return this._feature }
    get globals() { return this._globals }
    get args() { return this._args }
    
    private initargs() {
        const argv: any = {};
        // default value in batch declaration
        Object.keys(this._flowchart.args).forEach(name => {
            const type = this._flowchart.args[name].type
            const value = this._flowchart.args[name].value
            argv[name] = argfunc(type,value)
        })
        // then env variables
        Object.keys(this._flowchart.args).forEach(name => {
            if (name in process.env) {
                const type = this._flowchart.args[name].type
                const value =process.env[name]
                argv[name] = argfunc(type,value);
            }
        })
        // then process parameters
        process.argv.forEach((arg, i) => {
            if (i < 2) return; // skip 'node.exe' and 'script.js'
            const [name, value] = arg.replace(/^--?/, '').split(/=/)
            const type = this._flowchart.args[name].type
            if (name in this._flowchart.args) {
                this._args[name] = argfunc(type,value);
            }
        })
        this._args = new Proxy(Object.freeze(argv), {
            get: (target, property) => {
                try {
                    return target[property]();
                } catch (e) {
                    throw error(`${this}: error "${e.message}" when evaluating arg parameter "${String(property)}"`);
                }
            },
        });

    }

    private initglobs() {
        // prepare lazy evaluation of parameters for each feature
        const globals: any = {};
        Object.keys(this._flowchart.globals).forEach(name => {
            const type = this._flowchart.globals[name].type
            const value = this._flowchart.globals[name].value
            globals[name] = globfunc(type,value);
        });

        this._globals = new Proxy(Object.freeze(globals), {
            get: (target, property) => {
                try {
                    return target[property](this._args, this.globals);
                } catch (e) {
                    throw error(`${this}: error "${e.message}" when evaluating global parameter "${String(property)}"`);
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
            const module = require(stepobj.gitid.split(/@/)[1])
            const name = stepobj.gitid.split(/@/)[0]
            const step = new module[name](stepobj.params, this)
            this._steps.set(stepobj.id, step)
        })

        // connect all steps 
        this._flowchart.pipes.forEach(pipeobj => {
            const step = this._steps.get(pipeobj.from) 
            const target = this._steps.get(pipeobj.to) 
            step.pipe(pipeobj.from, pipeobj.to, target, f => true)
        })

        // collect initial steps
        this.steps.forEach((step,id) => {
            const ports = Object.keys(step.ports).map(k => step.ports[k]);
            if (ports.every(port => port.type !== PortType.input)) this._starts.push(step)
        })
    }

    run() {
        // init globals
        this._globals = {};
        // start nodes without predecessor
        this._starts.forEach(step => step.start())
    }
}
/**
 * class defining a port either an input port or an output port
 * port state is first idle
 * port state is started after receiving SOF (start of flow feature)
 * port state is ended after receiving EOF (end of flow feature)
 */
class Port {
    readonly type: PortType;
    readonly name: string;
    readonly step: Step;
    readonly pipes: Pipe[] = [];
    private state: State = State.idle;

    constructor(type: PortType, name: string, step: Step) {
        this.type = type;
        this.name = name;
        this.step = step;
    }

    add(pipe: Pipe) {
        this.pipes.push(pipe);
    }

    output(feature: any) {
        if (this.type !== PortType.output) throw error(`${this}: feature outputed in an input port "${this.name}" `);
        if (feature === SOF && this.state === State.idle) this.state = State.started;
        if (feature === EOF && this.pipes.every(p => p.state === State.ended)) this.state = State.ended;
        this.pipes.forEach(p => p.send(feature));
    }
    input(feature: any) {
        if (this.type !== PortType.input) throw error(`${this}: feature inputed in an output port "${this.name}" `);
        if (feature === SOF && this.state === State.idle) this.state = State.started;
        if (feature === EOF && this.pipes.every(p => p.state === State.ended)) this.state = State.ended;
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
    readonly outport: Port;
    readonly inport: Port;
    readonly filter: Function;
    private _state: State = State.idle;

    /**
     * Pipe constructor
     * @param outport: port from which data is outputed
     * @param inport: port from which data is outputed
     * @param filter: filtering object to filter flowing data
     */
    constructor(outport: Port, inport: Port, filter: Function) {
        this.outport = outport;
        this.inport = inport;
        this.filter = filter;
        this._state = State.idle;
    }

    get state() { return this._state }
    /**
     * flow data through this pipe
     * @param feature send feature from this.outport to this.inport
     */
    send(feature) {
        if (this._state === State.idle) this._state = State.started
        if (feature === EOF) return this._state = State.ended
        if (!this.filter || this.filter(feature)) this.inport.input(feature)
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
abstract class Step {

    id = uuid();
    decl: Declaration;
    pipes: Pipe[] = [];
    ports: { [key: string]: Port } = {};
    binds: { [key: string]: Function } = {};
    feature: any;
    state = State.idle;
    params: any = {}

    // abstract start() method must be implemented by heriting classes 
    // start() is called for a step at batch ignition time when step have no input port
    // start() is called when step receive first feature (SOF) from one of its input port
    abstract start():void

    // abstract end() method must be implemented by heriting classes 
    // end() is called when step receive last feature (EOF) from all of its input port
    abstract end():void

    /**
     * constructor
     * @param decl declaration object for the step
     * @param params parameters expressions for the step
     * @param batch the batch containing this step
     */
    protected constructor(decl: Declaration, params: ParamsMap, batch: Batch) {
        this.decl = decl

        Object.keys(decl.inputs).forEach(name => {
            this.ports[name] = new Port(PortType.input, name, this);
        })
        Object.keys(decl.outputs).forEach(name => {
            this.ports[name] = new Port(PortType.output, name, this);
        })

        const paramsfn = {}
        Object.keys(params).forEach(name => {
            paramsfn[name] = paramfunc(this.decl.parameters[name].type, params[name])
        })

        this.params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    return target[property](batch.args, batch.globals, this.feature);
                } catch (e) {
                    throw error(`${this}: error "${e.message}" when evaluating step parameter "${String(property)}"`);
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

    log(message: string) {
        console.log(message)
    }
    /**
     * bind an input port name to a callback method that will be called to receive input features
     * @param {string} inport: the input port name to bind with the method
     * @param {function} method: a method to call for each inputed feature
     */

    bind(inport, method) {
        if (!this.isinport(inport)) throw error(`${this}: unknown input port "${inport}".`);
        if (!isfunc(method)) throw error(`${this}: method argument is not a function "${method}"`);
        this.binds[inport] = method;
    }

    /**
     * method to connect this step with a data pipe
     * @param outport name of the output port in this step
     * @param inport name of the input port in the target step
     * @param target target step of the pipe (where data flow)
     * @param filter filter function for flowing data
     */
    pipe(outport: string, inport: string, target: Step, filter: (f) => boolean = f => true) {
        if (!this.ports[outport]) throw error(`${this}: unknown output port  "${outport}".`);
        if (!this.ports[inport]) throw error(`${this}: unknown input port  "${inport}".`);
        const pipe = new Pipe(this.ports[outport], this.ports[inport], filter);
        this.ports[outport].add(pipe);
        target.ports[inport].add(pipe);
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
    close(name: string) {
        if (this.ports[name]) this.ports[name].output(EOF)
    }

    /**
     * method to declare output starting throw the corresponding port
     * @param name: a port name
     */
    open(name: string) {
        if (this.ports[name]) this.ports[name].output(SOF)
    }

    /**
     * method to output a feature throw the corresponding port
     * @param {*} port: a port name
     * @param {*} feature: the feature to output
     */
    output(outport: string, feature: any) {
        if (!this.isoutport(outport)) throw error(`${this}: unknown output port  "${outport}".`);
        this.ports[outport].output(feature)
    }

    input(inport: string, feature: any) {
        this.feature = feature;
        if (!this.isinport(inport)) throw error(`${this}: unknown input port  "${inport}".`);
        if (typeof this[`input_${inport}`] !== 'function') throw error(`${this}: method "input_${inport}" not implemented.`);
        this[`input_${inport}`](feature);
    }
}


// classe pour la représentation mémoire du graphe de flux lors de l'affichage UI et la représentation disque du Process (scripts.cep) (Node/Link)
/*
class Design {
    constructor(cepfile = null) {
        if (cepfile) {
            this.parse(cepfile);
        } else {
            this.id = uuid();
            this.decl = {};
            this.nodes = [];
            this.links = [];
        }
    }

    linkTo(output, toinput, node, filter) {
        this.link.push(new Link());
    }
}

class Filter {

}

class Node {
    constructor(decl) {
        this.id = uuid();
        this.decl = decl;
        this.links = [];
    }
    linkTo(output, toinput, node, filter) {
        this.link.push(new Link());
    }

}
class Link {
    constructor(fromoutput, fromnode, toinput, tonode, filter) {
        this.id = uuid();
        this.fromoutput = fromoutput;
        this.fromstep = fromstep;
        this.toinput = toinput;
        this.tostep = tostep;
        this.filter = filter;
    }
}
*/

export {
    Declaration, Batch, Step, ParamsMap,
};
