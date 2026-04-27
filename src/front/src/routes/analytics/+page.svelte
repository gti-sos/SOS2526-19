<script>
  import { onDestroy, onMount } from 'svelte';

  /**
   * @typedef {Object} IntegratedPoint
   * @property {string} name
   * @property {number} x
   * @property {number} y
   * @property {number} z
   * @property {number} averageProductivityHour
   * @property {number} droughtImpact
   * @property {number} earthquakeImpact
   * @property {number} environmentalImpact
   * @property {number} exposedPopulation
   */

  /** @type {HTMLDivElement | undefined} */
  let chartContainer;

  /** @type {import('highcharts').Chart | undefined} */
  let chart;

  let cargando = $state(true);
  let error = $state('');
  let mensajeSinPaises = $state('');

  const API_WORKERS = '/api/v1/workers-productivity';
  const API_DROUGHTS = '/api/v1/drought-stats';
  const API_EARTHQUAKES = '/api/v1/earthquakes';
  const EARTHQUAKES_PAGE_SIZE = 10;

  /**
   * @param {unknown} valor
   * @returns {number | null}
   */
  function numeroFinito(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  /**
   * @param {unknown} valor
   * @returns {string}
   */
  function normalizarPais(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
  }

  /**
   * @param {Response} respuesta
   * @returns {Promise<any[]>}
   */
  async function leerColeccion(respuesta) {
    if (respuesta.status === 404) {
      return [];
    }

    if (!respuesta.ok) {
        throw new Error('No se han podido obtener todos los datos necesarios para la visualización.');
    }

    const datos = await respuesta.json();
    return Array.isArray(datos) ? datos : [];
  }

  /**
   * @returns {Promise<any[]>}
   */
  async function cargarEarthquakes() {
    /** @type {any[]} */
    const todos = [];
    let pagina = 1;

    while (true) {
      const respuesta = await fetch(`${API_EARTHQUAKES}?page=${pagina}`);
      const datos = await leerColeccion(respuesta);
      todos.push(...datos);

      if (datos.length < EARTHQUAKES_PAGE_SIZE) {
        return todos;
      }

      pagina += 1;
    }
  }

  /**
   * @param {any[]} workers
   * @returns {Map<string, number>}
   */
  function agregarProductividad(workers) {
    /** @type {Map<string, { suma: number, total: number }>} */
    const acumulado = new Map();

    for (const item of workers) {
      const country = normalizarPais(item.country);
      const productivityHour = numeroFinito(item.productivity_hour);

      if (!country || productivityHour === null) {
        continue;
      }

      const actual = acumulado.get(country) ?? { suma: 0, total: 0 };
      actual.suma += productivityHour;
      actual.total += 1;
      acumulado.set(country, actual);
    }

    return new Map(
      Array.from(acumulado.entries()).map(([country, valor]) => [
        country,
        valor.suma / valor.total
      ])
    );
  }

  /**
   * @param {any[]} droughts
   * @returns {Map<string, number>}
   */
  function agregarSequias(droughts) {
    /** @type {Map<string, number>} */
    const acumulado = new Map();

    for (const item of droughts) {
      const country = normalizarPais(item.country);
      const severity = numeroFinito(item.severity_km2);
      const duration = numeroFinito(item.duration_day);

      if (!country || severity === null || duration === null) {
        continue;
      }

      acumulado.set(country, (acumulado.get(country) ?? 0) + severity * duration);
    }

    return acumulado;
  }

  /**
   * @param {any[]} earthquakes
   * @returns {Map<string, { impact: number, exposedPopulation: number }>}
   */
  function agregarTerremotos(earthquakes) {
    /** @type {Map<string, { impact: number, exposedPopulation: number }>} */
    const acumulado = new Map();

    for (const item of earthquakes) {
      const country = normalizarPais(item.country);
      const severity = numeroFinito(item.severity);
      const depth = numeroFinito(item.depth);
      const exposedPopulation = numeroFinito(item.exposed_population);

      if (!country || severity === null || depth === null) {
        continue;
      }

      const actual = acumulado.get(country) ?? { impact: 0, exposedPopulation: 0 };
      actual.impact += severity * depth;

      if (exposedPopulation !== null) {
        actual.exposedPopulation += exposedPopulation;
      }

      acumulado.set(country, actual);
    }

    return acumulado;
  }

  /**
   * @param {any[]} workers
   * @param {any[]} droughts
   * @param {any[]} earthquakes
   * @returns {IntegratedPoint[]}
   */
  function construirDatosIntegrados(workers, droughts, earthquakes) {
    const productividadPorPais = agregarProductividad(workers);
    const sequiasPorPais = agregarSequias(droughts);
    const terremotosPorPais = agregarTerremotos(earthquakes);

    return Array.from(productividadPorPais.keys())
      .filter((country) => sequiasPorPais.has(country) && terremotosPorPais.has(country))
      .map((country) => {
        const averageProductivityHour = productividadPorPais.get(country) ?? 0;
        const droughtImpact = sequiasPorPais.get(country) ?? 0;
        const earthquakeData = terremotosPorPais.get(country) ?? {
          impact: 0,
          exposedPopulation: 0
        };
        const earthquakeImpact = earthquakeData.impact;
        const environmentalImpact = droughtImpact + earthquakeImpact;
        const exposedPopulation = earthquakeData.exposedPopulation;

        return {
          name: country,
          x: averageProductivityHour,
          y: environmentalImpact,
          z: exposedPopulation,
          averageProductivityHour,
          droughtImpact,
          earthquakeImpact,
          environmentalImpact,
          exposedPopulation
        };
      });
  }

  /**
   * @param {number} valor
   * @returns {string}
   */
  function formatearNumero(valor) {
    return new Intl.NumberFormat('es-ES', {
      maximumFractionDigits: 2
    }).format(valor);
  }

  /**
   * @param {IntegratedPoint[]} datos
   */
  async function pintarGrafico(datos) {
    const Highcharts = (await import('highcharts')).default;
    await import('highcharts/highcharts-more');

    if (!chartContainer) {
      throw new Error('No se ha podido inicializar el contenedor del gráfico.');
    }

    chart = Highcharts.chart(chartContainer, {
      chart: {
        type: 'bubble',
        plotBorderWidth: 1,
        zooming: {
          type: 'xy'
        }
      },
      title: {
        text: 'Productividad, impacto ambiental y población expuesta'
      },
      xAxis: {
        title: {
          text: 'Productividad por hora media'
        }
      },
      yAxis: {
        title: {
          text: 'Impacto ambiental combinado (sequias + terremotos)'
        }
      },
      tooltip: {
        useHTML: true,
        pointFormatter() {
          const punto = /** @type {IntegratedPoint} */ (this.options);

          return `
            <strong>${this.name}</strong><br/>
            Productividad media: ${formatearNumero(punto.averageProductivityHour)}<br/>
            Impacto sequía: ${formatearNumero(punto.droughtImpact)}<br/>
            Impacto terremotos: ${formatearNumero(punto.earthquakeImpact)}<br/>
            Impacto total: ${formatearNumero(punto.environmentalImpact)}<br/>
            Población expuesta: ${formatearNumero(punto.exposedPopulation)}
          `;
        }
      },
      series: [
        {
          type: 'bubble',
          name: 'Paises comunes',
          data: datos,
          minSize: 12,
          maxSize: 60
        }
      ],
      credits: {
        enabled: false
      }
    });
  }

  async function cargarVisualizacion() {
    try {
      const [workers, droughts, earthquakes] = await Promise.all([
        fetch(API_WORKERS).then(leerColeccion),
        fetch(API_DROUGHTS).then(leerColeccion),
        cargarEarthquakes()
      ]);

      const datosIntegrados = construirDatosIntegrados(workers, droughts, earthquakes);

      if (datosIntegrados.length === 0) {
        mensajeSinPaises =
          'No hay países comunes entre las tres APIs para construir la visualización integrada.';
      }

      await pintarGrafico(datosIntegrados);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Ha ocurrido un error al cargar la visualización.';
    } finally {
      cargando = false;
    }
  }

  onMount(() => {
    cargarVisualizacion();
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
</script>

<svelte:head>
  <title>Analytics integrado</title>
</svelte:head>

<main class="analytics-page">
  <header>
    <p class="eyebrow">Visualización integrada grupal</p>
    <h1>Productividad e impacto ambiental</h1>
  </header>

  {#if cargando}
    <p class="estado">Cargando visualizacion...</p>
  {:else if error}
    <div class="mensaje mensaje-error">{error}</div>
  {:else if mensajeSinPaises}
    <div class="mensaje mensaje-info">{mensajeSinPaises}</div>
  {/if}

  <section class="chart-card" aria-label="Grafico integrado de analytics">
    <div class="grafico" bind:this={chartContainer}></div>
  </section>

  <section class="descripcion">
    <h2>Descripcion</h2>
    <p>
      Esta visualizacion integra las tres APIs del grupo utilizando el pais como dimension comun.
      El eje X muestra la productividad por hora media de workers-productivity. El eje Y muestra
      un impacto ambiental combinado: para cada pais se suma el impacto de sequias
      (severity_km2 multiplicado por duration_day en cada registro de drought-stats) y el impacto
      de terremotos (severity multiplicado por depth en cada registro de earthquakes). Por tanto,
      un valor mas alto en el eje Y significa mayor exposicion acumulada a eventos ambientales
      intensos o prolongados. El tamano de la burbuja representa la poblacion expuesta registrada
      en earthquakes.
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
    max-width: 1180px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  header {
    margin-bottom: 1rem;
  }

  .eyebrow {
    margin: 0 0 0.25rem;
    color: #5f6b7a;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
  }

  h1 {
    font-size: 2rem;
  }

  h2 {
    font-size: 1.15rem;
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

  .mensaje-info {
    background: #eef5ff;
    border: 1px solid #9ec5fe;
    color: #1e4f8f;
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
  }

  .grafico {
    width: 100%;
    min-height: 540px;
  }

  .descripcion {
    margin-top: 1rem;
    padding: 1rem;
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
