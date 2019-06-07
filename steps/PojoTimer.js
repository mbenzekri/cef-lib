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
    gitid: 'mbenzekri/pojoe/steps/PojoTimer',
    title: 'output a pojo at timed intervals',
    desc: 'this step emit pojos at a given time interval or just one after a certain time interval',
    inputs: {},
    outputs: {
        'pojos': {
            title: 'the pojos outputed'
        }
    },
    parameters: {
        'interval': {
            title: 'interval of time in ms',
            type: 'int',
            default: '10000',
        },
        'repeat': {
            title: 'if true repeat the pojo output at each interval time',
            type: 'boolean',
            default: 'true',
        },
        'pojo': {
            title: 'the outputed pojo',
            type: 'json',
            default: '{ "date": "${new Date()}" }',
        },
    }
};
class PojoProducer extends pojoe_1.Step {
    constructor(params) {
        super(declaration, params);
        this.off = false;
        this.repeat = false;
        this.interval = 10000;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.interval = this.params.interval;
            this.repeat = this.params.repeat;
        });
    }
    stoptimer() {
        this.off = true;
    }
    timeout(resolve, reject) {
        setTimeout(_ => {
            const pojo = this.params.pojo;
            this.output('pojos', pojo)
                .then(_ => {
                if (this.off || !this.repeat)
                    return resolve();
                this.timeout(resolve, reject);
            }).catch(reject);
        }, this.interval);
    }
    process() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.timeout(resolve, reject);
            });
        });
    }
}
PojoProducer.declaration = declaration;
exports.PojoProducer = PojoProducer;
pojoe_1.Step.register(PojoProducer);
//# sourceMappingURL=PojoTimer.js.map