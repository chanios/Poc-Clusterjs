const Clusters = require("./interfaces/Clusters")
const worker_nodes = new Clusters([
    {
        host: '127.0.0.1',
        port: 2524,
        secret: 'test'
    },
    {
        host: 'other_node',
        port: 2524,
        secret: 'test'
    }
]);

(async()=>{

    // Simple usage (●'◡'●)
    let sum = await worker_nodes.Function((a,b)=>a+b) // create function
    await sum(1,2).then(console.log) // -> 3 use function on one node(sequence)
    await sum.all(1,2).then(console.log) // -> [3,3] use function on all node(parallel)
    sum.tidy() // release memory & disk!
    
    // Advance usage (❁´◡`❁)
    let get = await worker_nodes.Function({ // Create Http Request Function
        execute: url => {
            let c = require('centra')
            return c(url).send().then(res=>res.text())
        },
        require: ['centra']
    })

    await get('https://discord.com').then(console.log) // -> <html>.... use function!
    get.tidy() // don't forget to tidy after use (❁´◡`❁)


    // Morree Advance usage o(≧口≦)o
    const cmd = await worker_nodes.Function({ // Run Remote Command(Oh who create rce here OwO)
        execute: (command='',args=[]) => 
            new Promise(r => {
                const { spawn } = require("child_process");
                const _ = spawn(command ,args)
                
                _.stdout.on('data', _ => node.emit('stdout',_+''));// <-- emit event to client
                _.stderr.on('data', _ => node.emit('stdout',_+''));
                _.on('exit', r);
        }),
        events: { // received event based on their name
            stdout: d => process.stdout.write(d+''),
        }
    })
    
    const inquirer = require('inquirer')
    while (true) {
        let answers = await inquirer.prompt([{type: 'input',name: 'cmd',message: 'chanios@>'}])
        let args = ((process.platform === 'win32' ? 'cmd.exe /c ' : 'bash -c ') + answers.cmd).split(' ')
        await cmd(args.shift(),args)
    }
})()