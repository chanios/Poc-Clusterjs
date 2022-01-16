const { pack,unpack } = require('../lib/utils')
const WebSocketServer = require('ws').Server
const SlaveNode = require('./SlaveNode')

class Slave {
    constructor() {
        
    }
    init(port,key) {
        const wss = new WebSocketServer({port:port})
        console.log(`Waiting for connection on port ${port}`)
        wss.on('connection',(ws)=>{
            const OnMsg = (m) => {
                m = unpack(m)
                switch (m.op) {
                    case 1:
                        if(key == m.d.secret) ws.authed = true
                        new SlaveNode(ws)
                        if(!ws.authed) return ws.close()
                        console.log(ws.authed,"Authed!")
                        ws.removeListener('message',OnMsg)
                    break;
                    default:
                    break;
                }
            }
            ws.on('message',OnMsg)
            ws.send(pack({
                op: 0,
                d: 45000
            }))
        })
    }
}
module.exports = Slave