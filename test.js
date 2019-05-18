"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pe = require(".");
let test;
test = new pe.Testbed('mbenzekri/pes-lib/steps/PojoProducer', {
    title: 'unit test PojoProcucer',
    params: {
        'pojo': '{ a_number: 1.23456, a_string: "hello world"}'
    },
    injected: {},
    expected: {},
});
test.run().then(v => {
    console.log('successfull test ...');
});
//# sourceMappingURL=test.js.map