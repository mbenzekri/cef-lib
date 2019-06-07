"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const os_1 = require("os");
const tests = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoExec',
        title: 'test execute an echo command',
        params: {
            command: 'echo ${pojo.text} ',
        },
        injected: {
            pojos: [
                { text: 'hello world 1' },
                { text: 'hello world 2' },
            ]
        },
        expected: {
            success: [
                { stdout: `hello world 1 ${os_1.EOL}`, stderr: '' },
                { stdout: `hello world 2 ${os_1.EOL}`, stderr: '' },
            ],
        },
    },
];
module.exports = index_1.Testbed.run(tests);
//# sourceMappingURL=PojoExec_spec.js.map