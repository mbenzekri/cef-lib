"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
let test;
const tests = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoProducer',
        title: 'PojoProcucer',
        params: { 'pojo': JSON.stringify({ a_number: 1.23456, a_string: "hello world" }) },
        injected: {},
        expected: { 'pojo': [{ a_number: 1.23456, a_string: "hello world" }] },
    },
    {
        stepid: 'mbenzekri/pojoe/steps/PojoFilter',
        title: 'PojoFilter always true (constant)',
        params: { 'test': 'true' },
        injected: { 'pojos': [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ] },
        expected: { 'filtered': [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ] },
    },
    {
        stepid: 'mbenzekri/pojoe/steps/PojoFilter',
        title: 'PojoFilter filter some pojos',
        params: { 'test': '${pojo.a_number > 3}' },
        injected: { 'pojos': [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ] },
        expected: { 'filtered': [
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ] },
    },
    {
        stepid: 'mbenzekri/pojoe/steps/PojoLogger',
        title: 'PojoLogger',
        params: { 'test': 'Hello pojo number ${pojo.a_number}' },
        injected: { 'pojos': [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
            ] },
        expected: {},
    },
];
index_1.Testbed.run(tests);
//# sourceMappingURL=test.js.map