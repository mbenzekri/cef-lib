"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cef = require("./step");
exports.declaration = {
    gitid: 'mbenzekri/cef-lib/steps/POJOProducer',
    title: 'emit a POJO  (Plain Javascript Object) ',
    desc: 'emit one pojo for an object literal expression',
    inputs: {},
    outputs: {
        'pojo': {
            desc: 'the plain javascript objet'
        }
    },
    parameters: {
        'literal': {
            desc: 'the POJO literal',
            type: 'object',
        },
    },
    fields: [
        {
            key: 'literal',
            type: 'text',
            defaultValue: '${ { aint : 1, abool: true, astring: "hello world" adate: new Date()} }',
            templateOptions: {
                label: 'object literal expression',
                required: true,
            }
        },
    ]
};
class POJOProducer extends cef.Step {
    constructor(params) {
        super(exports.declaration, params);
    }
    start() {
        this.open('object');
        this.output("pojo", this.params.literal);
        this.close('files');
    }
    end() {
    }
}
function create(params) { return new POJOProducer(params); }
exports.create = create;
;
//# sourceMappingURL=POJOProducer.js.map