<script>
  //@ts-nocheck
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    getProductivityForCountry,
    loadProductivityByCountry
  } from '$lib/integrationFusion.js';

  const PROXY_ENDPOINT = '/api/v1/integrations/proxy/rest-countries';

  let loading = $state(true);
  let error = $state('');
  let countries = $state([]);
  let fusedCountries = $state([]);
  let sourceEndpoint = $state('');
  let conclusion = $state('');
  let chartContainer = $state();
  let chart = $state(null);

  const numberFormatter = new Intl.NumberFormat('es-ES');

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

      if (!Array.isArray(payload.countries)) {
        throw new Error('La estructura de datos recibida no coincide con la esperada.');
      }

      countries = payload.countries.filter((country) => Number.isFinite(country.density));
      fusedCountries = countries
        .map((country) => ({
          ...country,
          productivity: getProductivityForCountry(productivityByCountry, country.country)
        }))
        .filter((country) => Number.isFinite(country.productivity?.averageProductivity));
      sourceEndpoint = payload.endpoint ?? '';

      if (fusedCountries.length > 0) {
        const highestProductivity = [...fusedCountries].sort(
          (a, b) => b.productivity.averageProductivity - a.productivity.averageProductivity
        )[0];
        const highestDensity = [...fusedCountries].sort((a, b) => b.density - a.density)[0];
        conclusion = `${highestProductivity.country} tiene la mayor productividad media (${formatNumber(highestProductivity.productivity.averageProductivity)} por hora) entre los paises coincidentes. ${highestDensity.country} concentra la mayor densidad demografica (${formatNumber(highestDensity.density)} hab/km2), por lo que el widget compara presion poblacional y productividad sin mezclar paises no presentes en tu API.`;
      }
    } catch (err) {
      error = err.message || 'No se han podido cargar los datos de esta integracion.';
    } finally {
      loading = false;
    }

    if (!error && fusedCountries.length > 0) {
      await tick();
      await renderChart();
    }
  });

  onDestroy(() => {
    chart?.destroy();
  });

  function formatNumber(value) {
    return Number.isFinite(value) ? numberFormatter.format(value) : 'No disponible';
  }

  async function renderChart() {
    if (!chartContainer || fusedCountries.length === 0) return;

    chart?.destroy();
    const Highcharts = (await import('highcharts')).default;

    chart = Highcharts.chart(chartContainer, {
      chart: { type: 'column' },
      title: { text: 'Productividad propia frente a densidad de poblacion' },
      subtitle: { text: 'Fusion de workers-productivity + REST Countries' },
      xAxis: {
        categories: fusedCountries.map((country) => country.country),
        title: { text: 'Pais' }
      },
      yAxis: [
        {
          min: 0,
          title: { text: 'Habitantes por km2' }
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
      series: [
        {
          name: 'Densidad',
          data: fusedCountries.map((country) => country.density),
          color: '#0f5d8f'
        },
        {
          name: 'Productividad media',
          yAxis: 1,
          data: fusedCountries.map((country) =>
            Number(country.productivity.averageProductivity.toFixed(2))
          ),
          color: '#c05621'
        }
      ],
      credits: { enabled: false }
    });
  }
</script>

<svelte:head>
  <title>REST Countries | Integraciones</title>
</svelte:head>

<main class="page">
  <a class="back" href="/integrations">Volver a integraciones</a>

  <section class="header">
    <p class="eyebrow">API externa con proxy propio</p>
    <h1>REST Countries</h1>
    <p>
      Se usa para contextualizar la productividad con poblacion, superficie y densidad
      de paises presentes en las APIs del proyecto y en la integracion FIFA.
    </p>
  </section>

  <section class="endpoint">
    <h2>Endpoint usado</h2>
    <p><strong>Frontend:</strong> {PROXY_ENDPOINT}</p>
    <p><strong>Externo via proxy:</strong> {sourceEndpoint || 'Pendiente de cargar'}</p>
  </section>

  {#if loading}
    <p class="notice">Cargando datos de REST Countries...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if countries.length === 0}
    <p class="notice">La API no ha devuelto datos disponibles.</p>
  {:else if fusedCountries.length === 0}
    <p class="notice">No hay paises coincidentes entre REST Countries y workers-productivity.</p>
  {:else}
    <section class="visual">
      <div class="chart" bind:this={chartContainer}></div>
      <div class="insight">
        <h2>Conclusion</h2>
        <p>{conclusion}</p>
      </div>
    </section>

    <section class="table-section">
      <h2>Datos fusionados con workers-productivity</h2>
      <table>
        <thead>
          <tr>
            <th>Pais</th>
            <th>Capital</th>
            <th>Region</th>
            <th>Densidad</th>
            <th>Productividad media</th>
            <th>PIB pc propio medio</th>
          </tr>
        </thead>
        <tbody>
          {#each fusedCountries as country}
            <tr>
              <td>{country.country}</td>
              <td>{country.capital ?? 'No disponible'}</td>
              <td>{country.region}</td>
              <td>{formatNumber(country.density)}</td>
              <td>{formatNumber(country.productivity.averageProductivity)}</td>
              <td>{formatNumber(country.productivity.averageGdpPerCapita)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
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

  .header p:last-child {
    max-width: 760px;
    color: #526177;
    line-height: 1.6;
  }

  .endpoint,
  .insight,
  .table-section {
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
    min-height: 420px;
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
  }

  .insight p {
    color: #526177;
    line-height: 1.6;
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

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    border-bottom: 1px solid #edf1f7;
    padding: 10px;
    text-align: left;
  }

  th {
    color: #475569;
    font-size: 0.85rem;
  }

  @media (max-width: 780px) {
    .visual {
      grid-template-columns: 1fr;
    }

    .table-section {
      overflow-x: auto;
    }
  }
</style>
