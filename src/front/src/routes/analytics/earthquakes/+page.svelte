<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte';

  /** @type {HTMLDivElement | undefined} */
  let chartContainer;

  /** @type {import('highcharts').Chart | undefined} */
  let chart;

  let cargando = $state(true);
  let error = $state('');

  const API_URL = '/api/v1/earthquakes';
  const PAGE_SIZE = 10;

  /**
   * Carga todos los registros paginados de la API
   * @returns {Promise<any[]>}
   */
  async function cargarTodosLosRegistros() {
    /** @type {any[]} */
    const todos = [];
    let pagina = 1;

    while (true) {
      const respuesta = await fetch(`${API_URL}?page=${pagina}`);
      if (!respuesta.ok) throw new Error('No se han podido obtener los datos de terremotos.');
      const datos = await respuesta.json();
      todos.push(...datos);
      if (datos.length < PAGE_SIZE) break;
      pagina += 1;
    }

    return todos;
  }

  /**
   * Extrae el año de una fecha YYYY-MM-DD
   * @param {string} fecha
   * @returns {number}
   */
  function extraerAnio(fecha) {
    if (!fecha) return 0;
    return parseInt(fecha.split('-')[0], 10);
  }

  /**
   * Construye los datos del heatmap: [indice_pais, indice_anio, severidad_media]
   * @param {any[]} registros
   * @returns {{ heatmapData: [number, number, number][], paises: string[], anios: number[] }}
   */
  function construirHeatmap(registros) {
    /** @type {Map<string, Map<number, { suma: number, count: number }>>} */
    const agrupado = new Map();

    for (const item of registros) {
      const country = typeof item.country === 'string' ? item.country.trim() : '';
      const anio = extraerAnio(item.fromdate);
      const severity = Number(item.severity);

      if (!country || !anio || !Number.isFinite(severity)) continue;

      if (!agrupado.has(country)) agrupado.set(country, new Map());
      const porAnio = agrupado.get(country);

      const actual = porAnio.get(anio) ?? { suma: 0, count: 0 };
      actual.suma += severity;
      actual.count += 1;
      porAnio.set(anio, actual);
    }

    const paises = Array.from(agrupado.keys()).sort();
    const aniosSet = new Set();
    for (const porAnio of agrupado.values()) {
      for (const anio of porAnio.keys()) aniosSet.add(anio);
    }
    const anios = Array.from(aniosSet).sort((a, b) => a - b);

    /** @type {[number, number, number][]} */
    const heatmapData = [];

    for (let pi = 0; pi < paises.length; pi++) {
      const porAnio = agrupado.get(paises[pi]);
      for (let ai = 0; ai < anios.length; ai++) {
        const entry = porAnio.get(anios[ai]);
        if (entry) {
          const media = Math.round((entry.suma / entry.count) * 10) / 10;
          heatmapData.push([ai, pi, media]);
        }
      }
    }

    return { heatmapData, paises, anios };
  }

  async function cargarGrafico() {
    try {
      const registros = await cargarTodosLosRegistros();

      if (!registros.length) {
        throw new Error('No hay datos de terremotos para mostrar.');
      }

      const { heatmapData, paises, anios } = construirHeatmap(registros);

      const Highcharts = (await import('highcharts')).default;
      await import('highcharts/modules/heatmap');

      if (!chartContainer) throw new Error('No se ha podido inicializar el contenedor del gráfico.');

      chart = Highcharts.chart(chartContainer, {
        chart: {
          type: 'heatmap',
          marginTop: 40,
          marginBottom: 80
        },
        title: {
          text: 'Severidad media de terremotos por país y año'
        },
        subtitle: {
          text: 'Escala Richter — media anual por país'
        },
        xAxis: {
          categories: anios.map(String),
          title: { text: 'Año' },
          labels: {
            rotation: -45,
            style: { fontSize: '11px' }
          }
        },
        yAxis: {
          categories: paises,
          title: { text: 'País' },
          reversed: true
        },
        colorAxis: {
          min: 0,
          minColor: '#fff9c4',
          maxColor: '#b71c1c',
          labels: {
            format: '{value:.1f}'
          }
        },
        legend: {
          align: 'right',
          layout: 'vertical',
          verticalAlign: 'middle',
          title: { text: 'Severidad<br/>(Richter)' }
        },
        tooltip: {
          formatter() {
            return `<strong>${this.series.yAxis.categories[this.point.y]}</strong><br/>
                    Año: <strong>${this.series.xAxis.categories[this.point.x]}</strong><br/>
                    Severidad media: <strong>${this.point.value.toFixed(1)}</strong>`;
          }
        },
        series: [
          {
            type: 'heatmap',
            name: 'Severidad media',
            data: heatmapData,
            dataLabels: {
              enabled: heatmapData.length < 200,
              color: '#333',
              style: { fontSize: '10px', fontWeight: 'normal', textOutline: 'none' },
              formatter() {
                return this.point.value.toFixed(1);
              }
            },
            borderWidth: 1,
            borderColor: '#e0e0e0'
          }
        ],
        credits: { enabled: false }
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Ha ocurrido un error al cargar la visualización.';
    } finally {
      cargando = false;
    }
  }

  onMount(() => {
    cargarGrafico();
  });

  onDestroy(() => {
    if (chart) chart.destroy();
  });
</script>

<svelte:head>
  <title>Analytics — Earthquakes</title>
</svelte:head>

<main class="analytics-page">
  <header>
    <p class="eyebrow">Visualización individual</p>
    <h1>Análisis de terremotos</h1>
    <a class="volver" href="/analytics">← Volver a analytics grupal</a>
  </header>

  {#if cargando}
    <p class="estado">Cargando visualización...</p>
  {:else if error}
    <div class="mensaje mensaje-error">{error}</div>
  {/if}

  <section class="chart-card" aria-label="Mapa de calor de severidad de terremotos por país y año">
    <div class="grafico" bind:this={chartContainer}></div>
  </section>

  <section class="descripcion">
    <h2>Descripción</h2>
    <p>
      Este mapa de calor muestra la severidad media de los terremotos registrados agrupados por
      país y año. Cada celda representa la media de la escala Richter de todos los terremotos
      ocurridos en ese país durante ese año. Los colores más oscuros (rojo intenso) indican mayor
      severidad, mientras que los colores más claros (amarillo pálido) indican menor impacto.
      Esto permite identificar de forma visual qué países y periodos han concentrado los eventos
      sísmicos más intensos.
    </p>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f6f7f9;
    color: #17202a;
    font-family: Arial, sans-serif;
  }

  .analytics-page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  header {
    margin-bottom: 1.25rem;
  }

  .eyebrow {
    margin: 0 0 0.25rem;
    color: #5f6b7a;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .volver {
    color: #2563eb;
    font-weight: 700;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .volver:hover {
    text-decoration: underline;
  }

  .estado {
    color: #475569;
    font-weight: 700;
  }

  .mensaje {
    margin: 1rem 0;
    padding: 0.9rem 1rem;
    border-radius: 8px;
    font-weight: 700;
  }

  .mensaje-error {
    background: #fdecec;
    border: 1px solid #d98d8d;
    color: #8f1d1d;
  }

  .chart-card,
  .descripcion {
    background: #ffffff;
    border: 1px solid #e1e6ef;
    border-radius: 8px;
    box-shadow: 0 8px 22px rgba(24, 39, 75, 0.05);
  }

  .chart-card {
    padding: 1rem;
    overflow-x: auto;
  }

  .grafico {
    width: 100%;
    min-height: 560px;
  }

  .descripcion {
    margin-top: 1rem;
    padding: 1rem 1.25rem;
  }

  .descripcion p {
    margin: 0.75rem 0 0;
    color: #374151;
    line-height: 1.6;
  }

  @media (max-width: 760px) {
    .analytics-page {
      padding: 1rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .grafico {
      min-height: 420px;
    }
  }
</style>