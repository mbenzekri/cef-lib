import uuid from 'uuid/v4';

const DECLARATIONS = {};

// Step class declaration
// use this class to declare a new kind of step for the cloud engine factory
// classe pour la déclarations des types de Steps
/**
 * @property {object} declaration
 */
class Declaration {
    // create a Declaration object from declaration options
    constructor(declaration) {
        this.declaration = declaration;
        DECLARATIONS[this.gitid] = this;
    }

    // get step id (universal through / github )
    get gitid() { return this.options.gitid; }

    // get step name
    get name() { return this.options.gitid.split(/@/)[0]; }

    // get github repo
    get repository() { return this.options.gitid.split(/@/)[1]; }

    // get step title
    get title() { return this.options.title; }

    // get step description
    get desc() { return this.options.desc; }

    // get step fields description (ngx-formly fields)
    get fields() { return this.options.fields; }

    // get step inputs
    get inputs() { return this.options.inputs; }

    // get step outputs
    get outputs() { return this.options.outputs; }
}

/**
 * class defining a batch to run
 */
class Batch {
    constructor(cebjson) {
        this.batch = cebjson;
        this.steps = {};
        this.globals = {};
    }

    /**
     * method to add a step to this batch
     * @param {Step} step: a step to add to this batch
     */
    add(step) {
        this.steps.push(step);
    }

    /**
     * method to be called after all steps creation
     */
    connect() {
        this.steps.forEach(step => step.connect());
    }

    run() {
        // init globals
        this.globals = {};
        // start nodes without predecessor
        // wait for temination
    }
}

class Port {
    constructor(type, name, step) {
        this.type = type;
        this.name = name;
        this.step = step;
        this.pipes = [];
    }

    add(pipe) {
        this.pipes.push(pipe);
    }
}

Port.TYPE_INPUT = 'input';
Port.TYPE_OUTPUT = 'output';

const PipeState = {
    idle: 'idle',
    started: 'started',
    ended: 'ended',
};

/**
 * class representing link between two ports during execution phase
 * data flow through pipes from outport to in port
 * @property {Port} outport: port from which data is outputed
 * @property {Port} inport: port from which data is inputed
 * @property {Filter} filter: filtering object
 * @property {PipeState} state: execution state of the pipe (idle, started, ended)
 */
class Pipe {
    /**
     * Pipe constructor
     * @param {*} outport: port from which data is outputed
     * @param {*} inport: port from which data is outputed
     * @param {*} filter: filtering object to filter flowing data
     */
    constructor(outport, inport, filter) {
        this.outport = outport;
        this.inport = inport;
        this.filter = filter;
        this.state = PipeState.idle;
    }

    /**
     * flow data through this pipe
     * @param {object} feature: send feature from this.outport to this.inport
     */
    send(feature) {
        if (this.state === PipeState.idle) this.start();
        if (!this.filter || this.filter(feature)) this.inport.input(this.toport, feature);
    }

    /**
     * initialise pipe flow
     */
    start() {
        this.state = PipeState.started;
        this.inport.pipeStarted(this);
    }

    /**
     * terminate pipe flow
     */
    end() {
        this.state = PipeState.started;
        this.inport.pipeEnded(this);
    }
}

/**
 * extend this class to define the behavior of a new kind of step for the cloud batch
 * this class is used during execution time to process each step
 * @property {string} id : step id
 * @property {Declaration} decl : the step declaration
 * @property {Batch} batch : the batch containing this step
 * @property {Pipe[]} pipes : pipes output of this step
 * @property {Port[]} ports : input/output ports of this step
 * @property {object} feature : current feature (available after first input)
 * @property {object} params : parameters (dynamic see Proxy in constructor)
 */
class Step {
    /**
     * constructor
     * @param {Declaration} decl declaration object for the step
     * @param {object} params parameters expressions for the step
     * @param {Batch} batch the batch containing this step
     */
    constructor(decl, params, batch) {
        this.id = uuid();
        this.decl = decl;
        this.batch = batch;
        this.pipes = [];
        this.ports = {};
        this.feature = null;
        this.decl.inputs.key().forEach((port) => {
            this.ports[port] = new Port(Port.TYPE_INPUT, port, this);
        });
        this.decl.outputs.key().forEach((port) => {
            this.ports[port] = new Port(Port.TYPE_OUTPUT, port, this);
        });

        // add this step to the batch
        this.batch.add(this);

        // prepare lazy evaluation of parameters for each feature
        const paramsfn = Object.keys(params).reduce((cur, prev) => {
            let body;
            switch (this.decl.parameters[cur].type) {
                case 'int': body = `return parseInt(\`${params[cur]}\`,10)`;
                    break;
                case 'number': body = `return parseFloat(\`${params[cur]}\`)`;
                    break;
                case 'boolean': body = `return (\`${params[cur]}\` === 'true')`;
                    break;
                case 'date': body = `return new Date(\`${params[cur]}\`)`;
                    break;
                case 'regexp': body = `return new RegExp(\`${params[cur]}\`)`;
                    break;
                case 'string[]': body = `return (\`${params[cur]}\`).split(/,/)`;
                    break;
                default: body = `return \`${params[cur]}\``;
            }
            // eslint-disable-next-line no-new-func, no-param-reassign
            prev[cur] = new Function('feature', 'globals', 'params', body);
            return prev;
        }, {});
        this.params = new Proxy(paramsfn, {
            get: (target, property) => {
                if (property in this.params) throw new Error(`step: '${this.name}' unknown parameter '${property}' during parameter evam`);
                try {
                    return target[property](this.feature, this.global, this.params);
                } catch (e) {
                    throw new Error(`step: '${this.name}' error "${e.message}" evaluating parameter '${property}' `);
                }
            },
        });
    }

    /**
     * method to connect this step with a data pipe
     * @param {string} outport name of the output port in this step
     * @param {string} inport name of the input port in the target step
     * @param {Step} target target step of the pipe (where data flow)
     * @param {function} filter filter function for flowing data
     */
    pipe(outport, inport, target, filter) {
        // check if outport and inport are correct
        const oport = this.ports[outport];
        if (!oport || oport.type !== Port.TYPE_OUTPUT) throw new Error(`step: '${this.name}' port '${outport}' not a output port type`);
        const iport = this.ports[inport];
        if (!iport || iport.type !== Port.TYPE_INPUT) throw new Error(`step: '${this.name}' port '${inport}' not a input port type`);
        const pipe = new Pipe(iport, filter);
        this.ports[outport].add(pipe);
        target.ports[outport].add(pipe);
    }

    // use this method to declare output terminated throw the corresponding port
    terminated(port) {
        if (this.ports[port]) this.ports[port].terminated();
    }

    // use this method to declare output started throw the corresponding port
    started(port) {
        if (this.ports[port]) this.ports[port].started();
    }

    // use this method to output a feature throw the corresponding port
    output(port, feature) {
        if (this.ports[port]) this.ports[port].output(feature);
    }

    // this method is called for an input starting throw the corresponding port
    start(port) {
        if (!(port in this.inputs)) throw (new Error('unknown input entry in $() input() method must be implemented by your Step class definition'));
        if (typeof this[`start_${port}`] !== 'function') throw (new Error(`method start_${port}() must be implemented by your Step definition `));
        this[`start_${port}`]();
    }

    // this method is called for an input terliated throw the corresponding port
    terminate(port) {
        this[`terminate_${port}`]();
    }

    input(port, feature) {
        this.feature = feature;
        if (!(port in this.inputs)) throw (new Error('unknown input entry in $() input() method must be implemented by your Step class definition'));
        if (typeof this[`input_${port}`] !== 'function') throw (new Error('input() method must be implemented by your Step class definition'));
        this[`input_${port}`](feature);
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
    Declaration, Batch, Port, Step, Pipe,
};
