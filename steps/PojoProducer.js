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
    gitid: 'mbenzekri/pojoe/steps/PojoProducer',
    title: 'output a pojo',
    desc: 'this step emit one pojo provided in a parameter object literal expression',
    inputs: {},
    outputs: {
        'pojos': {
            title: 'the pojos outputed'
        }
    },
    parameters: {
        'pojos': {
            title: 'a json object or array literal',
            type: 'json',
            default: '[ { "num" : 1 },{ "num" : 2 },{ "num" : 3 } ]',
        },
    }
};
class PojoProducer extends pojoe_1.Step {
    constructor(params) {
        super(declaration, params);
    }
    process() {
        return __awaiter(this, void 0, void 0, function* () {
            const pojos = this.params.pojos;
            if (Array.isArray(pojos)) {
                for (let pojo of pojos) {
                    yield this.output("pojos", pojo);
                }
            }
            else {
                yield this.output("pojos", pojos);
            }
        });
    }
}
PojoProducer.declaration = declaration;
pojoe_1.Step.register(PojoProducer);
//# sourceMappingURL=PojoProducer.js.map