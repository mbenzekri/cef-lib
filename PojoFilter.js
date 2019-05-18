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
const pe = require("./pojoe");
const declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoFilter',
    title: 'filter pojos',
    desc: ' filter each inputed pojo with boolean expression',
    inputs: {
        'pojos': {
            title: 'pojo to filter'
        }
    },
    outputs: {
        'filtered': {
            title: 'filtered pojos'
        }
    },
    parameters: {
        'test': {
            title: 'filter expression',
            type: 'boolean',
            default: 'true'
        },
    }
};
class PojoFilter extends pe.Step {
    constructor(params) {
        super(declaration, params);
    }
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            let pojo = yield this.input('pojos');
            while (pojo !== pe.EOP) {
                if (this.params.test)
                    yield this.output('filtered', pojo);
                pojo = yield this.input('pojos');
            }
        });
    }
}
exports.default = PojoFilter;
pe.Step.Register(declaration, (params) => new PojoFilter(params));
//# sourceMappingURL=PojoFilter.js.map