import { Testbed, Testcase } from './index'

const tests: Testcase[] = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoAttrSelector',
        title: 'PojoAttrSelector simple properties manipulation',
        globs: {
        },
        params: { 
            rename: 'g,c',
            copy: 'a,b,a,c,a,d',
            remove: 'f',
            keep: 'a,b,c,d,f',
        },
        injected: {
            pojos: [
                { a: 1, b: 2, g: 3, d: 4, e:5, f:6}
            ]
        },
        expected: {
            pojos: [
                { a: 1, b: 1, c: 1, d: 1}
            ]
        },
    },
]


Testbed.run(tests)