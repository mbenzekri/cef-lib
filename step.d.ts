declare enum PortType {
    input = 0,
    output = 1
}
declare enum State {
    idle = 0,
    started = 1,
    ended = 2
}
declare type ParamsMapDef = {
    [key: string]: {
        desc: string;
        type: string;
    };
};
declare type PortsMap = {
    [key: string]: {
        desc: string;
    };
};
declare type Declaration = {
    gitid: string;
    title: string;
    desc: string;
    parameters: ParamsMapDef;
    inputs: PortsMap;
    outputs: PortsMap;
    fields: any[];
};
declare type ParamsMap = {
    [key: string]: string;
};
declare type TypedParamsMap = {
    [key: string]: {
        value: string;
        type: string;
        desc: string;
    };
};
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
declare type Flowchart = {
    name: string;
    title: string;
    args: TypedParamsMap;
    globals: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
};
/**
 * class for step declaration
 * use this class to declare a new kind of step for the cloud engine factory
 * @member declobj declaration
 */
/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globals globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
declare class Batch {
    private _flowchart;
    private _steps;
    private _globals;
    private _args;
    constructor(flowchart: Flowchart);
    readonly flowchart: Flowchart;
    readonly steps: Map<string, Step>;
    readonly globals: any;
    readonly args: any;
    /**
     * the toString() legacy method
     */
    toString(): string;
    private initargs;
    private initglobs;
    /**
     * method to add a step to this batch
     * @param {Step} step: a step to add to this batch
     */
    private initsteps;
    run(): void;
}
/**
 * class defining a port either an input port or an output port
 * port state is first idle
 * port state is started after receiving SOF (start of flow feature)
 * port state is ended after receiving EOF (end of flow feature)
 */
declare class Port {
    readonly type: PortType;
    readonly name: string;
    readonly step: Step;
    readonly pipes: Pipe[];
    private state;
    constructor(type: PortType, name: string, step: Step);
    readonly isinport: boolean;
    readonly isoutport: boolean;
    readonly isstarted: boolean;
    readonly isended: boolean;
    readonly isidle: boolean;
    add(pipe: Pipe): void;
    output(feature: any): void;
    input(feature: any): void;
}
/**
 * class representing link between two ports during execution phase
 * data flow through pipes from outport to inport
 * @member outport port from which data is outputed
 * @member inport: port from which data is inputed
 * @member filter: filtering function
 * @member state: execution state of the pipe (idle, started, ended)
 */
declare class Pipe {
    readonly outport: Port;
    readonly inport: Port;
    readonly filter: Function;
    private _state;
    /**
     * Pipe constructor
     * @param outport: port from which data is outputed
     * @param inport: port from which data is outputed
     * @param filter: filtering object to filter flowing data
     */
    constructor(outport: Port, inport: Port, filter: Function);
    readonly state: State;
    /**
     * flow data through this pipe
     * @param feature send feature from this.outport to this.inport
     */
    send(feature: any): State;
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
declare abstract class Step {
    readonly id: any;
    readonly decl: Declaration;
    private ports;
    private feature;
    private state;
    private params;
    abstract start(): void;
    abstract end(): void;
    /**
     * constructor
     * @param decl declaration object for the step
     * @param params parameters expressions for the step
     * @param batch the batch containing this step
     */
    protected constructor(decl: Declaration, params: ParamsMap, batch: Batch);
    readonly isidle: boolean;
    readonly isstarted: boolean;
    readonly isended: boolean;
    readonly inports: Port[];
    readonly outports: Port[];
    readonly isinitial: any;
    readonly isfinal: any;
    toString(): string;
    isinport(port: any): boolean;
    isoutport(port: any): boolean;
    port(name: string): Port;
    log(message: string): void;
    /**
     * method to connect this step with a data pipe
     * @param outport name of the output port in this step
     * @param inport name of the input port in the target step
     * @param target target step of the pipe (where data flow)
     * @param filter filter function for flowing data
     */
    pipe(outport: Port, inport: Port, filter?: (f: any) => boolean): void;
    /**
     * method to declare output termination throw the corresponding port
     * @param name: a port name
     */
    close(name: string): void;
    /**
     * method to declare output starting throw the corresponding port
     * @param name: a port name
     */
    open(name: string): void;
    /**
     * method to output a feature throw the corresponding port
     * @param {*} port: a port name
     * @param {*} feature: the feature to output
     */
    output(outport: string, feature: any): void;
    input(inport: string, feature: any): void;
}
export { Declaration, Flowchart, Batch, Step, ParamsMap, };
