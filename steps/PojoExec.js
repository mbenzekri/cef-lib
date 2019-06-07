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
const child_process_1 = require("child_process");
const declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoExec',
    title: 'execute an os command',
    desc: ' execute a given command on the hosted OS and return sdtout/stderr in pojo properties',
    inputs: {
        'pojos': {
            title: 'pojos with needed data to construct the command'
        }
    },
    outputs: {
        'success': {
            title: 'on success outputed data',
            properties: {
                stdio: { type: 'string', title: 'collected stdio output' },
                stderr: { type: 'string', title: 'collected stderr output' }
            }
        },
        'failed': {
            title: 'on failure outputed data',
            properties: {
                error: { type: 'string', title: 'error reason' },
                exitcode: { type: 'int', title: 'exit code of the command' },
                stdio: { type: 'string', title: 'collected stdio output' },
                stderr: { type: 'string', title: 'collected stderr output' }
            }
        },
    },
    parameters: {
        'command': {
            title: 'command expression to execute',
            type: 'string',
            default: 'echo hello world !'
        },
        'directory': {
            title: 'Current working directory',
            type: 'string',
            default: '.'
        },
        'env': {
            title: 'Environnement variables',
            type: 'json',
            default: '{}'
        },
        'timeout': {
            title: 'max execution time in milliseconds (0 = infinite)',
            type: 'int',
            default: '0'
        },
    }
};
class PojoExec extends pojoe_1.Step {
    constructor(params) {
        super(declaration, params);
    }
    execcmd() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const command = this.params.command;
                const cwd = this.params.directory;
                const env = this.params.env;
                const timeout = this.params.timeout;
                child_process_1.exec(command, { cwd, env, timeout, windowsHide: true }, (err, stdout, stderr) => {
                    let pojo = { stdout, stderr };
                    if (err) {
                        pojo.error = err.toString();
                        pojo.exitcode = err.code;
                    }
                    this.output(err ? 'failed' : 'success', pojo).then(resolve).catch(reject);
                });
            });
        });
    }
    input(inport, pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (inport === 'pojos') {
                yield this.execcmd();
            }
        });
    }
    process() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.inport('pojos').isconnected)
                return;
            yield this.execcmd();
        });
    }
}
PojoExec.declaration = declaration;
exports.PojoExec = PojoExec;
pojoe_1.Step.register(PojoExec);
//# sourceMappingURL=PojoExec.js.map