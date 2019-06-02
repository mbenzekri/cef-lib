import * as fs from  'fs'
import {Declaration, Step} from  '.'
process.env.NODE_PATH = `${process.cwd()}/steps`;
require("module").Module._initPaths();

const readme = 'README.md' 
const decls : {[key:string]: Declaration } = {}

let pkg
try {
    pkg = JSON.parse(fs.readFileSync('./package.json',{ encoding : 'utf8' }))
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


const steplist: string[] = pkg.config.steps
steplist.forEach(name => {
    const account = pkg.repository.url.replace(/^.*github.com\//,'').replace(/\/.*$/,'')
    const pathtest = `${name}_spec.js`
    try {
        require(pathtest);
    } catch (e) {
        console.error(`unable to require test module ${pathtest} due to ${e.message} `)
    }
})

