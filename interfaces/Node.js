const WsClient = require("./WsClient")

class ClusterNode extends WsClient {
    constructor(Cluster,options){
        super(options.ws)
        this.functions = new Map()
        this.ops[4] = m => { // Add op 4 (event bus)
            let _func = this.functions.get(m.id)
            if(_func.events && _func.events[m.t]) {
                _func.events[m.t](m.d)
            }
        }
        this.ops[5] = m => { // Add op 5 (worker error)
            this.functions.delete(m.id)
            throw new Error(m.d)
        } 
        this.manager = Cluster

        this.connect(`ws://${options.host}:${options.port}`,{
            secret: options.secret
        })
        this.options = options
    }

    async _UseFunction(id,args) {
        if(!this.functions.has(id)) throw new Error('Function not Exist')
        let d = await this.send({
            op: 3,
            d: {
                id,args
            }
        },true)
        if(d.e) throw new Error(d.r)
        return d.r
    }
    _TidyFunction(id) {
        return this.send({
            op: 4,
            d: {
                id
            }
        },true)
    }
    _CreateFunction(id,func) {
        if(typeof func == 'function') {
            func = {
                execute: func
            }
        }
        func.execute = func.execute.toString()
        return this.send({
            op: 2,
            d: {
                id,func
            }
        },true).then(s=>{if(s) this.functions.set(id,func);return s})
    }
    _KillWorkerOfFunction(id) {
        return this.send({
            op: 5,
            d: {
                id
            }
        },true)
    }
}
module.exports = ClusterNode