import { Testbed, Testcase } from './index'

const tests: Testcase[] = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoTimer',
        title: 'PojoTimer output a pojo every 2 sec during 6 seconds ',
        params: { 
            'interval': '2000', 
            'repeat': 'true', 
            'pojo': '{ "data": "hello world" }'
        },
        injected: {
        },
        expected: {
            pojos: [
                { "data": "hello world" },
                { "data": "hello world" },
                { "data": "hello world" },
            ]
        },
        onstart: (step) => {
            setTimeout(() => step.stoptimer(),6000)
        }
    },

]


module.exports = Testbed.run(tests)