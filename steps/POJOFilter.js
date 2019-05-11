"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cef = require("./step");
exports.declaration = {
    gitid: 'mbenzekri/cef-fs/steps/POJOFilter',
    title: 'filter pojos',
    desc: ' filter each inputed pojo with boolean expression',
    inputs: {
        'pojos': {
            desc: 'pojo to filter'
        }
    },
    outputs: {
        'filtered': {
            desc: 'filtered pojos'
        }
    },
    parameters: {
        'test': {
            desc: 'filter expression',
            type: 'boolean',
        },
    },
    fields: [
        {
            key: 'test',
            type: 'boolean',
            defaultValue: '${ true }',
            templateOptions: {
                label: 'filter expression',
                required: true,
            }
        },
    ]
};
class POJOFilter extends cef.Step {
    constructor(params) {
        super(exports.declaration, params);
    }
    start() {
    }
    input_pojos(feature) {
        if (this.params.test)
            this.output('filtered', feature);
    }
    end() {
    }
}
function create(params) { return new POJOFilter(params); }
exports.create = create;
;
//# sourceMappingURL=POJOFilter.js.map