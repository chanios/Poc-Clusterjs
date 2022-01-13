const Clusters = require("./interfaces/Clusters")

const worker_nodes = new Clusters([
    {
        id: 'local',
        host: '127.0.0.1',
        port: 2524,
        secret: 'test'
    }
]);
(async()=>{
    const get = await worker_nodes.Function({
        execute: (url)=>{
            let c = require('centra')
            return c(url).send().then(res=>res.text())
        },
        require: [
            'centra'
        ],
    })
    setInterval(() => {
        get('https://discord.com').then(console.log)
    }, 1000);
})();