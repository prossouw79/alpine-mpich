angular.module('graphPage', ["chart.js", "plotly"])
    .constant('_', window._)
    .config(['ChartJsProvider', function (ChartJsProvider) {
        // Configure all charts
        ChartJsProvider.setOptions({
            responsive: true,
            fontColor: 'red'
        });
    }])
    .controller('graphPageController', ['$http', function ($http) {
        var vm = this;
        vm.showOnlyAverage = true;
        vm.plotlycharts = [];
        vm.plotlychartsAverageOnly = [];
        vm.model = {};

        vm.getPlotlyJs = function (chartTitle, data, xLabel, yLabel) {
            return {
                title: chartTitle,
                data: data,
                layout: {
                    height: 1080,
                    width: 1920,
                    title: false,
                    margin: {
                        l: 225,
                        r: 50,
                        b: 150,
                        t: 25,
                        pad: 4
                    },
                    font: {
                        family: 'Computer Modern, serif',
                        size: 32,
                    },
                    xaxis: {
                        // autorange: true,
                        title: xLabel
                    },
                    yaxis: {
                        autorange: true,
                        title: yLabel
                    },
                    colorway: ['#aacbff', '#b1ffaa', '#ffcaaa']
                },
                options: {
                    showLink: false,
                    displayLogo: false,
                }
            }
        }

        vm.toggleShowAverage = function () {
            vm.showOnlyAverage = !vm.showOnlyAverage;
        }

        vm.parseGraphs = function parseGraphs(showAverage = false) {
            vm.plotlycharts = [];

            Object.keys(vm.model).forEach(b => {
                let bench = vm.model[b];

                if (!bench.runs || bench.runs.length == 0)
                    return;

                let chartTitle = '';
                if (b.includes('osu_mbw_mr')) {
                    chartTitle = `OSU ${b.replace('osu_', '').replace('_a', ' (bandwidth)').replace('_b', ' (message rate)')}`;
                } else {
                    chartTitle = `OSU ${b.replace('osu_', '')}`;
                }
                let xLabel = bench.labelX.replace('Size', 'Size (bytes)')
                let yLabel = bench.labelY.replace('(us)', ' (us)');
                let traces = [];

                for (let i = 0; i < bench.runs.length; i++) {
                    let trace = {};
                    const run = bench.runs[i];

                    trace = {
                        name: run.pair,
                        x: run.results.map(i => `${i[0]}B`),
                        y: run.results.map(x => x[1]),
                        line: {
                            width: 4,
                        }
                    }
                    traces.push(trace);
                }


                let allYValues = _.map(traces, trace => trace.y);


                let pivotedArr = [];
                //by index
                for (let i = 0; i < allYValues[0].length; i++) {
                    pivotedArr.push(allYValues.map(t => t[i]));
                }
                let meanYValues = [];
                let stdevYValues = [];

                pivotedArr.forEach(s => {
                    let averageAtThisSize = _.mean(s)
                    meanYValues.push(averageAtThisSize);
                    let stddevAtThisSize = Math.sqrt(_.sum(_.map(s, (i) => Math.pow((i - averageAtThisSize), 2))) / s.length);
                    stdevYValues.push(stddevAtThisSize);
                });

                traces.push({
                    name: ' Average',
                    x: traces[0].x,
                    y: meanYValues,
                    line: {
                        shape: 'spline',
                        dash: 'dot',
                        width: 8,
                        color: ('rgba(0, 0, 0,0.7)'),
                    },
                    error_y: {
                        type: 'data',
                        array: stdevYValues,
                        visible: true
                    },
                });

                vm.plotlycharts.push(vm.getPlotlyJs(chartTitle,
                    _.filter(traces, t => !t.name.includes('Average')),
                    xLabel,
                    yLabel));
                vm.plotlychartsAverageOnly.push(vm.getPlotlyJs(chartTitle,
                    _.filter(traces, t => t.name.includes('Average')),
                    xLabel,
                    yLabel));
            })
        }

        $http.get('http://localhost:3000/data')
            .then(function (resp) {
                vm.chartjscharts = [];
                vm.model = resp.data;

                vm.parseGraphs(true);
            });
    }]);