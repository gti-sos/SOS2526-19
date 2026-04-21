<script>
    import Highcharts from 'highcharts';
    import { onMount } from 'svelte';

    let myData = $state();

    onMount(async () => {
        const res = await fetch("/api/v1/drought-stats");
        myData = await res.json();

        // @ts-ignore
        const grouped = myData.reduce((acc, item) => {
            const country = item.country;

            if (!acc[country]) {
                acc[country] = {
                    severity: 0,
                    duration: 0
                };
            }

            acc[country].severity += item.severity_km2;
            acc[country].duration += item.duration_day;

            return acc;
        }, {});

        const countries = Object.keys(grouped);

        const severityData = countries.map(country => grouped[country].severity);
        const durationData = countries.map(country => grouped[country].duration);

        // @ts-ignore
        Highcharts.chart('container', {
            chart: {
                type: 'bar',
                reflow: true
            },
            title: {
                text: 'Drought stats by country'
            },
            xAxis: {
                categories: countries,
                title: {
                    text: 'Country'
                }
            },
            yAxis: [{
                title: {
                    text: 'Severity (km²)'
                }
            }, {
                title: {
                    text: 'Duration (days)'
                },
                opposite: true
            }],
            tooltip: {
                shared: true
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            series: [
                {
                    name: 'Total Severity (km²)',
                    data: severityData,
                    yAxis: 0
                },
                {
                    name: 'Total Duration (days)',
                    data: durationData,
                    yAxis: 1
                }
            ]
        });

    })
</script>

<div id="container"></div>