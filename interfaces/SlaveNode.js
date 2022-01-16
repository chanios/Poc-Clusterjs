const { mkdirSync } = require("fs")
const { join } = require("path")
const { unpack,pack } = require("../lib/utils")
const Worker = require("./SlaveFunction")
module.exports = class SlaveNode {
    constructor(ws) {
        
        this.path = join(require('os').tmpdir(),'/chanios/poc_clustering_programming')

        /**
         * @type {Map<String,import('./SlaveFunction')>}
         */
        this.workers = new Map()
        mkdirSync(this.path,{recursive:true})
        this.ops = {
            2: async m => { // Create Worker
                let worker = new Worker(this,ws,{
                    id: m.d.id,
                    path: join(this.path,m.d.id)
                })
                try {
                    await worker.init(m.d.func)
                    this.workers.set(m.d.id,worker)
                    ws.send(pack({
                        op: 10,
                        d: true,
                        c: m.c
                    }))
                } catch (error) {
                    console.error(error)
                    worker.tidy()
                    ws.send(pack({
                        op: 10,
                        d: false,
                        c: m.c
                    }))
                }
            },
            3: async m => { // Use Worker
                let worker = this.workers.get(m.d.id)
                if(worker) {
                    ws.send(pack({
                        op: 10,
                        d: await worker.use(m.d.args),
                        c: m.c
                    }))
                }
            },
            4: async m => { // tidy Worker
                let worker = this.workers.get(m.d.id)
                if(worker) {
                    ws.send(pack({
                        op: 10,
                        d: await worker.tidy(),
                        c: m.c
                    }))
                }
            }
        }
        ws.on('message',async m => {
            m = unpack(m)
            this.ops[m.op] && this.ops[m.op](m)
        })
        ws.on('close',()=>{
            this.workers.forEach(w=>{
                console.log('Master Disconnected killing pid: ' + w.child.pid)
                w.tidy()
            })
        })
    }
}