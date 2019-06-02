import { Testbed, Testcase } from './index'

const tests: Testcase[] = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoFilter',
        title: 'PojoFilter always true (constant)',
        params: { 'test': 'true' },
        injected: {
            pojos: [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ]
        },
        expected: {
            success: [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ],
            failure: [],
        },
    },
    {
        stepid: 'mbenzekri/pojoe/steps/PojoFilter',
        title: 'PojoFilter filter some pojos',
        params: { 'test': '${pojo.a_number > 3}' },
        injected: {
            pojos: [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ]
        },
        expected: {
            success: [
                { a_number: 4 },
                { a_number: 5 },
                { a_number: 6 },
            ],
            failure: [
                { a_number: 1 },
                { a_number: 2 },
                { a_number: 3 },
            ],
        },
    },
]


Testbed.run(tests)