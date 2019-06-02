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
const pojoe_1 = require("./pojoe");
const declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoFilter',
    title: 'filter pojos',
    desc: ' filter each inputed pojo through a boolean expression',
    inputs: {
        'pojos': {
            title: 'pojo to filter'
        }
    },
    outputs: {
        'success': {
            title: 'filtered pojos'
        },
        'failure': {
            title: 'filtered pojos'
        },
    },
    parameters: {
        'test': {
            title: 'filter expression',
            type: 'boolean',
            default: 'true'
        },
    }
};
class PojoFilter extends pojoe_1.Step {
    constructor(params) {
        super(declaration, params);
    }
    input(inport, pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (inport === 'pojos') {
                const target = this.params.test ? 'success' : 'failure';
                yield this.output(target, pojo);
            }
        });
    }
}
PojoFilter.declaration = declaration;
exports.PojoFilter = PojoFilter;
pojoe_1.Step.register(PojoFilter);
//# sourceMappingURL=PojoFilter.js.map