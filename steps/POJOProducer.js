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
        'json': {
            desc: 'the POJO literal',
            type: 'json',
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
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.output("pojo", this.params.json);
        });
    }
}
function create(params) { return new POJOProducer(params); }
exports.create = create;
;
//# sourceMappingURL=POJOProducer.js.map