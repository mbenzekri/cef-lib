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
    gitid: 'mbenzekri/pojoe/steps/PojoLogger',
    title: 'Logs pojos',
    desc: ' logs each inputed pojo through console',
    inputs: {
        'pojos': {
            title: 'pojo to log'
        }
    },
    outputs: {},
    parameters: {
        'expression': {
            title: 'expression to log',
            type: 'string',
            default: '${JSON.stringify(pojo)}',
        },
    }
};
class PojoLogger extends pe.Step {
    constructor(params) {
        super(declaration, params);
    }
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            let pojo = yield this.input('pojos');
            while (pojo !== pe.EOP) {
                console.log(this.params.expression);
                pojo = yield this.input('pojos');
            }
        });
    }
}
exports.default = PojoLogger;
pe.Step.Register(declaration, (params) => new PojoLogger(params));
//# sourceMappingURL=PojoLogger.js.map