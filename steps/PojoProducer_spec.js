"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const tests = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoProducer',
        title: 'PojoProducer empty object',
        params: { 'pojos': "{}" },
        injected: {},
        expected: {
            pojos: [{}]
        },
    },
    {
        stepid: 'mbenzekri/pojoe/steps/PojoProducer',
        title: 'PojoProducer no inputs',
        params: {
            pojos: '[]'
        },
        injected: {},
        expected: {
            pojos: []
        },
    },
    {
        stepid: 'mbenzekri/pojoe/steps/PojoProducer',
        title: 'PojoProducer argument variables type string/int/boolean/number (must replace default)',
        args: {
            'STR': { type: 'string', value: 'Bye-Bye', desc: '' },
            'INT': { type: 'int', value: '456', desc: '' },
            'BOOL': { type: 'boolean', value: 'false', desc: '' },
            'NUM': { type: 'number', value: '2,718281821.', desc: '' },
        },
        params: {
            pojos: '{ "string" : "${args.STR}", "int" : ${args.INT}, "bool" : ${args.BOOL}, "num" : ${args.NUM} }'
        },
        injected: {},
        expected: {
            pojos: [
                { string: "Hello", int: 123, "bool": true, num: 3.14159265 }
            ]
        },
    },
    {
        stepid: 'mbenzekri/pojoe/steps/PojoProducer',
        title: 'PojoProducer global variables type string/int/boolean/number',
        globs: {
            'STR': { type: 'string', value: 'Bye-Bye', desc: '' },
            'INT': { type: 'int', value: '456', desc: '' },
            'BOOL': { type: 'boolean', value: 'false', desc: '' },
            'NUM': { type: 'number', value: '2.718281821.', desc: '' },
        },
        params: {
            pojos: '{ "string" : "${globs.STR}", "int" : ${globs.INT}, "bool" : ${globs.BOOL}, "num" : ${globs.NUM}}'
        },
        injected: {},
        expected: {
            pojos: [
                { string: "Bye-Bye", int: 456, "bool": false, "num": 2.718281821 }
            ]
        },
    },
];
module.exports = index_1.Testbed.run(tests);
//# sourceMappingURL=PojoProducer_spec.js.map