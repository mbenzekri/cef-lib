"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            let feature = yield this.input('pojos');
            while (feature !== cef.EOF) {
                if (this.params.test)
                    yield this.output('filtered', feature);
                feature = yield this.input('pojos');
            }
        });
    }
}
function create(params) { return new POJOFilter(params); }
exports.create = create;
;
//# sourceMappingURL=POJOFilter.js.map