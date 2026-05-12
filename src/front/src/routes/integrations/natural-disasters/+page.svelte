<script>
  //@ts-nocheck
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    getProductivityForCountry,
    loadProductivityByCountry
  } from '$lib/integrationFusion.js';

  const API_ENDPOINT = 'https://sos2526-29.onrender.com/api/v2/natural-disasters';

  let loading = $state(true);
  let error = $state('');
  let disasters = $state([]);
  let grouped = $state([]);
  let conclusion = $state('');
  let chartContainer = $state();
  let chart = $state(null);

  const numberFormatter = new Intl.NumberFormat('es-ES');

  onMount(async () => {
    try {
      const response = await fetch(API_ENDPOINT);
      const [payload, productivityByCountry] = await Promise.all([
        response.json(),
        loadProductivityByCountry()
      ]);

      if (!response.ok) {
        throw new Error('No se han podido cargar los datos de esta integracion.');
      }

      if (!Array.isArray(payload)) {
        throw new Error('La estructura de datos recibida no coincide con la esperada.');
      }

      disasters = payload
        .map((item) => ({
          country: item.country,
          year: Number(item.year),
          deaths: Number(item.death_count),
          injured: Number(item.injured_count),
          economicDamage: Number(item.economic_damage_usd)
        }))
        .filter((item) =>
          item.country &&
          Number.isFinite(item.year) &&
          Number.isFinite(item.deaths) &&
          Number.isFinite(item.injured) &&
          Number.isFinite(item.economicDamage)
        );

      grouped = aggregateByCountry(disasters, productivityByCountry);

      if (grouped.length > 0) {
        const byDamage = grouped[0];
        const byProductivity = [...grouped].sort(
          (a, b) => b.productivity.averageProductivity - a.productivity.averageProductivity
        )[0];
        conclusion = `${byDamage.country} acumula el mayor dano economico entre los paises coincidentes (${formatNumber(byDamage.economicDamage)} USD). ${byProductivity.country} tiene la productividad media mas alta (${byProductivity.productivity.averageProductivity.toFixed(2)} por hora), permitiendo comparar impacto de desastres y rendimiento laboral sin paises fuera de tu API.`;
      }
    } catch (err) {
      error = err.message || 'No se han podido cargar los datos de esta integracion.';
    } finally {
      loading = false;
    }

    if (!error && grouped.length > 0) {
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

  function aggregateByCountry(items, productivityByCountry) {
    const totals = new Map();

    items.forEach((item) => {
      const key = item.country;
      const current = totals.get(key) ?? {
        country: key,
        events: 0,
        deaths: 0,
        injured: 0,
        economicDamage: 0
      };

      current.events += 1;
      current.deaths += item.deaths;
      current.injured += item.injured;
      current.economicDamage += item.economicDamage;
      totals.set(key, current);
    });

    return Array.from(totals.values())
      .map((item) => ({
        ...item,
        productivity: getProductivityForCountry(productivityByCountry, item.country)
      }))
      .filter((item) => Number.isFinite(item.productivity?.averageProductivity))
      .sort((a, b) => b.economicDamage - a.economicDamage);
  }

  async function renderChart() {
    if (!chartContainer || grouped.length === 0) return;

    chart?.destroy();
    const Highcharts = (await import('highcharts')).default;
    await import('highcharts/modules/treemap');

    chart = Highcharts.chart(chartContainer, {
      chart: { type: 'treemap' },
      title: { text: 'Desastres y productividad laboral por pais' },
      subtitle: { text: 'Fusion de workers-productivity + natural-disasters' },
      colorAxis: {
        minColor: '#d7ecf5',
        maxColor: '#2f855a'
      },
      tooltip: {
        useHTML: true,
        pointFormat:
          '<b>{point.name}</b><br/>Dano economico: {point.value:,.0f} USD<br/>Productividad media: {point.productivity:.2f}<br/>Muertes: {point.deaths:,.0f}<br/>Heridos: {point.injured:,.0f}<br/>Registros: {point.events}'
      },
      series: [
        {
          layoutAlgorithm: 'squarified',
          data: grouped.map((item) => ({
            name: item.country,
            value: item.economicDamage,
            colorValue: item.productivity.averageProductivity,
            productivity: item.productivity.averageProductivity,
            deaths: item.deaths,
            injured: item.injured,
            events: item.events
          }))
        }
      ],
      credits: { enabled: false }
    });
  }
</script>

<svelte:head>
  <title>Natural disasters | Integraciones</title>
</svelte:head>

<main class="page">
  <a class="back" href="/integrations">Volver a integraciones</a>

  <section class="header">
    <p class="eyebrow">API SOS de otro grupo</p>
    <h1>natural-disasters</h1>
    <p>
      Esta integracion trabaja con los campos reales `country`, `year`, `death_count`,
      `injured_count` y `economic_damage_usd` publicados por el grupo 29.
    </p>
  </section>

  <section class="endpoint">
    <h2>Endpoint usado</h2>
    <p>{API_ENDPOINT}</p>
  </section>

  {#if loading}
    <p class="notice">Cargando datos de natural-disasters...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if grouped.length === 0}
    <p class="notice">No hay datos coincidentes entre natural-disasters y workers-productivity.</p>
  {:else}
    <section class="visual">
      <div class="chart" bind:this={chartContainer}></div>
      <div class="insight">
        <h2>Conclusion</h2>
        <p>{conclusion}</p>
      </div>
    </section>

    <section class="table-section">
      <h2>Agregado fusionado por pais</h2>
      <table>
        <thead>
          <tr>
            <th>Pais</th>
            <th>Registros</th>
            <th>Muertes</th>
            <th>Heridos</th>
            <th>Dano economico USD</th>
            <th>Productividad media</th>
          </tr>
        </thead>
        <tbody>
          {#each grouped as item}
            <tr>
              <td>{item.country}</td>
              <td>{item.events}</td>
              <td>{formatNumber(item.deaths)}</td>
              <td>{formatNumber(item.injured)}</td>
              <td>{formatNumber(item.economicDamage)}</td>
              <td>{formatNumber(item.productivity.averageProductivity)}</td>
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

  .header p:last-child,
  .insight p {
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
    min-height: 470px;
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
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
