<script>
  //@ts-nocheck
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    getProductivityForCountry,
    loadProductivityByCountry
  } from '$lib/integrationFusion.js';

  const PROXY_ENDPOINT = '/api/v1/integrations/proxy/open-meteo';

  let loading = $state(true);
  let error = $state('');
  let weather = $state([]);
  let fusedWeather = $state([]);
  let sourceEndpoint = $state('');
  let conclusion = $state('');
  let chartContainer = $state();
  let chart = $state(null);

  onMount(async () => {
    try {
      const [response, productivityByCountry] = await Promise.all([
        fetch(PROXY_ENDPOINT),
        loadProductivityByCountry()
      ]);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'No se han podido cargar los datos de esta integracion.');
      }

      if (!Array.isArray(payload.weather)) {
        throw new Error('La estructura de datos recibida no coincide con la esperada.');
      }

      weather = payload.weather.filter((item) => Number.isFinite(item.temperature));
      fusedWeather = weather
        .map((item) => ({
          ...item,
          productivity: getProductivityForCountry(productivityByCountry, item.country)
        }))
        .filter((item) => Number.isFinite(item.productivity?.averageProductivity));
      sourceEndpoint = payload.endpoint ?? '';

      if (fusedWeather.length > 0) {
        const hottest = [...fusedWeather].sort((a, b) => b.temperature - a.temperature)[0];
        const topProductivity = [...fusedWeather].sort(
          (a, b) => b.productivity.averageProductivity - a.productivity.averageProductivity
        )[0];
        conclusion = `${hottest.city} registra la temperatura mas alta entre los paises coincidentes (${hottest.temperature} C). ${topProductivity.country} muestra la mayor productividad media (${topProductivity.productivity.averageProductivity.toFixed(2)} por hora), por lo que el widget compara clima actual y productividad solo donde existe dato propio.`;
      }
    } catch (err) {
      error = err.message || 'No se han podido cargar los datos de esta integracion.';
    } finally {
      loading = false;
    }

    if (!error && fusedWeather.length > 0) {
      await tick();
      await renderChart();
    }
  });

  onDestroy(() => {
    chart?.destroy();
  });

  async function renderChart() {
    if (!chartContainer || fusedWeather.length === 0) return;

    chart?.destroy();
    const Highcharts = (await import('highcharts')).default;

    chart = Highcharts.chart(chartContainer, {
      chart: { type: 'area' },
      title: { text: 'Clima actual frente a productividad laboral' },
      subtitle: { text: 'Fusion de workers-productivity + Open-Meteo' },
      xAxis: {
        categories: fusedWeather.map((item) => item.city),
        title: { text: 'Capital' }
      },
      yAxis: [
        {
          title: { text: 'Grados Celsius' }
        },
        {
          min: 0,
          opposite: true,
          title: { text: 'Productividad media por hora' }
        }
      ],
      tooltip: {
        shared: true
      },
      plotOptions: {
        area: {
          fillOpacity: 0.28,
          marker: { enabled: true }
        }
      },
      series: [
        {
          name: 'Temperatura',
          data: fusedWeather.map((item) => item.temperature),
          color: '#0f5d8f'
        },
        {
          name: 'Sensacion termica',
          data: fusedWeather.map((item) => item.apparentTemperature),
          color: '#c05621'
        },
        {
          name: 'Productividad media',
          yAxis: 1,
          data: fusedWeather.map((item) => Number(item.productivity.averageProductivity.toFixed(2))),
          color: '#2f855a'
        }
      ],
      credits: { enabled: false }
    });
  }
</script>

<svelte:head>
  <title>Open-Meteo | Integraciones</title>
</svelte:head>

<main class="page">
  <a class="back" href="/integrations">Volver a integraciones</a>

  <section class="header">
    <p class="eyebrow">API externa con proxy propio</p>
    <h1>Open-Meteo</h1>
    <p>
      La integracion consulta meteorologia actual en capitales relacionadas con la API
      propia y con paises de las integraciones deportivas y economicas.
    </p>
  </section>

  <section class="endpoint">
    <h2>Endpoint usado</h2>
    <p><strong>Frontend:</strong> {PROXY_ENDPOINT}</p>
    <p><strong>Externo via proxy:</strong> {sourceEndpoint || 'Pendiente de cargar'}</p>
  </section>

  {#if loading}
    <p class="notice">Cargando datos de Open-Meteo...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if weather.length === 0}
    <p class="notice">La API no ha devuelto datos disponibles.</p>
  {:else if fusedWeather.length === 0}
    <p class="notice">No hay paises coincidentes entre Open-Meteo y workers-productivity.</p>
  {:else}
    <section class="visual">
      <div class="chart" bind:this={chartContainer}></div>
      <div class="insight">
        <h2>Conclusion</h2>
        <p>{conclusion}</p>
      </div>
    </section>

    <section class="cards" aria-label="Lecturas meteorologicas fusionadas">
      {#each fusedWeather as item}
        <article class="metric">
          <h2>{item.city}</h2>
          <p>{item.country}</p>
          <strong>{item.temperature} C</strong>
          <span>Productividad media: {item.productivity.averageProductivity.toFixed(2)}</span>
          <span>Sensacion: {item.apparentTemperature} C</span>
          <span>Humedad: {item.humidity}%</span>
          <span>Viento: {item.windSpeed} km/h</span>
        </article>
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
  .metric {
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
  }

  .endpoint {
    margin-top: 24px;
    padding: 18px;
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
    min-height: 420px;
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
  }

  .insight,
  .metric {
    padding: 18px;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin-top: 18px;
  }

  .metric {
    display: grid;
    gap: 6px;
  }

  .metric h2 {
    margin-bottom: 0;
    font-size: 1.05rem;
  }

  .metric p {
    color: #64748b;
    margin-bottom: 8px;
  }

  .metric strong {
    color: #0f5d8f;
    font-size: 1.9rem;
  }

  .metric span {
    color: #526177;
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
  }
</style>
