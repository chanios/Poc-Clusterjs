const { spawn } = require("child_process");
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
    static run(dir,command,args) {
        return new Promise(r=>{
            const _ = spawn(command + (process.platform === 'win32' ? '.cmd' : '') ,args,{
                cwd: dir
            })
            _.on('close', r);
        })
    }
}
module.exports = Utils