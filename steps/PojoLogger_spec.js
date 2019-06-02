"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const tests = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoLogger',
        title: 'PojoLogger simple test',
        params: {
            expression: 'Hello pojo number ${pojo.a_number}'
        },
        injected: {
            pojos: [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
            ]
        },
        expected: {},
    },
];
module.exports = index_1.Testbed.run(tests);
//# sourceMappingURL=PojoLogger_spec.js.map