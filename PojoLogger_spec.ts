import { Testbed, Testcase } from './index'

const tests: Testcase[] = [
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
]


Testbed.run(tests)