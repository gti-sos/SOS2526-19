<script>
    //@ts-nocheck
    import { onMount } from 'svelte';
    import Highcharts from 'highcharts';

    let dataset = {};
    let chart;

    let startYear;
    let endYear;

    let input;

    const nbr = 10;

    async function loadData() {
        const res = await fetch('/api/v1/drought-stats');
        const raw = await res.json();

        const years = [];

        raw.forEach(item => {
            const country = item.country;

            const from = Number(item.from_date);
            const to = Number(item.to_date);

            for (let year = from; year <= to; year++) {
                years.push(year);

                if (!dataset[country]) dataset[country] = {};
                if (!dataset[country][year]) {
                    dataset[country][year] = {
                        severity: 0,
                        duration: 0,
                        alertSum: 0,
                        count: 0
                    };
                }

                dataset[country][year].severity += item.severity_km2;
                dataset[country][year].duration += item.duration_day;
                dataset[country][year].alertSum += item.episode_alert_score;
                dataset[country][year].count += 1;
            }
        });

        startYear = Math.min(...years);
        endYear = Math.max(...years);

        input.min = startYear;
        input.max = endYear;
        input.value = startYear;
    }

    function getEntry(values, year) {
        return values?.[year];
    }

    function getAlert(entry) {
        return entry.count ? entry.alertSum / entry.count : 0;
    }

    function getSeverity(entry) {
        return entry?.severity || 0;
    }

    function getDuration(entry) {
        return entry?.duration || 0;
    }

    function buildSeries(year) {
        year = Number(year);

        const alert = [];
        const severity = [];
        const duration = [];

        Object.entries(dataset).forEach(([country, values]) => {
            const entry = getEntry(values, year);

            alert.push([country, entry ? getAlert(entry) : 0]);
            severity.push([country, entry ? getSeverity(entry) : 0]);
            duration.push([country, entry ? getDuration(entry) : 0]);
        });

        return {
            alert: alert.sort((a, b) => b[1] - a[1]).slice(0, nbr),
            severity: severity.sort((a, b) => b[1] - a[1]).slice(0, nbr),
            duration: duration.sort((a, b) => b[1] - a[1]).slice(0, nbr)
        };
    }

    function updateChart(year) {
        const data = buildSeries(year);

        chart.series[0].setData(data.alert, false);
        chart.series[1].setData(data.severity, false);
        chart.series[2].setData(data.duration, false);

        chart.redraw();

        chart.update({
            subtitle: {
                text: `<span style="font-size: 80px">${year}</span>`,
                useHTML: true
            }
        }, false);
    }

    onMount(async () => {

        input = document.querySelector('input');

        await loadData();

        const data = buildSeries(startYear);

        chart = Highcharts.chart('container', {
            chart: {
                type: 'bar',
                animation: { duration: 500 },
                marginRight: 50
            },

            title: {
                text: 'Drought stats by country (multi metric)',
                align: 'left'
            },

            subtitle: {
                text: `<span style="font-size: 80px">${startYear}</span>`,
                useHTML: true,
                floating: true,
                align: 'right',
                verticalAlign: 'middle'
            },

            legend: {
                enabled: true
            },

            xAxis: {
                type: 'category'
            },

            yAxis: {
                title: {
                    text: 'Values'
                }
            },

            plotOptions: {
                series: {
                    animation: false,
                    dataSorting: {
                        enabled: true,
                        matchByName: true
                    },
                    dataLabels: {
                        enabled: true
                    }
                }
            },

            series: [
                {
                    name: 'Alert Score',
                    data: data.alert
                },
                {
                    name: 'Severity (km²)',
                    data: data.severity
                },
                {
                    name: 'Duration (days)',
                    data: data.duration
                }
            ]
        });

        input.addEventListener('input', (e) => {
            updateChart(Number(e.target.value));
        });
    });
</script>

<input type="range" />

<div id="container" style="height: 500px;"></div>