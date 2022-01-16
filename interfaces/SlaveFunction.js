const { mkdirSync, writeFileSync, rmSync } = require("fs")
const { nanoid } = require('nanoid');
const { join } = require('path');
const { run, pack } = require("../lib/utils");
const { fork } = require("child_process");

class Worker {
    constructor(SlaveNode,ws,options={}) {
        this.manager = SlaveNode
        this.ws = ws
        this.path = options.path
        this.id = options.id

        this.child;
    }
    async tidy() {
        try {
            this.manager.workers.delete(this.id)
            await this.child.kill()
            rmSync(this.path,{recursive:true})
            return true
        } catch (error) {
            console.error(error)
            return false
        }
    }
    use(args) {
        return new Promise(async r=>{
            let id = await nanoid()
            this.child.callbacks.set(id,r)
            this.child.send({
                a: args,
                c: id
            })
        })
    }

    async CreateChildProcess() {
        let child;
        try {
            child = fork(join(this.path,'func.js'))
            child.callbacks = new Map()
            child.on('error',this._error)
            child.on('message',msg=>{
                if(msg.op == -1) {
                    this.ws.send(pack({
                        op: 5,
                        id: this.id,
                        d: msg.d
                    }))
                } else if(msg.op == 1) {// Function result
                    let callback = child.callbacks.get(msg.c)
                    if(callback) {
                        child.callbacks.delete(msg.c)
                        callback(msg.d)
                    }
                } else if(msg.op == 2) {// Event
                    this.ws.send(pack({
                        op: 4,
                        id: this.id,
                        d: msg.d,
                        t: msg.t
                    }))
                }
            })
            child.on('close',()=>{
                child.callbacks = null
            })
        } catch (e) {
            this._error(e)
        }
        return this.child = child
    }
    async init(func) {
        mkdirSync(this.path,{recursive:true})
        if(func.require) await run(this.path,`npm`,['i',...func.require])
        
        let script = '';
        if(func.pre_execute && func.pre_execute.func) {
            script+=`(${func.pre_execute.func})`
            if(func.pre_execute.args) script+=`(${JSON.stringify(func.pre_execute.args)});`
            else script+=`();`
        }

        await writeFileSync(join(this.path,'func.js'),`
        ${script}
        const main_func = (${func.execute});
        global.node = {
            emit: (n,args) => process.send({op:2,d:args,t:n}),
            func_id: '${this.id}'
        }
        process.on('uncaughtException',e=>process.send({op:-1,d:e.toString()}))
        process.on('unhandledRejection',e=>process.send({op:-1,d:e.toString()}))
        process.on('message',async msg=>{
            try{
                process.send({op:1,d:{r:await main_func(...msg.a)},c:msg.c})
            }catch(e) {
                console.error(e)
                process.send({op:1,d:{r:e.toString(),e:true},c:msg.c})
            }
        })`)
        if(func.pre_execute) {
            await writeFileSync(join(this.path,'pre_execute.js'),`const func = (${func.pre_execute.func});func(${JSON.stringify(func.pre_execute.args)})`)
            await run(this.path,`node`,['pre_execute'])
        }
        this.CreateChildProcess()
        return this
    }
    
    /**
     * @private
     */
     _error(e) {
        this.ws.send(pack({
            op: 5,
            id: this.id,
            d: e.toString()
        }))
    }
}
module.exports = Worker