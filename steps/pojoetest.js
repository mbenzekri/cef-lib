#!/usr/bin/env node
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
const fs = require("fs");
process.env.NODE_PATH = `${process.cwd()}/steps`;
require("module").Module._initPaths();
const readme = 'README.md';
const decls = {};
let pkg;
try {
    pkg = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf8' }));
}
catch (e) {
    console.error(`unable to read package.json in directory ${process.cwd()} `);
    process.exit(1);
}
if (!pkg.config || !pkg.config.steps || !Array.isArray(pkg.config.steps)) {
    console.error("unable to find steps list in package.json \n");
    console.log(`
    please configure your step list in package.json like:
    {
        ...
        "config" :{
            "steps" : [ "StepClass1", "StepClass2", "StepClass3" ]
        },
        ...
    }\n`);
    process.exit(1);
}
function runtest(steplist, i = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        if (i < steplist.length) {
            const name = steplist[i];
            const step = `${name}.js`;
            const test = `${name}_spec.js`;
            try {
                require(step);
            }
            catch (e) {
                console.error(`unable to require step module ${step} due to ${e.message} `);
                return yield runtest(steplist, i + 1);
            }
            try {
                yield require(test);
            }
            catch (e) {
                console.error(`unable to require test module ${test} due to ${e.message} `);
            }
            return yield runtest(steplist, i + 1);
        }
    });
}
const steplist = pkg.config.steps;
runtest(steplist);
//# sourceMappingURL=pojoetest.js.map