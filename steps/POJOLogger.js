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
    gitid: 'mbenzekri/cef-fs/steps/POJOLogger',
    title: 'Logs pojos',
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
            defaultValue: '${JSON.stringify(pojo)}',
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
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            let pojo = yield this.input('pojos');
            while (pojo !== cef.EOF) {
                console.log(this.params.expression);
                pojo = yield this.input('pojos');
            }
        });
    }
}
function create(params) { return new POJOLogger(params); }
exports.create = create;
;
//# sourceMappingURL=POJOLogger.js.map