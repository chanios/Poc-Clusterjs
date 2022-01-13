const WsClient = require("./WsClient")

class ClusterNode extends WsClient {
    constructor(Cluster,options){
        super()
        this.manager = Cluster

        this.connect(`ws://${options.host}:${options.port}`,{
            secret: options.secret
        })
        this.options = options
    }

    async _UseFunction(id,args) {
        let d = await this.send({
            op: 3,
            d: {
                id,args
            }
        },true)
        if(d.e) throw new Error(d.r)
        return d.r
    }

    _CreateFunction(id,func) {
        func.execute = func.execute.toString()
        return this.send({
            op: 2,
            d: {
                id,func
            }
        },true)
    }
}
module.exports = ClusterNode