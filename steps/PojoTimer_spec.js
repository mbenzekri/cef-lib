"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const tests = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoTimer',
        title: 'PojoTimer output a pojo every 2 sec during 6 seconds ',
        params: {
            'interval': '2000',
            'repeat': 'true',
            'pojo': '{ "data": "hello world" }'
        },
        injected: {},
        expected: {
            pojos: [
                { "data": "hello world" },
                { "data": "hello world" },
                { "data": "hello world" },
            ]
        },
        onstart: (step) => {
            setTimeout(() => step.stoptimer(), 6000);
        }
    },
];
module.exports = index_1.Testbed.run(tests);
//# sourceMappingURL=PojoTimer_spec.js.map