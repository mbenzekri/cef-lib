// Step class declaration 
// use this class to declare a new kind of step for the cloud engine factory 
StepDecl: class {
    constructor(options) {
        this.options = options;
    }
    get name() { return this.options.name }
    get desc() { return this.options.desc }
    get parameters() { return this.options.parameters }
    get inputs() { return this.options.inputs }
    get outputs() { return this.options.outputs }
}
// Step class definition 
// use this class to define the behavior of a new kind of step for the cloud engine factory 
StepDef: class {
    constructor() {

    }

}

export { StepDecl, StepDef }
