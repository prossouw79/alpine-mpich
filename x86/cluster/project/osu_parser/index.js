let shell = require('shelljs');
let os = require('os')
let _ = require('lodash');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const folder = 'results';
const { prompt } = require('prompts');
let moment = require('moment');

let awsEnvironmentVars = {};
shell.exec(`env | grep AWS`).stdout.split(os.EOL).filter(x => x.length > 0).map(function (x) {
    let parts = x.split('=');
    awsEnvironmentVars[parts[0]] = parts[1];
})
console.log(awsEnvironmentVars)

const aws_access = awsEnvironmentVars.AWSACCESS
const aws_secret = awsEnvironmentVars.AWSSECRET
const s3_bucket = awsEnvironmentVars.AWSS3BUCKET

let s3Upload = true;
var s3 = null;
if (!aws_access || !aws_secret || !s3_bucket) {
    s3Upload = false;
    console.warn(`No aws credentials found as environment variables. S3 upload will be disabled.`)
    console.warn(`Set: export AWSACCESS=<>, export AWSSECRET=<> and export AWSS3BUCKET=<>`)
} else {
    AWS.config.update({
        accessKeyId: aws_access,
        secretAccessKey: aws_secret
    });
    s3 = new AWS.S3();
}

var argv = require('minimist')(process.argv.slice(2));
let resultFolder = 'results'

let minimalMode = argv['_'].includes('default');
let localOnly = argv['_'].includes('local');

console.log(minimalMode ? 'Running in local testing mode' : 'Running in interactive mode');

//web server
var express = require('express')
var app = express()
var cors = require('cors');

app.use(express.static('public'))
app.use(cors());

let networkInterfaces = shell.exec(`ip -o link show | awk -F': ' '{print $2}'`, { silent: true })
    .stdout.split(/\r?\n/)
    .filter(x => x.length > 0 && !['lo'].includes(x));

let sizeOptions = [];
for (let i = 2; i < 18; i++) {
    let val = Math.pow(2, i);
    // sizeOptions.push({
    //     title : `${val} Bytes`,
    //     value: val
    // })
    sizeOptions.push(val);
}
let nodes = ['10.0.0.11', '10.0.0.12', '10.0.0.13'];

if (minimalMode || localOnly)
    nodes = ['127.0.0.1', 'localhost', `${os.hostname()}`];
else
    nodes = shell.exec(`nmap -sP 10.0.0.0/24 | grep "(10.0.0" | grep -E -o "([0-9]{1,3}[\.]){3}[0-9]{1,3}"`).stdout.split(`\n`).filter(x => x.length > 0);

console.log('Testing MPI access to nodes', nodes)
let mpiTestResults = shell.exec(`mpirun -hosts ${nodes.join(',')} hostname`).stdout.split(`\n`).filter(x => x.length > 0);

let threads = []
for (let i = 1; i <= os.cpus().length; i *= 2) {
    threads.push(i);
}

let warmupRepValues = [0, 10, 30, 50];
let measuredRepValues = [1, 10, 30, 50];
let pt2pt = [
    'osu_bibw',
    'osu_bw',
    'osu_latency',
    'osu_latency_mt',
    'osu_mbw_mr',
    'osu_multi_lat'
].sort();

let collective = [
    'osu_allgather',
    'osu_bcast',
    'osu_scatter',
    'osu_allgatherv',
    'osu_gather',
    'osu_scatterv',
    'osu_allreduce',
    'osu_gatherv',
    'osu_alltoall',
    'osu_alltoallv',
    'osu_reduce',
    'osu_reduce_scatter'
].sort();

(async function () {
    const questions = [
        {
            type: 'text',
            name: 'testTag',
            message: `Enter the test tag`,
            initial: `test-01`,
            format: v => `${v}`
        },
        {
            type: 'select',
            name: 'maxSize',
            message: 'Select the maximum size option',
            choices: sizeOptions.map(function (i) {
                return {
                    title: `-m 1:${i}`,
                    value: i
                };
            })
        },
        {
            type: 'multiselect',
            name: 'participatingNodes',
            message: 'Pick participating nodes',
            choices: nodes.map(function (i) {
                return {
                    title: `Node ${i}`,
                    value: i,
                    selected: true
                };
            })
        },
        {
            type: 'select',
            name: 'threadsToUse',
            message: 'How many threads to use per node (collective tests only)',
            choices: threads.map(
                function (x) {
                    return { title: x, value: x, selected: x == os.cpus().length }
                }).reverse()

        },
        {
            type: 'multiselect',
            name: 'skippedTests',
            message: 'Pick any tests to skip',
            choices: pt2pt
                .concat(collective)
                .map(function (i) {
                    return {
                        title: `${pt2pt.includes(i) ? 'pt2pt: ' : 'collective: '} ${i}`,
                        value: i,
                        selected: [
                            //comment to run by default   
                            //'osu_bibw',
                            'osu_bw',
                            'osu_latency',
                            //'osu_latency_mt',
                            //'osu_mbw_mr',
                            'osu_multi_lat',
                            'osu_allgather',
                            'osu_bcast',
                            'osu_scatter',
                            'osu_allgatherv',
                            'osu_gather',
                            'osu_scatterv',
                            'osu_allreduce',
                            'osu_gatherv',
                            'osu_alltoall',
                            'osu_alltoallv',
                            'osu_reduce',
                            'osu_reduce_scatter'
                        ].includes(i)
                    };
                })
                .sort(x => x.selected)
        },
        {
            type: 'select',
            name: 'packetLoss',
            message: 'Do you want to add packet loss',
            choices: [
                { title: 'PL=0%', value: 0, selected: true },
                { title: 'PL=0,1,2%', value: 2 },
                { title: 'PL=0,1,2,4%', value: 4 },
                { title: 'PL=0,1,2,4,8', value: 8 },
            ]
        },
        {
            type: 'select',
            name: 'networkInterface',
            message: 'To what device should the packet loss be applied',
            choices: [{ title: 'none', value: null, selected: true }]
                .concat(networkInterfaces.map(function (x) {
                    return {
                        title: x,
                        value: x,
                        selected: false
                    }
                }))
        },
        {
            type: 'select',
            name: 'warmupReps',
            message: 'Pick # of warmup transmissions',
            choices: warmupRepValues.map(function (i) {
                return {
                    title: `-x ${i}`,
                    value: i
                };
            })
        },
        {
            type: 'select',
            name: 'measuredReps',
            message: 'Pick # of measured transmissions',
            choices: measuredRepValues.map(function (i) {
                return {
                    title: `-i ${i}`,
                    value: i
                };
            })
        }
    ];
    let requiredKeys = ['testTag', 'maxSize', 'participatingNodes', 'threadsToUse', 'skippedTests', 'packetLoss', 'networkInterface', 'warmupReps', 'measuredReps']
    const conf = minimalMode ?
        {
            testTag: 'test-01',
            maxSize: 1024,
            participatingNodes: ['127.0.0.1', 'localhost', `${os.hostname()}`],
            threadsToUse: 1,
            skippedTests: collective.concat(pt2pt).filter(function (x) { return x != "osu_bw" }),
            packetLoss: 0,
            networkInterface: null,
            warmupReps: 1,
            measuredReps: 3
        }
        : await prompt(questions);
    requiredKeys.forEach(key => {
        if (!Object.keys(conf).includes(key)) {
            console.error(`Experiment config does not have the required key: `, key);
            process.exit();
        }
    });

    //remove older runs in this dir
    fs.readdir(resultFolder, (err, files) => {
        files.forEach(file => {
            if (file.endsWith('.out') && file.startsWith(conf.testTag)) {
                shell.exec(`rm ${resultFolder}/${file}`)
            }
        })
    })

    run(conf)
})();


function run(conf) {

    let runTimestamp = new Date();

    let osu_args = `-x ${conf.warmupReps} -i ${conf.measuredReps} -m 1:${conf.maxSize}`;

    let distinctNodes = [];
    let distinctNodesThreads = [];

    conf.participatingNodes.forEach(a => {
        conf.participatingNodes.forEach(b => {
            let pair = `${a},${b}`;
            let threadPair = `${a}:${conf.threadsToUse},${b}:${conf.threadsToUse}`;

            let inverse_pair = `${b},${a}`;
            let inverse_threadPair = `${b}:${conf.threadsToUse},${a}:${conf.threadsToUse}`;

            if (a != b) {
                if (!distinctNodes.includes(pair) && !distinctNodes.includes(inverse_pair))
                    distinctNodes.push(pair);

                if (!distinctNodesThreads.includes(threadPair) && !distinctNodesThreads.includes(inverse_threadPair))
                    distinctNodesThreads.push(threadPair);
            }
        });
    });

    benchList = [];

    pt2pt
        .filter(x => !conf.skippedTests.includes(x))
        .sort()
        .forEach(ptptpbench => {
            distinctNodes.forEach(pair => {
                let fileName = `${conf.testTag}-pt2pt-${ptptpbench}${pair}.out`;
                fileName = fileName.replace(new RegExp('10.0.0.1', 'g'), "-")
                fileName = fileName.replace(new RegExp(',', 'g'), "");
                fileName = fileName.replace(new RegExp(':', 'g'), "");


                benchList.push({
                    command: 'mpirun -hosts',
                    pair: pair,
                    bench: ptptpbench,
                    args: osu_args,
                    logfile: fileName
                })
            });
        });

    collective
        .filter(x => !conf.skippedTests.includes(x))
        .sort()
        .forEach(collectivebench => {
            distinctNodesThreads.forEach(pair => {
                let fileName = `${conf.testTag}-collective-${collectivebench}${pair}.out`;
                fileName = fileName.replace(new RegExp('10.0.0.1', 'g'), "-")
                fileName = fileName.replace(new RegExp(',', 'g'), "");
                fileName = fileName.replace(new RegExp(':', 'g'), "");

                benchList.push({
                    command: 'mpirun -hosts',
                    pair: pair,
                    bench: collectivebench,
                    args: osu_args,
                    logfile: fileName
                });
            });
        });

    benchList = _.orderBy(benchList, b => b.bench)

    console.log(benchList)

    let lastBench = '';

    let packetLossModes = [0];

    if (conf.networkInterface) {
        for (let i = 1; i <= conf.packetLoss; i *= 2) {
            packetLossModes.push(i);
        }
    }
    let subfolder = moment(runTimestamp).format('hh-mm-MM-DD-YY');
    packetLossModes.forEach(packetLoss => {
        if (conf.networkInterface) {
            console.log(`Applying ${packetLoss}% packet loss to ${conf.participatingNodes.join(',')} on ${conf.networkInterface}`);
            shell.exec(`mpirun -hosts ${conf.participatingNodes.join(',')} tc qdisc del dev ${conf.networkInterface} root netem`)
            shell.exec(`mpirun -hosts ${conf.participatingNodes.join(',')} tc qdisc add dev ${conf.networkInterface} root netem loss ${packetLoss}%`);
        }
        shell.exec(`mkdir -p ${resultFolder}/${subfolder}`)

        for (let i = 0; i < benchList.length; i++) {
            const b = benchList[i];
            let padding = '*********************************************************';
            if (b.bench != lastBench) {
                lastBench = b.bench;
                let displayString = `       ${b.bench}       `;
                let desiredLength = padding.length;
                let padL = true;
                console.log(padding);
                while (displayString.length < desiredLength) {
                    displayString = padL ? ('*' + displayString) : (displayString + '*');

                    padL = !padL;
                }
                console.log(displayString)
                console.log(padding);
            }
            console.log(`Running ${i + 1}/${benchList.length}: `);
            let destination = `${resultFolder}/${subfolder}/${b.logfile}`
            let command = `${b.command} ${b.pair} ${b.bench} ${b.args}`
            shell.exec(`echo '# test identifier: ${conf.testTag}' > ${destination}`);
            shell.exec(`echo '# netem packet loss: ${packetLoss}%' >> ${destination}`);
            shell.exec(`echo '# command run: ${command}' >> ${destination}`)

            let job = `${command} >> ${destination}`;
            console.log(job)
            shell.exec(job);
        }
    });


    let benches = pt2pt.concat(collective);

    let processedResults = {};
    benches.forEach(bench => {
        if (bench == 'osu_mbw_mr' && !conf.skippedTests.includes('osu_mbw_mr')) {
            processedResults[`${bench}_a`] = {
                runs: []
            }
            processedResults[`${bench}_b`] = {
                runs: []
            }
        } else {
            processedResults[bench] = {
                runs: []
            }
        }
    });

    fs.readdir(`${resultFolder}/${subfolder}`, (err, files) => {
        files.forEach(file => {
            if (file.endsWith('.out')) {
                let path = `${resultFolder}/${subfolder}/${file}`;
                console.log(`Parsing: ${path}`)

                let filecontent = fs.readFileSync(path).toString();
                let fileLines = filecontent.split(`\n`);

                let currentBench = '';
                let pair = '';

                fileLines.forEach(line => {
                    if (currentBench == '' || pair == '') {
                        let lineParts = line.split(' ');

                        for (let i = 0; i < lineParts.length; i++) {
                            const part = lineParts[i];
                            if (part == '-hosts') {
                                pair = lineParts[i + 1];
                            }
                            if (part.startsWith('osu_')) {
                                currentBench = part;
                            }
                        }
                    }
                });

                switch (currentBench) {
                    //PT2PT Tests
                    case 'osu_bibw':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Bandwidth (MB/s)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })

                            break;
                        }
                    case 'osu_bw':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Bandwidth (MB/s)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_latency':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Latency (us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_latency_mt':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Latency (us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_mbw_mr':
                        {
                            let pairResultMB = [];
                            let pairResultMR = [];

                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);

                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResultMB.push([parts[0],
                                        parts[1]
                                        ])
                                        pairResultMR.push([parts[0],
                                        parts[2]
                                        ])
                                    }
                                }
                            }
                            processedResults[`${currentBench}_a`].labelX = "Size";
                            processedResults[`${currentBench}_b`].labelX = "Size";


                            processedResults[`${currentBench}_a`].labelY = "MB/s";
                            processedResults[`${currentBench}_b`].labelY = "Messages/s";

                            processedResults[`${currentBench}_a`].runs.push({ pair: pair, results: pairResultMB })
                            processedResults[`${currentBench}_b`].runs.push({ pair: pair, results: pairResultMR })

                            break;
                        }
                    case 'osu_multi_lat':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Latency (us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_allgather':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_allgatherv':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_allreduce':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_alltoall':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_alltoallv':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }

                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_bcast':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_gather':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_gatherv':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_reduce':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_reduce_scatter':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_scatter':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                    case 'osu_scatterv':
                        {
                            let pairResult = [];
                            for (let i = 2; i < fileLines.length; i++) {
                                const l = fileLines[i];
                                if (!l.startsWith('#')) {
                                    let parts = l.match(/\S+/g);
                                    if (parts) {
                                        parts = _.map(parts, i => parseFloat(i));
                                        pairResult.push(parts);
                                    }
                                }
                            }
                            if (!processedResults[currentBench])
                                processedResults[currentBench] = { labelX: '', labelY: '', runs: [] }

                            processedResults[currentBench].labelX = "Size";
                            processedResults[currentBench].labelY = "Avg Latency(us)";
                            processedResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                }
            }
        })

        //check empty keys
        let writeDate = new Date();
        let d = writeDate.toLocaleDateString().replace(new RegExp('/', 'g'), "-")
        let t = writeDate.toLocaleTimeString().replace(new RegExp(':', 'g'), "-")

        shell.exec(`mkdir -p csv`)

        let csvString = '';
        //build csv
        Object.keys(processedResults).forEach(key => {
            let bench = processedResults[key];
            if (!bench.runs || bench.runs.length == 0) {
                // console.error('Bench does not have runs!', bench);
            } else {
                let data = [];
                //get keys (message size)
                data['allKeys'] = _.map(bench.runs[0].results, function (i) {
                    return i[0]
                });
                // get kv pairs
                bench.runs.forEach(run => {
                    let kv = [];
                    run.results.forEach(res => {
                        kv.push({
                            key: parseInt(res[0]),
                            value: parseFloat(res[1])
                        })
                    });
                    data.push(kv);
                });

                let csvLines = [];


                data.allKeys.forEach(size => {
                    csvLines.push(size + ';');
                });

                bench.runs.forEach(run => {
                    let c = 0;
                    run.results.forEach(res => {
                        csvLines[c++] += res[1] + ";";
                    })
                })
                //remove trailing ;
                for (let i = 0; i < csvLines.length; i++) {
                    if (csvLines[i].endsWith(";"))
                        csvLines[i] = csvLines[i].slice(0, -1);
                }

                csvLines.splice(0, 0, 'Size;' + _.map(bench.runs, i => i.pair.replace(',', '-')).join(';'))
                csvLines.splice(0, 0, `${key};${bench.labelY}`)

                let latexTable = csvLinesToLatexTable(
                    csvLines,
                    `Results of ${key} in test ${subfolder}`,
                    `${key.replace('_', '-')}-${subfolder}`);

                fs.writeFileSync(`${resultFolder}/${subfolder}/${key}-${conf.testTag}.tex`, latexTable);
                console.log('Saved LaTex');

                csvLines.forEach(l => {
                    csvString += l + os.EOL;
                });
                fs.writeFileSync(`${resultFolder}/${subfolder}/${conf.testTag}.csv`, csvString);
                console.log('Saved CSV')

            }

        });

        let jsonStream = fs.writeFileSync(`${resultFolder}/${subfolder}/${conf.testTag}.json`, JSON.stringify(processedResults))
        console.log('Saved JSON')

        //replace zip
        shell.exec(`rm -f ${conf.testTag}.zip`);
        shell.exec(`mkdir -p resultSets`);
        shell.exec(`zip -r9 ${conf.testTag}.zip ${resultFolder}/${subfolder}`);
        shell.exec(`mv -f ${conf.testTag}.zip resultSets/`);
        let zipPath = `resultSets/${conf.testTag}.zip`;

        console.log("UPLOAD:", s3Upload, minimalMode)
        if (s3Upload && !minimalMode) {
            //configuring parameters
            var params = {
                Bucket: s3_bucket,
                Body: fs.createReadStream(zipPath),
                Key: Date.now() + "_" + path.basename(zipPath)
            };

            s3.upload(params, function (err, data) {
                //handle error
                if (err) {
                    console.log("Error", err);
                }

                //success
                if (data) {
                    console.log("Uploaded in:", data.Location);
                }
            });
        }
    });

    if (!minimalMode) {
        //start webserver
        let port = 3000;
        app.listen(port)
        console.log(`Graphing server ready at port: ${port}`)

        app.get('/', function (req, res) {
            res.sendFile(path.join(__dirname + '/index.html'));
        })

        app.get('/data', function (req, res) {
            res.send(processedResults);
        })
    }

    function csvLinesToLatexTable(csvLines, caption = '', label = '', captionBottom = true) {
        let maxcolumns = _.max(csvLines.map(x => x.split(';').length));

        //build table prefix
        let latexTablePrefix = `\\begin{table}` + os.EOL;
        if (!captionBottom) {
            latexTablePrefix += `\\caption{${caption}}` + os.EOL;
            latexTablePrefix += `\\label{tab:${label}}` + os.EOL;
        }
        latexTablePrefix += `\\centering` + os.EOL;
        latexTablePrefix += `\\begin{tabular}{${'c'.repeat(maxcolumns)}}` + os.EOL;

        //build table suffix
        let latexTableSuffix = `\\end{tabular}` + os.EOL;
        if (captionBottom) {
            latexTableSuffix += `\\caption{${caption}}` + os.EOL;
            latexTableSuffix += `\\label{tab:${label}}` + os.EOL;
        }
        latexTableSuffix += `\\end{table}` + os.EOL;

        let latexLines = [];

        csvLines.forEach(dl => {
            let parts = dl.split(';')
            while (parts.length != maxcolumns) {
                parts.push('')
            }
            latexLines.push(parts);
        });

        let latexTableContent = ``;
        latexLines.forEach(line => {
            let latexLine = line.join('\t&\t');
            let bottomline = latexLine.startsWith('Size') || latexLine.startsWith('osu');

            latexTableContent += latexLine + `\\\\` + (bottomline ? '   \\hline' : '') + os.EOL;
        });
        console.log(latexTableContent);

        let table = latexTablePrefix + latexTableContent + latexTableSuffix;
        table = table.replace(new RegExp('_', 'g'), '\\_')
        console.log(table);
        return table;
    }
}