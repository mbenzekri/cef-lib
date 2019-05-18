import * as pe from './index'

let test : pe.Testbed;
test = new pe.Testbed('mbenzekri/pojo/steps/PojoProducer',{
    title: 'unit test PojoProcucer',
    params: {
        'pojo' : '{ a_number: 1.23456, a_string: "hello world"}'
    },
    injected: {},
    expected: {},
});

test.run().then( v => {
    console.log('successfull test ...');
})