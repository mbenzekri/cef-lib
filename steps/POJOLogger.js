"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cef = require("./step");
exports.declaration = {
    gitid: 'mbenzekri/cef-fs/steps/POJOLogger',
    title: 'Logs features',
    desc: ' logs each inputed pojo through console',
    inputs: {
        'pojos': {
            desc: 'pojo to log'
        }
    },
    outputs: {},
    parameters: {
        'expression': {
            desc: 'expression to log',
            type: 'string',
        },
    },
    fields: [
        {
            key: 'expression',
            type: 'text',
            defaultValue: '${JSON.stringify(feature)}',
            templateOptions: {
                label: 'expression to log',
                required: true,
            }
        },
    ]
};
class POJOLogger extends cef.Step {
    constructor(params) {
        super(exports.declaration, params);
    }
    start() {
    }
    input_pojos(feature) {
        console.log(this.params.expression);
    }
    end() {
    }
}
function create(params) { return new POJOLogger(params); }
exports.create = create;
;
//# sourceMappingURL=POJOLogger.js.map