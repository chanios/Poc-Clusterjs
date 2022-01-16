const { pack,unpack } = require('../lib/utils')
const WebSocket = require('ws')
const EventsEmitter = require('events')
const { nanoid } = require('nanoid')
module.exports = class WsClient extends EventsEmitter {
    constructor(options={}){
        super()
        this.ws = WebSocket
        this.callbacks = new Map()

        this.timeout = options.timeout
        this.queue = []
        this.connected = false
        this.login_data = {}
        this.ops = {
            0: m => {
                this.send({op:1,d:this.login_data})
                this._flush_queue()
                this.connected = true
            },
            3: m => {
                this.connected = true
                this.emit(m.t,...m.d)
            },
            10: m => {
                let c = this.callbacks.get(m.c)
                if(c) {
                    c.r(m.d)
                    clearTimeout(c.t)
                    this.callbacks.delete(m.c)
                }
            }
        }
    }
    destroy(){
        this.ws.close()
        this.ws = null
        this.destroyed = true
        this.callbacks = null
        this.login_data = null
        return this
    }
    craft_callback(callback_id){
        return new Promise(r=>{
            let t;
            if(this.timeout) t = setTimeout(() => {
                if(this.callbacks && this.callbacks.get(callback_id)){
                    this.callbacks.delete(callback_id)
                    r()
                }
            }, this.timeout) 
            this.callbacks.set(callback_id,{r,t})
        })
    }
    _flush_queue() {
        if(this.ws.readyState == 1) {
            for (let i = 0; i < this.queue.length; i++) {
                this.ws.send(pack(this.queue[i]))
            }
            this.queue.length = 0
        }
    }
    connect(host,login_data={}) {
        this.ws = new WebSocket(host)
        this.login_data = login_data
        this.ws.on('message',m=>{
            m = unpack(m)
            this.ops[m.op] && this.ops[m.op](m)
        })
        this.ws.on('close',()=>{
            this.emit('close')
            this.connected = false
            setTimeout(()=>this.connect(host,this.login_data),2000)
        })
        this.ws.on('error',err=>console.error('[WsClient]',err))
        return this
    }
    /**
     * 
     * @param {Object} payload 
     * @param {Boolean} callback 
     * @return {Promise<any>}
     */
    send(payload={},callback = false){
        if(!this.ws) return;
        if(this.ws.readyState != 1){
            this.queue.push(payload)
        }
        if(callback) {
            let callback_id = nanoid(3)
            payload.c = callback_id
            if(this.ws.readyState == 1) this.ws.send(pack(payload))
            return this.craft_callback(callback_id)
        }
        if(this.ws.readyState == 1) this.ws.send(pack(payload))
    }
    send_event(name,args=[],callback = false){
        if(callback) {
            let callback_id = nanoid(3)
            args.push(callback_id)
            let p = this.craft_callback(callback_id)
            this.send({op:3,t:name,d:args})
            return p
        } else return this.send({op:3,t:name,d:args})
    }
}