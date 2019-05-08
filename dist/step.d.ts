declare enum PortType {
    input = 0,
    output = 1
}
declare enum State {
    idle = 0,
    started = 1,
    ended = 2
}
declare enum BaseType {
    int = 0,
    ints = 1,
    number = 2,
    numbers = 3,
    boolean = 4,
    date = 5,
    dates = 6,
    regexp = 7,
    string = 8,
    strings = 9
}
declare type ParametersMap = {
    [key: string]: {
        desc: string;
        type: BaseType;
    };
};
declare type PortsMap = {
    [key: string]: {
        desc: string;
    };
};
interface DeclObj {
    gitid: string;
    title: string;
    desc: string;
    parameters: ParametersMap;
    inputs: PortsMap;
    outputs: PortsMap;
    fields: any[];
}
declare type ParamsMap = {
    [key: string]: string;
};
declare type TypedParamsMap = {
    [key: string]: {
        value: string;
        type: BaseType;
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
declare class Declaration {
    declobj: DeclObj;
    constructor(declobj: DeclObj);
    readonly gitid: string;
    readonly name: string;
    readonly repository: string;
    readonly title: string;
    readonly desc: string;
    readonly fields: any[];
    readonly inputs: PortsMap;
    readonly outputs: PortsMap;
    readonly parameters: ParametersMap;
}
/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globals globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
declare class Batch {
    _flowchart: FlowchartObj;
    _steps: Map<string, Step>;
    _starts: Step[];
    _feature: any;
    _globals: any;
    _args: any;
    constructor(flowchart: FlowchartObj);
    readonly batch: FlowchartObj;
    readonly steps: Map<string, Step>;
    readonly feature: any;
    readonly globals: any;
    readonly args: any;
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
    add(pipe: Pipe): void;
    output(feature: any): void;
    input(feature: any): void;
}
/**
 * class representing link between two ports during execution phase
 * data flow through pipes from outport to in port
 * @member outport port from which data is outputed
 * @member inport: port from which data is inputed
 * @member filter: filtering object
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
    id: any;
    decl: Declaration;
    pipes: Pipe[];
    ports: {
        [key: string]: Port;
    };
    binds: {
        [key: string]: Function;
    };
    feature: any;
    state: State;
    params: any;
    abstract start(): void;
    abstract end(): void;
    /**
     * constructor
     * @param decl declaration object for the step
     * @param params parameters expressions for the step
     * @param batch the batch containing this step
     */
    protected constructor(decl: Declaration, params: ParamsMap, batch: Batch);
    /**
     * the toString() legacy method
     */
    toString(): string;
    /**
     * check for an input port name existance
     */
    isinport(port: any): boolean;
    /**
     * check for an output port name existance
     */
    isoutport(port: any): boolean;
    /**
     * bind an input port name to a callback method that will be called to receive input features
     * @param {string} inport: the input port name to bind with the method
     * @param {function} method: a method to call for each inputed feature
     */
    bind(inport: any, method: any): void;
    /**
     * method to connect this step with a data pipe
     * @param outport name of the output port in this step
     * @param inport name of the input port in the target step
     * @param target target step of the pipe (where data flow)
     * @param filter filter function for flowing data
     */
    pipe(outport: string, inport: string, target: Step, filter?: (f: any) => boolean): void;
    /**
     * set typedef for an output port
     * @param {*} name: output a port name
     * @param {*} typedef: type definition for features to be outputed
     */
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
export { Declaration, Batch, Step, };
