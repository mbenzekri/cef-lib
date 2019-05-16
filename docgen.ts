import * as fs from  'fs'
import * as cef from  './index'

const readme = 'README.md' 
const steps = process.argv
const decls : {[key:string]: cef.Declaration } = {}

steps.shift()
steps.shift()
let pkg,pathmod
try {
    pkg = JSON.parse(fs.readFileSync('./package.json',{ encoding : 'utf8' }))
} catch (e) {
    console.error(`unable to read package.json in directory ${process.cwd()} `)
    process.exit(1)
}
steps.forEach(name => {
    try {
        pathmod = `${process.cwd()}/steps/${name}`
        const module = require(pathmod)
        decls[name] = module.declaration;
    } catch (e) {
        console.error(`unable to require module ${pathmod} `)
        process.exit(2)
    }
})
let repository: string 

steps.forEach(name => {
    const decl= decls[name]
    const ids = decl.gitid.split(/\//)
    repository = `${ids[0]}/${ids[1]}`
})
//fs.writeFileSync(readme,'<div style="border-width: 2px;border-color: red;border-radius: 10px">\n')
fs.writeFileSync(readme,'\n')
fs.appendFileSync(readme,`# ${pkg.name}${ pkg.title ? ': pkg.title' : ''}\n`)
fs.appendFileSync(readme,`>${pkg.description}\n`)
//fs.writeFileSync(readme,'</div>\n\n')

fs.appendFileSync(readme,`# install\n\n`)
fs.appendFileSync(readme,`>\`npm install ${repository}\`\n\n`)
fs.appendFileSync(readme,`# included steps \n`)
steps.forEach(name => {
    const decl= decls[name]
    const ids = decl.gitid.split(/\//)
    const classname = ids[3]
    fs.appendFileSync(readme,`>- [${name}](#${classname.toLowerCase()}) : ${decl.title}\n`)

})
fs.appendFileSync(readme,`---\n`)

steps.forEach(name => {
    const decl= decls[name]
    const ids = decl.gitid.split(/\//)
    const classname = ids[3]
    fs.appendFileSync(readme,`# ${classname} : ${decl.title}\n`)
    fs.appendFileSync(readme,`>\n\n`)
    fs.appendFileSync(readme,`## goal\n\n`)
    fs.appendFileSync(readme,`>${decl.desc}\n`)
    decl.features && decl.features.forEach(feature => {
        fs.appendFileSync(readme,`>- ${feature} \n`)
    })

    fs.appendFileSync(readme,'\n---\n')

    fs.appendFileSync(readme,`## parameters\n`)
    const hasParams = decl.parameters && Object.keys(decl.parameters).length
    hasParams && Object.keys(decl.parameters).forEach(name => {
        const parameter = decl.parameters[name]
        fs.appendFileSync(readme,`> **${name}**: *{${parameter.type}}* -- ${parameter.title} [default = \`${parameter.default}\`]\n`)
        fs.appendFileSync(readme,`> \n`)
        parameter.examples && fs.appendFileSync(readme,`>| Value | Description | \n`)
        parameter.examples && fs.appendFileSync(readme,`>|-------|-------------| \n`)
        parameter.examples && parameter.examples.forEach(ex => {
            fs.appendFileSync(readme,`>|\`${ex.value}\`| ${ex.title} |\n`)
        })
        fs.appendFileSync(readme,`\n`)
    })
    const hasInputs = decl.inputs && Object.keys(decl.inputs).length
    hasInputs && fs.appendFileSync(readme,`## inputs\n`)
    hasInputs && Object.keys(decl.inputs).forEach(name => {
        const input = decl.inputs[name]
        fs.appendFileSync(readme,`>- **${name}** -- ${input.title} \n`)
    })
    fs.appendFileSync(readme,`\n`)
    const hasOuputs = decl.outputs && Object.keys(decl.outputs).length
    hasOuputs && fs.appendFileSync(readme,`## outputs\n`)
    hasOuputs && Object.keys(decl.outputs).forEach(name => {
        const output = decl.outputs[name]
        fs.appendFileSync(readme,`>- **${name}** -- ${output.title} \n`)
    })
    const hasExamples = decl.examples && decl.examples.length
    hasExamples && fs.appendFileSync(readme,`## examples\n`)
    hasExamples && decl.examples.forEach(example => {
        fs.appendFileSync(readme,`### ${example.title}\n`)
        fs.appendFileSync(readme,`${example.title}\n`)
    })
    fs.appendFileSync(readme,`\n---\n\n`)
})