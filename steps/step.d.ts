declare class Pipe {
    readonly tmpfile: string;
    private _fd;
    private _filepos;
    private _written;
    private _done;
    private _readers;
    private _waits;
    readfrom(reader: InputPort): void;
    open(): void;
    closed(reader?: InputPort): boolean;
    close(reader?: InputPort): void;
    pop(reader: InputPort): Promise<any>;
    push(item: any): Promise<void>;
}
declare const SOF = "SOF";
declare const EOF = "EOF";
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
    readonly starts: Step[];
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
    run(): Promise<void>;
}
/**
 * class defining a port either an input port or an output port
 * port state is first idle
 * port state is started after receiving SOF (start of flow pojo)
 * port state is ended after receiving EOF (end of flow pojo)
 */
declare abstract class Port {
    readonly isinput: boolean;
    readonly isoutput: boolean;
    readonly name: string;
    readonly step: Step;
    private state;
    readonly isstarted: boolean;
    readonly isended: boolean;
    readonly isidle: boolean;
    constructor(name: string, step: Step, capacity?: number);
    protected setState(pojo: any): void;
}
declare class OutputPort extends Port {
    readonly fifo: Pipe;
    readonly isoutput: boolean;
    put(pojo: any): Promise<void>;
}
declare class InputPort extends Port {
    fifos: Pipe[];
    readonly isinput: boolean;
    from(fifo: Pipe): void;
    get(): Promise<string>;
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
declare abstract class Step {
    readonly id: any;
    readonly decl: Declaration;
    private _inports;
    private _outports;
    private pojo;
    private state;
    private _params;
    start(): Promise<void>;
    abstract doit(): any;
    end(): Promise<void>;
    /**
     * constructor
     * @param decl declaration object for the step
     * @param params parameters expressions for the step
     * @param batch the batch containing this step
     */
    protected constructor(decl: Declaration, params: ParamsMap);
    readonly type: string;
    readonly paramlist: string[];
    readonly params: any;
    readonly isidle: boolean;
    readonly isstarted: boolean;
    readonly isended: boolean;
    readonly inports: InputPort[];
    readonly outports: OutputPort[];
    readonly isinitial: boolean;
    readonly isfinal: boolean;
    outport(name: string): OutputPort;
    inport(name: string): InputPort;
    toString(): string;
    isinport(portname: string): boolean;
    isoutport(portname: string): boolean;
    port(name: string): Port;
    log(message: string): void;
    /**
     * initialize dynamic step parameter access
     * @param args: arguments map provided by the batch
     * @param globals: globals map provided by the batch
     */
    initparams(args: any, globals: any): void;
    /**
     * method to connect this step with a data pipe
     * @param outport name of the output port in this step
     * @param inport name of the input port in the target step
     * @param target target step of the pipe (where data flow)
     * @param filter filter function for flowing data
     */
    connect(outport: OutputPort, inport: InputPort, filter?: (f: any) => boolean): void;
    private init;
    private terminate;
    /**
     * method to declare output termination throw the corresponding port
     * @param name: a port name
     */
    private close;
    /**
     * method to declare output starting throw the corresponding port
     * @param name: a port name
     */
    private open;
    /**
     * method to output a pojo throw the corresponding port
     * @param {string} outport: a port name
     * @param {any} pojo: the pojo to output
     */
    output(outport: string, pojo: any): Promise<void>;
    /**
     * method to get next input pojo throw the corresponding port
     * @param {string} inport: a port name
     */
    input(inport: string): Promise<any>;
    exec(): Promise<void>;
}
export { Declaration, Flowchart, Batch, Step, ParamsMap, SOF, EOF };
