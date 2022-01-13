const { mkdirSync, writeFileSync, rmSync } = require("fs")
const { join } = require("path")
const { unpack,pack } = require("../lib/utils")
const { fork, spawn } = require("child_process");
const { nanoid } = require("nanoid");
module.exports = class SlaveNode {
    constructor(ws) {
        
        this.path = join(require('os').tmpdir(),'/chanios/poc_clustering_programming')
        

        this.functions = new Map()
        mkdirSync(this.path,{recursive:true})

        ws.on('message',async m => {
            m = unpack(m)
            switch (m.op) {
                case 2: // Create Function
                    ws.send(pack({
                        op: 10,
                        d: await this.initFunction(m.d.id,m.d.func),
                        c: m.c
                    }))
                break;
                case 3: // Use Function
                    let worker = this.functions.get(m.d.id)
                    if(worker) {
                        let id = await nanoid()
                        if(m.c) worker.callbacks.set(id,d=>{
                            ws.send(pack({
                                op: 10,
                                d: d,
                                c: m.c
                            }))
                        })
                        worker.send({
                            a: m.d.args,
                            c: id
                        })
                    }
                break;
                default:
                break;
            }
        })
        ws.on('close',()=>{
            this.functions.forEach(w=>{
                console.log('Master Disconnected killing pid: ' + w.pid)
                this.tidyFunction(w)
            })
        })
        
        process.on('beforeExit',()=>{
            this.functions.forEach(w=>this.tidyFunction(w))
        })
    }
    run(dir,command,args) {
        return new Promise(r=>{
            const _ = spawn(command + (process.platform === 'win32' ? '.cmd' : '') ,args,{
                cwd: dir
            })
            _.on('close', r);
        })

    }
    async tidyFunction(w) {
        try {
            await w.kill()
            rmSync(join(this.path,w.id),{recursive:true})
        } catch (error) {
            console.error(error)
        }
    }
    async initFunction(id,func) {
        mkdirSync(join(this.path,id),{recursive:true})
        await this.run(join(this.path,id),`npm`,['i',...func.require])
        await writeFileSync(join(this.path,id,'func.js'),`
        const func = (${func.execute});
        process.on('message',async msg=>{
            try{
                process.send({d:{r:await func(...msg.a)},c:msg.c})
            }catch(e) {
                console.error(e)
                process.send({d:{r:e.toString(),e:true},c:msg.c})
            }
        })`)
        if(func.pre_execute) {
            await writeFileSync(join(this.path,id,'pre_execute.js'),`const func = (${func.pre_execute.func});func(${JSON.stringify(func.pre_execute.args)})`)
            await this.run(join(this.path,id),`node`,['pre_execute'])
        }
        let worker = fork(join(this.path,id,'func.js'))
        worker.callbacks = new Map()
        worker.id = id
        worker.on('message',msg=>{
            if(msg.c) {
                let callback = worker.callbacks.get(msg.c)
                if(callback) {
                    worker.callbacks.delete(msg.c)
                    callback(msg.d)
                }
            }
        })
        worker.on('close',()=>{
            worker.callbacks = null
        })
        this.functions.set(id,worker)
        return
    }
}