declare const SOP = "SOF";
declare const EOP = "EOF";
declare type Declaration = {
    gitid: string;
    title: string;
    desc: string;
    features?: string[];
    parameters: ParamsMapDef;
    inputs: InPortsMap;
    outputs: OutPortsMap;
    examples?: {
        title: string;
        desc: string;
    }[];
};
declare type ParamsMapDef = {
    [key: string]: {
        title: string;
        desc?: string;
        type: string;
        default: string;
        examples?: {
            value: string;
            title: string;
            desc?: string;
        }[];
    };
};
declare type InPortsMap = {
    [key: string]: {
        title: string;
        desc?: string;
        properties?: PropertiesMap;
    };
};
declare type OutPortsMap = {
    [key: string]: {
        title: string;
        desc?: string;
        properties?: PropertiesMap;
    };
};
declare type PropertiesMap = {
    [key: string]: {
        title: string;
        desc?: string;
        type: string;
    };
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
    id: string;
    title: string;
    desc: string;
    args: TypedParamsMap;
    globs: TypedParamsMap;
    steps: StepObj[];
    pipes: PipeObj[];
};
declare type TestData = {
    [key: string]: any[];
};
declare type Testcase = {
    stepid: string;
    title: string;
    params: ParamsMap;
    injected: TestData;
    expected: TestData;
};
/**
 * class defining a batch to run in cloud engine factory
 * @member batch the js plain object description
 * @member steps all the steps of this batch
 * @member globs globals variables for this batch
 * @member argv collected arguments from either process.argv or env variables
 */
declare class Batch {
    private _flowchart;
    private _steps;
    private _globs;
    private _args;
    constructor(flowchart: Flowchart);
    readonly flowchart: Flowchart;
    readonly steps: Map<string, Step>;
    readonly globs: any;
    readonly args: any;
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
    static Register(declaration: Declaration, create: (p: ParamsMap) => Step): void;
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
    error(message: string): void;
    /**
     * initialize dynamic step parameter access
     * @param args: arguments map provided by the batch
     * @param globs: globs map provided by the batch
     */
    initparams(args: any, globs: any): void;
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
declare class Testbed extends Batch {
    static pipes(stepid: string): PipeObj[];
    static steps(stepid: string, params: ParamsMap): StepObj[];
    constructor(testcase: Testcase);
    static run(tests: Testcase[]): Promise<void>;
}
export { Declaration, Flowchart, Testcase, Batch, Testbed, Step, ParamsMap, SOP, EOP };
