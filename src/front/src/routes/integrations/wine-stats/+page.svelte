<script>
    //@ts-nocheck

    import { onMount } from 'svelte';
    import Highcharts from 'highcharts';

    let chart;

    let droughtData = [];
    let wineData = [];

    let mergedData = [];

    async function loadInitialData() {

        // =========================
        // DROUGHT (igual que antes)
        // =========================

        const droughtRes = await fetch('/api/v1/drought-stats');
        droughtData = await droughtRes.json();

        // =========================
        // WINE: LOAD INITIAL DATA
        // =========================

        const loadWineRes = await fetch(
            'https://sos2526-29.onrender.com/api/v1/wine-stats/loadInitialData',
            {
                method: 'GET'
            }
        );

        // ignoramos 409 si existe
        if (!loadWineRes.ok && loadWineRes.status !== 409) {
            throw new Error(
                'Error loading initial data for wine-stats'
            );
        }

        // =========================
        // WINE DATA
        // =========================

        const wineRes = await fetch(
            'https://sos2526-29.onrender.com/api/v1/wine-stats'
        );

        if (!wineRes.ok) {
            throw new Error('Error fetching wine-stats');
        }

        wineData = await wineRes.json();

        processData();
    }

    function processData() {

        const droughtByCountry = {};
        const wineByCountry = {};

        // =========================
        // DROUGHT
        // =========================

        droughtData.forEach(d => {

            const country = d.country.toLowerCase();

            if (!droughtByCountry[country]) {
                droughtByCountry[country] = {
                    totalSeverity: 0,
                    count: 0
                };
            }

            droughtByCountry[country].totalSeverity += Number(d.severity_km2);
            droughtByCountry[country].count += 1;
        });

        // =========================
        // WINE
        // =========================

        wineData.forEach(w => {

            const country = w.country.toLowerCase();

            if (!wineByCountry[country]) {
                wineByCountry[country] = {
                    totalPrice: 0,
                    count: 0
                };
            }

            wineByCountry[country].totalPrice += Number(w.price);
            wineByCountry[country].count += 1;
        });

        // =========================
        // MERGE
        // =========================

        mergedData = [];

        const allCountries = new Set([
            ...Object.keys(droughtByCountry),
            ...Object.keys(wineByCountry)
        ]);

        allCountries.forEach(country => {

            const droughtAvg = droughtByCountry[country]
                ? droughtByCountry[country].totalSeverity /
                  droughtByCountry[country].count
                : 0;

            const winePriceAvg = wineByCountry[country]
                ? wineByCountry[country].totalPrice /
                  wineByCountry[country].count
                : 0;

            mergedData.push({
                country,
                droughtAvg,
                winePriceAvg
            });
        });

        renderChart();
    }

    function renderChart() {

        chart = Highcharts.chart('container', {

            chart: {
                type: 'column'
            },

            title: {
                text: 'Drought Severity vs Average Wine Price'
            },

            xAxis: {
                categories: mergedData.map(d => d.country),
                crosshair: true
            },

            yAxis: {
                title: {
                    text: 'Average Values'
                }
            },

            tooltip: {
                shared: true
            },

            series: [
                {
                    name: 'Average Drought Severity',
                    data: mergedData.map(d => d.droughtAvg)
                },
                {
                    name: 'Average Wine Price',
                    data: mergedData.map(d => d.winePriceAvg)
                }
            ]
        });
    }

    onMount(async () => {
        await loadInitialData();
    });
</script>

<div id="container" style="height: 600px;"></div>