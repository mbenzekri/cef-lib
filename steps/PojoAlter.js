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
    gitid: 'mbenzekri/pojoe/steps/PojoAlter',
    title: 'alter property names in pojos',
    desc: 'rename, copy, remove keep attribute in pojos',
    inputs: {
        'pojos': {
            title: 'pojo to transform'
        }
    },
    outputs: {
        'pojos': {
            title: 'altered pojos'
        },
    },
    parameters: {
        'rename': {
            title: 'list of attributes to rename: old1,new1,old2,new2, ...',
            type: 'string[]',
            default: ''
        },
        'copy': {
            title: 'list of attributes to copy: from1,to1,from2,to2, ...',
            type: 'string[]',
            default: ''
        },
        'remove': {
            title: 'list of attributes to remove',
            type: 'string[]',
            default: ''
        },
        'keep': {
            title: 'list of attributes to keep',
            type: 'string[]',
            default: ''
        },
    }
};
class PojoAlter extends pojoe_1.Step {
    constructor(params) {
        super(declaration, params);
        this.renmap = {};
        this.copylist = [];
        this.remlist = [];
        this.keeplist = [];
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const rename = this.params.rename;
            for (let i = 0; i + 1 < rename.length; i += 2) {
                this.renmap[rename[i]] = rename[i + 1];
            }
            const copy = this.params.copy;
            for (let i = 0; i + 1 < copy.length; i += 2) {
                this.copylist.push([copy[i], copy[i + 1]]);
            }
            this.remlist = this.params.remove;
            this.keeplist = this.params.keep;
        });
    }
    input(inport, pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (inport === 'pojos') {
                // rename
                const renpojo = {};
                Object.keys(pojo).forEach(property => renpojo[(property in this.renmap) ? this.renmap[property] : property] = pojo[property]);
                // copy
                const copypojo = renpojo;
                this.copylist.forEach(fromto => {
                    const [from, to] = fromto;
                    copypojo[to] = renpojo[from];
                });
                // remove
                const rempojo = {};
                Object.keys(copypojo).filter(property => !this.remlist.find(v => v === property)).forEach(property => rempojo[property] = copypojo[property]);
                // keep
                let keeppojo = rempojo;
                if (this.keeplist.length) {
                    keeppojo = {};
                    Object.keys(rempojo).filter(property => this.keeplist.find(v => v === property)).forEach(property => keeppojo[property] = rempojo[property]);
                }
                yield this.output('pojos', keeppojo);
            }
        });
    }
}
PojoAlter.declaration = declaration;
pojoe_1.Step.register(PojoAlter);
//# sourceMappingURL=PojoAlter.js.map