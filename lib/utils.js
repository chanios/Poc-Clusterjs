class Utils {
    static pack(m){
        return JSON.stringify(m)
    }
    static unpack(m){
        return JSON.parse(m)
    }
    static sleep(ms) {
        return new Promise(r=>setTimeout(r,ms))
    }
    static GetNextMsTime(ms) {
        return Date.now() + ms
    }
}
module.exports = Utils