import { Testbed, Testcase } from './index'
import { EOL } from 'os'

const tests: Testcase[] = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoExec',
        title: 'test execute an echo command',
        params: { 
            command: 'echo ${pojo.text} ',
        },
        injected: {
            pojos: [
                { text : 'hello world 1' },
                { text : 'hello world 2' },
            ]
        },
        expected: {
            success: [
                { stdout: `hello world 1 ${EOL}`, stderr: '' },
                { stdout: `hello world 2 ${EOL}`, stderr: '' },
            ],
        },
    },
]


module.exports = Testbed.run(tests)