#!/usr/bin/env node
import * as fs from 'fs'
import { Declaration, Step } from '.'
process.env.NODE_PATH = `${process.cwd()}/steps`;
require("module").Module._initPaths();

const readme = 'README.md'
const decls: { [key: string]: Declaration } = {}

let pkg
try {
    pkg = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf8' }))
} catch (e) {
    console.error(`unable to read package.json in directory ${process.cwd()} `)
    process.exit(1)
}

if (!pkg.config || !pkg.config.steps || !Array.isArray(pkg.config.steps)) {
    console.error("unable to find steps list in package.json \n")
    console.log(`
    please configure your step list in package.json like:
    {
        ...
        "config" :{
            "steps" : [ "StepClass1", "StepClass2", "StepClass3" ]
        },
        ...
    }\n`)
    process.exit(1)
}


async function runtest(steplist: string[], i = 0) {
    if (i < steplist.length) {
        const name = steplist[i]
        const step = `${name}.js`
        const test = `${name}_spec.js`
        try {
            require(step);
        } catch (e) {
            console.error(`unable to require step module ${step} due to ${e.message} `)
            return await runtest(steplist,i+1)
        }
        try {
            await require(test);
        } catch (e) {
            console.error(`unable to require test module ${test} due to ${e.message} `)
        }
        return await runtest(steplist,i+1)
    }
}

const steplist: string[] = pkg.config.steps

runtest(steplist)


