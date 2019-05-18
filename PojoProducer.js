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
    gitid: 'mbenzekri/pojoe/steps/PojoProducer',
    title: 'output a pojo',
    desc: 'this step emit one pojo provided in a parameter object literal expression',
    inputs: {},
    outputs: {
        'pojo': {
            title: 'the pojo'
        }
    },
    parameters: {
        'pojo': {
            title: 'the pojo literal',
            type: 'json',
            default: 'json',
        },
    }
};
class PojoProducer extends pe.Step {
    constructor(params) {
        super(declaration, params);
    }
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.output("pojo", this.params.json);
        });
    }
}
PojoProducer.declaration = declaration;
exports.default = PojoProducer;
pe.Step.Register(declaration, (params) => new PojoProducer(params));
//# sourceMappingURL=PojoProducer.js.map