const { nanoid } = require("nanoid")
const { sleep } = require("../lib/utils")
const ClusterNode = require("./Node")

class Clusters {
    constructor(nodes = [],options={}) {
        this.nodes = nodes.map(node=>new ClusterNode(this,{...node,ws:options.ws}))
    }
    async Function(func) {
        let id = nanoid()
        await Promise.all(this.nodes.map(node=>node._CreateFunction(id,func).then(()=>console.log(`[${node.options.host}] > Settings for ${id} Finshed!`))))
        return this._CreateFunctionDriver(id)
    }
    /**
     * @private
     */
    async _CreateFunctionDriver(id) {
        let i = 0
        let _ = this
        function main(...args) {
            if(!_.nodes[i]) i = 0;
            return _.nodes[i++]._UseFunction(id,args)
        }
        main.tidy = function() {
            return Promise.all(_.nodes.map(node=>node._TidyFunction(id)))
        }
        main.all = function(...args) {
            return Promise.all(_.nodes.map(node=>node._UseFunction(id,args)))
        }
        main.kill = function () {
            return Promise.all(_.nodes.map(node=>node._KillWorkerOfFunction(id)))
        }
        return main
    }
}
module.exports = Clusters