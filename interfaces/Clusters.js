const { nanoid } = require("nanoid")
const { sleep } = require("../lib/utils")
const ClusterNode = require("./Node")

class Clusters {
    constructor(nodes = []) {
        this.nodes = nodes.map(node=>new ClusterNode(this,node))
    }
    async Function(func) {
        let id = nanoid()
        let i = 0
        let is_nodes_ready = false
        await Promise.all(this.nodes.map(node=>node._CreateFunction(id,func))).then(()=>{
            is_nodes_ready = true
        })
        return (...args) => {if(!is_nodes_ready) throw new Error('some node has not ready!');if(!this.nodes[i]) i = 0;return this.nodes[i++]._UseFunction(id,args)}
    }
}
module.exports = Clusters