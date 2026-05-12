<script>
  //@ts-nocheck
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    getProductivityForCountry,
    loadProductivityByCountry
  } from '$lib/integrationFusion.js';

  const PROXY_ENDPOINT = '/api/v1/integrations/proxy/world-bank';

  let loading = $state(true);
  let error = $state('');
  let records = $state([]);
  let fusedRecords = $state([]);
  let sourceEndpoint = $state('');
  let lastUpdated = $state('');
  let conclusion = $state('');
  let chartContainer = $state();
  let chart = $state(null);

  const currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });

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

      if (!Array.isArray(payload.data)) {
        throw new Error('La estructura de datos recibida no coincide con la esperada.');
      }

      records = payload.data.filter((item) => Number.isFinite(item.gdpPerCapitaUsd));
      fusedRecords = records
        .map((item) => ({
          ...item,
          productivity: getProductivityForCountry(productivityByCountry, item.country)
        }))
        .filter((item) => Number.isFinite(item.productivity?.averageProductivity));
      sourceEndpoint = payload.endpoint ?? '';
      lastUpdated = payload.lastUpdated ?? '';

      if (fusedRecords.length > 0) {
        const top = fusedRecords[0];
        const bottom = fusedRecords[fusedRecords.length - 1];
        const topProductivity = [...fusedRecords].sort(
          (a, b) => b.productivity.averageProductivity - a.productivity.averageProductivity
        )[0];
        const ratio = bottom.gdpPerCapitaUsd > 0 ? top.gdpPerCapitaUsd / bottom.gdpPerCapitaUsd : null;
        conclusion = `${top.country} lidera el grupo coincidente con ${formatCurrency(top.gdpPerCapitaUsd)} por habitante. En productividad propia destaca ${topProductivity.country} con ${topProductivity.productivity.averageProductivity.toFixed(2)} por hora; la diferencia economica frente a ${bottom.country}${ratio ? ` es de unas ${ratio.toFixed(1)} veces` : ''}.`;
      }
    } catch (err) {
      error = err.message || 'No se han podido cargar los datos de esta integracion.';
    } finally {
      loading = false;
    }

    if (!error && fusedRecords.length > 0) {
      await tick();
      await renderChart();
    }
  });

  onDestroy(() => {
    chart?.destroy();
  });

  function formatCurrency(value) {
    return Number.isFinite(value) ? currencyFormatter.format(value) : 'No disponible';
  }

  async function renderChart() {
    if (!chartContainer || fusedRecords.length === 0) return;

    chart?.destroy();
    const Highcharts = (await import('highcharts')).default;

    chart = Highcharts.chart(chartContainer, {
      chart: { type: 'pie' },
      title: { text: 'PIB per capita en paises con productividad propia' },
      subtitle: { text: 'Fusion de workers-productivity + World Bank' },
      tooltip: {
        pointFormat:
          '<b>{point.y:,.0f} USD</b> ({point.percentage:.1f}%)<br/>Productividad media: {point.productivity:.2f}'
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '{point.name}: {point.percentage:.1f}%'
          }
        }
      },
      series: [
        {
          name: 'PIB per capita',
          data: fusedRecords.map((item) => ({
            name: `${item.country} (${item.year})`,
            y: item.gdpPerCapitaUsd,
            productivity: item.productivity.averageProductivity
          }))
        }
      ],
      credits: { enabled: false }
    });
  }
</script>

<svelte:head>
  <title>World Bank | Integraciones</title>
</svelte:head>

<main class="page">
  <a class="back" href="/integrations">Volver a integraciones</a>

  <section class="header">
    <p class="eyebrow">API externa con proxy propio</p>
    <h1>World Bank Indicators</h1>
    <p>
      Se consulta el indicador de PIB per capita para aportar contexto economico a los
      paises usados en productividad, desastres y valor de plantillas.
    </p>
  </section>

  <section class="endpoint">
    <h2>Endpoint usado</h2>
    <p><strong>Frontend:</strong> {PROXY_ENDPOINT}</p>
    <p><strong>Externo via proxy:</strong> {sourceEndpoint || 'Pendiente de cargar'}</p>
    {#if lastUpdated}
      <p><strong>Ultima actualizacion World Bank:</strong> {lastUpdated}</p>
    {/if}
  </section>

  {#if loading}
    <p class="notice">Cargando datos del Banco Mundial...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if records.length === 0}
    <p class="notice">La API no ha devuelto datos disponibles.</p>
  {:else if fusedRecords.length === 0}
    <p class="notice">No hay paises coincidentes entre World Bank y workers-productivity.</p>
  {:else}
    <section class="visual">
      <div class="chart" bind:this={chartContainer}></div>
      <div class="insight">
        <h2>Conclusion</h2>
        <p>{conclusion}</p>
      </div>
    </section>

    <section class="ranking">
      <h2>Ranking fusionado</h2>
      {#each fusedRecords as record, index}
        <div class="row">
          <span>{index + 1}</span>
          <strong>{record.country}</strong>
          <em>{record.year}</em>
          <b>{formatCurrency(record.gdpPerCapitaUsd)} | Prod. {record.productivity.averageProductivity.toFixed(2)}</b>
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
    min-height: 420px;
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
  }

  .row {
    display: grid;
    grid-template-columns: 42px minmax(120px, 1fr) 80px minmax(120px, auto);
    gap: 12px;
    align-items: center;
    border-top: 1px solid #edf1f7;
    padding: 10px 0;
  }

  .row span {
    color: #64748b;
    font-weight: 800;
  }

  .row em {
    color: #64748b;
    font-style: normal;
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
