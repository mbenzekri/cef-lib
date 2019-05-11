"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cef = require("./index");
process.env.CEF_PATH = __dirname + '/../..';
const flowchart = {
    name: 'Pojo steps test',
    title: 'testing POJO steps (producer, filter, logger)',
    args: {},
    globals: {},
    steps: [
        {
            id: 'a',
            gitid: 'mbenzekri/cef-lib/steps/POJOProducer',
            params: {
                'literal': '{a: 1, b:2, c:3 }'
            }
        },
        {
            id: 'b',
            gitid: 'mbenzekri/cef-lib/steps/POJOProducer',
            params: {
                'literal': '{a: 4, b:5, c:6 }'
            }
        },
        {
            id: 'c',
            gitid: 'mbenzekri/cef-lib/steps/POJOFilter',
            params: {
                'test': '${ feature.b < 5 }'
            }
        },
        {
            id: 'd',
            gitid: 'mbenzekri/cef-lib/steps/POJOLogger',
            params: {
                'expression': '${ JSON.stringify(feature) }'
            }
        },
    ],
    pipes: [
        { from: 'a', outport: 'pojo', to: 'c', inport: 'pojos' },
        { from: 'b', outport: 'pojo', to: 'c', inport: 'pojos' },
        { from: 'c', outport: 'filtered', to: 'd', inport: 'pojos' },
    ]
};
const batch = new cef.Batch(flowchart);
batch.run();
//# sourceMappingURL=test.js.map