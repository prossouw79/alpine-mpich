const folder = 'results';
const fs = require('fs');
const _ = require('lodash')

//web server
var express = require('express')
var app = express()
var cors = require('cors');

app.use(express.static('public'))
app.use(cors());

let benches = [
    'osu_allgather', 'osu_allgatherv', 'osu_allreduce', 'osu_alltoall', 'osu_alltoallv', 'osu_bcast', 'osu_bibw', 'osu_bw', 'osu_gather', 'osu_gatherv', 'osu_latency', 'osu_latency_mt', 'osu_mbw_mr', 'osu_multi_lat', 'osu_reduce', 'osu_reduce_scatter', 'osu_scatter', 'osu_scatterv'
]

finalResults = {};
benches.forEach(bench => {
    if (bench == 'osu_mbw_mr') {
        finalResults[`${bench}_a`] = {
            runs: []
        }
        finalResults[`${bench}_b`] = {
            runs: []
        }
    } else {
        finalResults[bench] = {
            runs: []
        }
    }
});

fs.readdir(folder, (err, files) => {
    files.forEach(file => {
            if (file.endsWith('.out')) {
                let path = `${folder}/${file}`;

                let filecontent = fs.readFileSync(path).toString();
                let fileLines = filecontent.split(`\n`);

                let currentBench = fileLines[0];
                // console.log(currentBench)
                let pair = fileLines[1];

                let resultLines = '';
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
                                        pairResult.push(parts)
                                    }
                                }
                            }

                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Bandwidth (MB/s)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })

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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Bandwidth (MB/s)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Latency (us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Latency (us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                            finalResults[`${currentBench}_a`].labelX = "Size";
                            finalResults[`${currentBench}_b`].labelX = "Size";


                            finalResults[`${currentBench}_a`].labelY = "MB/s";
                            finalResults[`${currentBench}_b`].labelY = "Messages/s";

                            finalResults[`${currentBench}_a`].runs.push({ pair: pair, results: pairResultMB })
                            finalResults[`${currentBench}_b`].runs.push({ pair: pair, results: pairResultMR })

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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Latency (us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
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
                                        pairResult.push(parts)
                                    }
                                }
                            }
                            finalResults[currentBench].labelX = "Size";
                            finalResults[currentBench].labelY = "Avg Latency(us)";
                            finalResults[currentBench].runs.push({ pair: pair, results: pairResult })
                            break;
                        }
                }
            }
        })
        //check empty keys
    let writeDate = new Date();
    let d = writeDate.toLocaleDateString().replace(new RegExp('/', 'g'), "-")
    let t = writeDate.toLocaleTimeString().replace(new RegExp(':', 'g'), "-")

    /*
    fs.writeFileSync(`${d} - ${t} - results.json`, JSON.stringify(finalResults))


    let csvStream = fs.createWriteStream(`csv/allresults.csv`, {
      flags: 'a' //append
    });

    Object.keys(finalResults).forEach(key => {
      let bench = finalResults[key];

      let data = [];
      //get keys
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

      //build csv
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

      csvLines.forEach(l => {
        csvStream.write(l + '\n');
      });
    });
    csvStream.end();
    */
})

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/data', function(req, res) {
    res.send(finalResults);
})

let port = 3000;
app.listen(port)
console.log(`Ready at port: ${port}`)