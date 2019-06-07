import { Step, Declaration, ParamsMap } from './pojoe'
import { exec, ExecException} from 'child_process'

const declaration: Declaration = {
    gitid: 'mbenzekri/pojoe/steps/PojoExec',
    title: 'execute an os command',
    desc: ' execute a given command on the hosted OS and return sdtout/stderr in pojo properties',
    inputs: {
        'pojos': {
            title: 'pojos with needed data to construct the command'
        }
    },
    outputs: {
        'success': {
            title: 'on success outputed data',
            properties: {
                stdio: {type: 'string',title: 'collected stdio output' },
                stderr: {type: 'string',title: 'collected stderr output' } 
            }
        },
        'failed': {
            title: 'on failure outputed data',
            properties: {
                error: {type: 'string',title: 'error reason' },
                exitcode: {type: 'int',title: 'exit code of the command' },
                stdio: {type: 'string',title: 'collected stdio output' },
                stderr: {type: 'string',title: 'collected stderr output' } 
            }
        },
    },
    parameters: {
        'command': {
            title: 'command expression to execute',
            type: 'string',
            default: 'echo hello world !'
        },
        'directory': {
            title: 'Current working directory',
            type: 'string',
            default: '.'
        },
        'env': {
            title: 'Environnement variables',
            type: 'json',
            default: '{}'
        },
        'timeout': {
            title: 'max execution time in milliseconds (0 = infinite)',
            type: 'int',
            default: '0'
        },
    }
}

export class PojoExec extends Step {
    static readonly declaration = declaration
    constructor (params: ParamsMap) {
        super(declaration, params)
    }

    async execcmd() {
        return new Promise<void> ((resolve,reject) => {
            const command: string = this.params.command
            const cwd: string  = this.params.directory
            const env: any =  this.params.env
            const timeout: number =  this.params.timeout
            
            exec(command,{cwd, env, timeout, windowsHide : true}, (err: ExecException, stdout: string, stderr: string) => {
                let pojo:any = {stdout, stderr}
                if (err) {
                    pojo.error = err.toString()
                    pojo.exitcode = err.code
                }
                this.output(err ? 'failed' : 'success', pojo).then(resolve).catch(reject) 
            })
        })
    } 
    
    async input(inport:string, pojo: any) {
        if (inport ===  'pojos') {
            await this.execcmd()
        }
    }
    async process() {
        if (this.inport('pojos').isconnected) return
        await this.execcmd()
    }
}

Step.register(PojoExec);

