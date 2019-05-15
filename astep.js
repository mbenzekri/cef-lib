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
const cef = require(".");
exports.declaration = {
    gitid: 'mbenzekri/cef-js/steps/POJOFilter',
    title: 'Lorem ipsum',
    desc: ' Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    inputs: {
        'inpojos': {
            desc: 'it is a pojo input port for doing many things ...',
            expected: {
                '<propnameA>': { type: 'string', desc: 'this is an expected property', required: false },
            }
        }
    },
    outputs: {
        'outpojos': {
            desc: 'outputed pojos produced by the step processing...',
            provided: {
                '<propnameB>': { type: 'string', desc: 'this is a provided property', required: false },
                '<propnameD>': { type: 'int', desc: 'this is an other provided property', required: false },
            }
        },
    },
    parameters: {
        'parameter1': {
            desc: 'first parameter',
            type: 'string',
            default: 'hello world !',
        },
        'parameter2': {
            desc: 'second parameter',
            type: 'number',
            default: '101',
        },
        'parameter3': {
            desc: 'third parameter',
            type: 'boolean',
            default: 'true',
        },
    },
    examples: [
        { title: 'first example', desc: `
    hello world !!!
    a long code to example ....         
        ` },
        { title: 'second example', desc: `
    hello world !!!
    a long code to example ....         
        ` },
    ]
};
class AStep extends cef.Step {
    constructor(params) {
        super(exports.declaration, params);
    }
    doit() {
        return __awaiter(this, void 0, void 0, function* () {
            throw ('NOT IMPLEMENTED must be done ...');
        });
    }
}
function create(params) { return new AStep(params); }
exports.create = create;
;
//# sourceMappingURL=astep.js.map