"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const tests = [
    {
        stepid: 'mbenzekri/pojoe/steps/PojoLookup',
        title: 'PojoLookup simple properties matching',
        globs: {},
        params: {
            lookupkey: '${pojo.num}',
            pojokey: '${new Date(pojo.date).getDay()}',
            multiple: 'first',
            mode: 'add',
            changes: '{ "dayname" : "${this.match.lid}", "daydesc" : "${this.match.desc}" }',
        },
        injected: {
            lookup: [
                { lid: 'lundi', desc: 'jour de la lune', num: 1 },
                { lid: 'mardi', desc: 'jour de mars', num: 2 },
                { lid: 'mercredi', desc: 'jour de mercure', num: 3 },
                { lid: 'jeudi', desc: ' jour de jupiter', num: 4 },
                { lid: 'vendredi', desc: 'jour de venus', num: 5 },
                { lid: 'samedi', desc: 'jour du shabbat', num: 6 },
                { lid: 'dimanche', desc: 'jour du seigneur', num: 0 },
            ],
            pojos: [
                { date: new Date(2019, 5, 3), todo: 'nothing', tosee: 'Avengers: end game' },
                { date: new Date(2019, 5, 4), todo: 'work', tosee: 'Captain Marvel' },
                { date: new Date(2019, 5, 5), todo: 'work', tosee: 'Captain America: first Avenger' },
                { date: new Date(2019, 5, 6), todo: 'work', tosee: 'Iron Man' },
                { date: new Date(2019, 5, 7), todo: 'nothing', tosee: 'Ant Man' },
                { date: new Date(2019, 5, 8), todo: 'nothing', tosee: 'Spiderman' },
                { date: new Date(2019, 5, 9), todo: 'nothing', tosee: 'Gardian of the Galaxy' },
            ]
        },
        expected: {
            matched: [
                {
                    "date": "2019-06-02T22:00:00.000Z",
                    "todo": "nothing",
                    "tosee": "Avengers: end game",
                    "dayname": "lundi",
                    "daydesc": "jour de la lune"
                },
                {
                    "date": "2019-06-03T22:00:00.000Z",
                    "todo": "work",
                    "tosee": "Captain Marvel",
                    "dayname": "mardi",
                    "daydesc": "jour de mars"
                },
                {
                    "date": "2019-06-04T22:00:00.000Z",
                    "todo": "work",
                    "tosee": "Captain America: first Avenger",
                    "dayname": "mercredi",
                    "daydesc": "jour de mercure"
                },
                {
                    "date": "2019-06-05T22:00:00.000Z",
                    "todo": "work",
                    "tosee": "Iron Man",
                    "dayname": "jeudi",
                    "daydesc": " jour de jupiter"
                },
                {
                    "date": "2019-06-06T22:00:00.000Z",
                    "todo": "nothing",
                    "tosee": "Ant Man",
                    "dayname": "vendredi",
                    "daydesc": "jour de venus"
                },
                {
                    "date": "2019-06-07T22:00:00.000Z",
                    "todo": "nothing",
                    "tosee": "Spiderman",
                    "dayname": "samedi",
                    "daydesc": "jour du shabbat"
                },
                {
                    "date": "2019-06-08T22:00:00.000Z",
                    "todo": "nothing",
                    "tosee": "Gardian of the Galaxy",
                    "dayname": "dimanche",
                    "daydesc": "jour du seigneur"
                }
            ],
            unmatched: []
        },
    },
];
module.exports = index_1.Testbed.run(tests);
//# sourceMappingURL=PojoLookup_spec.js.map