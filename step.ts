import * as uuid from 'uuid/v4'
import * as path from 'path';

function error(obj: any, message: string): any {
    const e = new Error()
    const frame = e.stack.split('\n')[2].replace(/^[^\(]*\(/, '').replace(/\)[^\)]*/, '').split(':')
    const line = (frame.length > 1) ? frame[frame.length - 2] : '-'
    const script = path.basename(__filename)
    throw new Error(`${script}@${line}: ${obj.toString()} => ${message}`)
}

function bodyfunc(type: string, strvalue: string): string {
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

function argfunc(type: string, strvalue: string): Function {
    return new Function(bodyfunc(type, strvalue));
}

function globfunc(type: string, strvalue: string): Function {
    return new Function('args', 'globals', bodyfunc(type, strvalue));
}

function paramfunc(type: string, strvalue: string): Function {
    return new Function('args', 'globals', 'params','feature', bodyfunc(type, strvalue));
}

const SOF = {};
const EOF = {};

// steps registry
const DECLARATIONS = {}

enum PortType { input, output, }

enum State { idle, started, ended, }

//enum BaseType { int, ints, number, numbers, boolean, date, dates, regexp, string, strings }
//type BaseType = ('int'|'ints'|'number'|'numbers'|'regexp'|'boolean'|'date'|'dates'|'regexp'|'string'|'strings')

type ParamsMapDef = { [key: string]: { desc: string; type: string } };
type PortsMap = { [key: string]: { desc: string } }

type Declaration =  {
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
 * class for step declaration
 * use this class to declare a new kind of step for the cloud engine factory
 * @member declobj declaration
 */
// class Declaration {

//     declobj: DeclObj;

//     // create a Declaration object from declaration options
//     constructor(declobj: DeclObj) {
//         this.declobj = declobj;
//         DECLARATIONS[this.gitid] = this;
//     }

//     // get step id (universal through / github )
//     get gitid() { return this.declobj.gitid; }

//     // get step name
//     get name() { return this.declobj.gitid.split(/@/)[0]; }

//     // get github repo
//     get repository() { return this.declobj.gitid.split(/@/)[1]; }

//     // get step title
//     get title() { return this.declobj.title; }

//     // get step description
//     get desc() { return this.declobj.desc; }

//     // get step fields description (ngx-formly fields)
//     get fields() { return this.declobj.fields; }

//     // get step inputs
//     get inputs() { return this.declobj.inputs; }

//     // get step outputs
//     get outputs() { return this.declobj.outputs; }

//     // get step parameters
//     get parameters() { return this.declobj.parameters; }
// }

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
        // prepare lazy evaluation of parameters for each feature
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
            const items = stepobj.gitid.split('@')
            let module;
            try {
                module = require(items[0])
            } catch (e) {
                const modpath = process.env.CEF_PATH + '/' + items[0]
                module = require(modpath)
            }
            const step = module.create(stepobj.params, this)
            this._steps.set(stepobj.id, step)
        })

        // connect all steps 
        this._flowchart.pipes.forEach((pipeobj, i) => {
            const step = this._steps.get(pipeobj.from) || error(this, `unknown from step "${pipeobj.from}" in flowchart pipes no ${i}`);
            const target = this._steps.get(pipeobj.to) || error(this, `unknown to step "${pipeobj.to}" in flowchart pipes no ${i}`);
            const outport = step.port(pipeobj.outport) || error(this, `unknown outport "${pipeobj.outport}" in flowchart pipes no ${i}`);
            const inport = target.port(pipeobj.inport) || error(this, `unknown inport "${pipeobj.inport}" in flowchart pipes no ${i}`);
            step.pipe(outport, inport, (f: any) => f)
        })
    }

    run() {
        // start nodes without predecessor
        try {
            this.initargs()
            this.initglobs()
            this.initsteps()
            Object.freeze(this)
            // collect initial steps
            this.steps.forEach((step) =>  step.isinitial && step.start() )
        } catch (e) {
            console.error(`Error: ${e.message}`)
        }
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

    get isinport() { return this.type === PortType.input }
    get isoutport() { return this.type === PortType.output }
    get isstarted() { return this.state === State.started }
    get isended() { return this.state === State.ended }
    get isidle() { return this.state === State.idle }

    add(pipe: Pipe) {
        this.pipes.push(pipe);
    }

    output(feature: any) {
        !this.isoutport || error(this, `feature outputed in an input port "${this.name}" `);
        if (feature === SOF && this.state === State.idle) this.state = State.started;
        if (feature === EOF && this.pipes.every(p => p.state === State.ended)) this.state = State.ended;
        this.pipes.forEach(p => p.send(feature));
    }
    input(feature: any) {
        !this.isinport || error(this, `feature inputed in an output port "${this.name}" `);
        if (feature === SOF && this.state === State.idle) this.state = State.started;
        if (feature === EOF && this.pipes.every(p => p.state === State.ended)) this.state = State.ended;
        this.step.input(this.name, feature);
    }
}

/**
 * class representing link between two ports during execution phase
 * data flow through pipes from outport to inport
 * @member outport port from which data is outputed
 * @member inport: port from which data is inputed
 * @member filter: filtering function
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

    readonly id = uuid()
    readonly decl: Declaration
    private ports: { [key: string]: Port } = {}
    private feature: any
    private state = State.idle
    readonly params: any = {}

    // abstract start() method must be implemented by heriting classes 
    // start() is called for a step at batch ignition time when step have no input port
    // start() is called when step receive first feature (SOF) from one of its input port
    abstract start(): void

    // abstract end() method must be implemented by heriting classes 
    // end() is called when step receive last feature (EOF) from all of its input port
    abstract end(): void

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
            if (name in this.decl.parameters) {
                paramsfn[name] = paramfunc(this.decl.parameters[name].type, params[name])
            } else {
                throw error(this, `parameter "${name}" unknown must be one of "${Object.keys(this.decl.parameters).toString()}"`);
            }
        });

        this.params = new Proxy(paramsfn, {
            get: (target, property) => {
                try {
                    return target[property](batch.args, batch.globals, this.params, this.feature);
                } catch (e) {
                    throw error(this, `error "${e.message}" when evaluating step parameter "${String(property)}"`);
                }
            },
        });
    }

    get isidle(): boolean { return this.state === State.idle }
    get isstarted(): boolean { return this.state === State.started }
    get isended(): boolean { return this.state === State.ended }
    get inports(): Port[] { return Object["values"](this.ports).filter(p => p.isinport) }
    get outports(): Port[] { return Object["values"](this.ports).filter(p => p.isoutport) }
    get isinitial() { return Object["values"](this.ports).every(p => p.type !== PortType.input) }
    get isfinal() { return Object["values"](this.ports).every(p => p.type !== PortType.output) }
    toString() { return `[${this.decl.gitid} / ${this.id}]`; }
    isinport(port) { return this.ports[port] && this.ports[port].type === PortType.input; }
    isoutport(port) { return this.ports[port] && this.ports[port].type === PortType.output; }
    port(name: string): Port { return this.ports[name] }
    log(message: string) { console.log(message) }

    /**
     * method to connect this step with a data pipe
     * @param outport name of the output port in this step
     * @param inport name of the input port in the target step
     * @param target target step of the pipe (where data flow)
     * @param filter filter function for flowing data
     */
    pipe(outport: Port, inport: Port, filter: (f: any) => boolean = f => true) {
        const pipe = new Pipe(outport, inport, filter);
        outport.add(pipe);
        inport.add(pipe);
    }
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
        if (!this.isoutport(outport)) throw error(this, `unknown output port  "${outport}".`);
        this.ports[outport].output(feature)
    }

    input(inport: string, feature: any) {
        this.feature = feature;
        if (!this.isinport(inport)) throw error(this, `unknown input port  "${inport}".`);
        switch(feature) {
            case SOF: 
                // if start of flow and state idle start this step (change state)
                if (!this.isidle) return
                this.state = State.started;
                this.start();
            break
            case EOF:
                // if end of flow and state idle start this step (change state)
                if (!this.isstarted) return
                if (!this.outports.every(p => p.isended)) return
                this.state = State.ended;
                this.end();
            break
            default:
                if (typeof this[`input_${inport}`] !== 'function') throw error(this, `method "input_${inport}" not implemented.`);
                this[`input_${inport}`](feature);
        }
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
    Declaration, Flowchart, Batch, Step, ParamsMap,
};
