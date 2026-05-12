<script>
  //@ts-nocheck
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    getProductivityForCountry,
    loadProductivityByCountry
  } from '$lib/integrationFusion.js';

  const API_ENDPOINT = 'https://sos2526-26.onrender.com/api/v2/fifa-squad-value-per-years';
  const INITIAL_DATA_ENDPOINT = `${API_ENDPOINT}/loadInitialData`;

  let loading = $state(true);
  let error = $state('');
  let squads = $state([]);
  let fusedSquads = $state([]);
  let conclusion = $state('');
  let endpointUsed = $state(API_ENDPOINT);
  let chartContainer = $state();
  let chart = $state(null);

  onMount(async () => {
    try {
      const productivityPromise = loadProductivityByCountry();
      let payload = await fetchJsonEndpoint(API_ENDPOINT);

      if (Array.isArray(payload) && payload.length === 0) {
        const initialPayload = await fetchJsonEndpoint(INITIAL_DATA_ENDPOINT);

        if (Array.isArray(initialPayload)) {
          payload = initialPayload;
          endpointUsed = INITIAL_DATA_ENDPOINT;
        }
      }

      if (!Array.isArray(payload)) {
        throw new Error('La estructura de datos recibida no coincide con la esperada.');
      }

      const productivityByCountry = await productivityPromise;

      squads = payload
        .map((item) => ({
          country: item.country,
          year: Number(item.year),
          squadSize: Number(item.squad_size),
          totalMarketValue: Number(item.total_market_value),
          averageMarketValue: Number(item.average_market_value)
        }))
        .filter((item) =>
          item.country &&
          Number.isFinite(item.year) &&
          Number.isFinite(item.squadSize) &&
          Number.isFinite(item.totalMarketValue) &&
          Number.isFinite(item.averageMarketValue)
        )
        .sort((a, b) => b.totalMarketValue - a.totalMarketValue);

      fusedSquads = squads
        .map((item) => ({
          ...item,
          productivity: getProductivityForCountry(productivityByCountry, item.country)
        }))
        .filter((item) => Number.isFinite(item.productivity?.averageProductivity));

      if (fusedSquads.length > 0) {
        const top = fusedSquads[0];
        const bestAverage = [...fusedSquads].sort((a, b) => b.averageMarketValue - a.averageMarketValue)[0];
        conclusion = `${top.country} (${top.year}) aparece con el mayor valor total de plantilla entre los paises coincidentes (${top.totalMarketValue} M) y una productividad media propia de ${top.productivity.averageProductivity.toFixed(2)} por hora. En valor medio por jugador destaca ${bestAverage.country} (${bestAverage.averageMarketValue} M).`;
      }
    } catch (err) {
      error = err.message || 'No se han podido cargar los datos de esta integracion.';
    } finally {
      loading = false;
    }

    if (!error && fusedSquads.length > 0) {
      await tick();
      await renderChart();
    }
  });

  onDestroy(() => {
    chart?.destroy();
  });

  async function fetchJsonEndpoint(endpoint) {
    const response = await fetch(endpoint);
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error('No se han podido cargar los datos de esta integracion.');
    }

    return payload;
  }

  async function renderChart() {
    if (!chartContainer || fusedSquads.length === 0) return;

    chart?.destroy();
    const Highcharts = (await import('highcharts')).default;
    await import('highcharts/highcharts-more');

    chart = Highcharts.chart(chartContainer, {
      chart: { type: 'packedbubble' },
      title: { text: 'Valor de plantilla y productividad laboral' },
      subtitle: { text: 'Fusion de workers-productivity + fifa-squad-value-per-years' },
      tooltip: {
        useHTML: true,
        pointFormat:
          '<b>{point.country}</b><br/>Ano FIFA: {point.year}<br/>Valor total: {point.value} M<br/>Valor medio: {point.averageMarketValue} M<br/>Productividad media: {point.productivity:.2f}<br/>Jugadores: {point.squadSize}'
      },
      plotOptions: {
        packedbubble: {
          minSize: '35%',
          maxSize: '120%',
          layoutAlgorithm: {
            gravitationalConstant: 0.04,
            splitSeries: false,
            seriesInteraction: false
          },
          dataLabels: {
            enabled: true,
            format: '{point.country}',
            style: {
              color: '#172033',
              textOutline: 'none',
              fontWeight: '700'
            }
          }
        }
      },
      series: [
        {
          name: 'Valor total de mercado',
          data: fusedSquads.map((item) => ({
            name: `${item.country} ${item.year}`,
            country: item.country,
            year: item.year,
            value: item.totalMarketValue,
            averageMarketValue: item.averageMarketValue,
            productivity: item.productivity.averageProductivity,
            squadSize: item.squadSize
          }))
        }
      ],
      credits: { enabled: false }
    });
  }
</script>

<svelte:head>
  <title>FIFA squad value | Integraciones</title>
</svelte:head>

<main class="page">
  <a class="back" href="/integrations">Volver a integraciones</a>

  <section class="header">
    <p class="eyebrow">API SOS de otro grupo</p>
    <h1>fifa-squad-value-per-years</h1>
    <p>
      Esta integracion analiza los campos reales `year`, `country`, `squad_size`,
      `total_market_value` y `average_market_value` publicados por el grupo 26.
    </p>
  </section>

  <section class="endpoint">
    <h2>Endpoint usado</h2>
    <p>{endpointUsed}</p>
  </section>

  {#if loading}
    <p class="notice">Cargando datos de fifa-squad-value-per-years...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if squads.length === 0}
    <p class="notice">La API no ha devuelto datos disponibles.</p>
  {:else if fusedSquads.length === 0}
    <p class="notice">No hay paises coincidentes entre fifa-squad-value-per-years y workers-productivity.</p>
  {:else}
    <section class="visual">
      <div class="chart" bind:this={chartContainer}></div>
      <div class="insight">
        <h2>Conclusion</h2>
        <p>{conclusion}</p>
      </div>
    </section>

    <section class="ranking">
      <h2>Top fusionado por valor total</h2>
      {#each fusedSquads.slice(0, 8) as item, index}
        <div class="row">
          <span>{index + 1}</span>
          <strong>{item.country}</strong>
          <em>{item.year}</em>
          <b>{item.totalMarketValue} M | Prod. {item.productivity.averageProductivity.toFixed(2)}</b>
        </div>
      {/each}
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f6f8fb;
    color: #172033;
  }

  .page {
    width: min(1100px, calc(100% - 32px));
    margin: 0 auto;
    padding: 32px 0 56px;
  }

  .back {
    color: #0f5d8f;
    font-weight: 800;
    text-decoration: none;
  }

  .header {
    margin-top: 24px;
    padding-bottom: 22px;
    border-bottom: 1px solid #d9e2ef;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #7a3e12;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    margin-bottom: 12px;
    font-size: clamp(2rem, 6vw, 3.6rem);
    line-height: 1;
  }

  .header p:last-child,
  .insight p {
    color: #526177;
    line-height: 1.6;
  }

  .endpoint,
  .insight,
  .ranking {
    margin-top: 24px;
    padding: 18px;
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
  }

  .endpoint p {
    overflow-wrap: anywhere;
  }

  .visual {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
    gap: 18px;
    margin-top: 24px;
  }

  .chart {
    min-height: 470px;
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
  }

  .row {
    display: grid;
    grid-template-columns: 42px minmax(120px, 1fr) 80px 100px;
    gap: 12px;
    align-items: center;
    border-top: 1px solid #edf1f7;
    padding: 10px 0;
  }

  .row span,
  .row em {
    color: #64748b;
    font-style: normal;
    font-weight: 700;
  }

  .row b {
    color: #0f5d8f;
    text-align: right;
  }

  .notice,
  .error {
    margin-top: 24px;
    padding: 16px;
    border-radius: 8px;
    background: #ffffff;
  }

  .error {
    border-left: 5px solid #b42318;
    color: #8a1f15;
  }

  @media (max-width: 780px) {
    .visual {
      grid-template-columns: 1fr;
    }

    .row {
      grid-template-columns: 32px 1fr;
    }

    .row em,
    .row b {
      grid-column: 2;
      text-align: left;
    }
  }
</style>
