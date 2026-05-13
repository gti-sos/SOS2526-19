<script>
    //@ts-nocheck
    import { onMount } from "svelte";
    import Highcharts from "highcharts";

    let loading = $state(true);
    let error = $state(null);

    let chartContainer = $state(null);

    async function loadData() {

        try {

            loading = true;

            const loadRes = await fetch(
                "https://sos2526-24.onrender.com/api/v1/international-construction-costs/loadInitialData"
            );

            if (!loadRes.ok && loadRes.status !== 409) {
                throw new Error(
                    `Error loading initial data: ${loadRes.status}`
                );
            }


            const [droughtRes, constructionRes] = await Promise.all([
                fetch(
                    "https://sos2526-19.onrender.com/api/v1/drought-stats"
                ),
                fetch(
                    "https://sos2526-24.onrender.com/api/v1/international-construction-costs"
                )
            ]);

            if (!droughtRes.ok || !constructionRes.ok) {
                throw new Error("Error loading APIs");
            }

            const droughtData = await droughtRes.json();
            const constructionData = await constructionRes.json();


            const droughtMap = {};

            droughtData.forEach((d) => {

                const country = d.country?.trim();

                if (!country) return;

                if (!droughtMap[country]) {
                    droughtMap[country] = {
                        totalSeverity: 0
                    };
                }

                droughtMap[country].totalSeverity +=
                    Number(d.severity_km2 || 0);
            });


            const constructionMap = {};

            constructionData.forEach((c) => {

                const country = c.country?.trim();

                if (!country) return;

                if (!constructionMap[country]) {
                    constructionMap[country] = {
                        totalCost: 0,
                        count: 0
                    };
                }

                constructionMap[country].totalCost +=
                    Number(c.cost_usd_per_m2 || 0);

                constructionMap[country].count += 1;
            });

            const integratedData = [];

            Object.keys(droughtMap).forEach((country) => {

                const drought = droughtMap[country];
                const construction = constructionMap[country];

                if (construction) {

                    const avgCost =
                        construction.totalCost /
                        construction.count;

                    const integratedValue =
                        drought.totalSeverity * avgCost;

                    integratedData.push({
                        name: country,
                        y: Number(integratedValue.toFixed(0))
                    });
                }
            });

            integratedData.sort((a, b) => b.y - a.y);

            const topCountries = integratedData.slice(0, 8);

            if (chartContainer) {

                Highcharts.chart(chartContainer, {

                    chart: {
                        type: "pie",
                        backgroundColor: "#f8fafc"
                    },

                    title: {
                        text: "Drought vs Construction Costs"
                    },

                    plotOptions: {
                        pie: {
                            innerSize: "55%",

                            dataLabels: {
                                enabled: true,
                                format:
                                    "<b>{point.name}</b><br/>" +
                                    "{point.percentage:.1f}%"
                            }
                        }
                    },

                    tooltip: {
                        pointFormat:
                            "<b>{point.percentage:.1f}%</b><br/>" +
                            "Integrated value: {point.y:,.0f}"
                    },

                    series: [
                        {
                            name: "Integrated Impact",
                            colorByPoint: true,
                            data: topCountries
                        }
                    ]
                });
            }

        } catch (e) {

            console.error(e);
            error = e.message;

        } finally {

            loading = false;
        }
    }

    onMount(() => {
        loadData();
    });
</script>

<div class="container">

    <h1>API Integration</h1>

    {#if loading}
        <p>Cargando datos...</p>
    {/if}

    {#if error}
        <p class="error">{error}</p>
    {/if}

    <!-- SIEMPRE EXISTE -->
    <div bind:this={chartContainer}></div>

    <div class="info-box">

    <h3>¿Qué representa este gráfico?</h3>

    <p>
        Cada sector del gráfico representa un país presente en ambas APIs.
    </p>

    <p>
        El valor numérico mostrado se calcula mediante:
    </p>

    <div class="formula">
        severity_km2 × average construction cost (USD/m²)
    </div>

    <p>
        Esto combina:
    </p>

    <ul>
        <li>
            La severidad total de las sequías registradas
            (<strong>severity_km2</strong>)
        </li>

        <li>
            El coste medio internacional de construcción
            (<strong>cost_usd_per_m2</strong>)
        </li>
    </ul>

    <p>
        Un valor más alto indica países donde coinciden:
    </p>

    <ul>
        <li>grandes impactos por sequía</li>
        <li>costes de construcción elevados</li>
    </ul>

</div>

</div>

<style>

    .container {
        padding: 2rem;
    }

    .error {
        color: red;
        font-weight: bold;
    }

</style>