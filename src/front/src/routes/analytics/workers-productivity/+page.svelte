<script>
  import { onMount, onDestroy } from 'svelte';

  /**
   * @typedef {Object} WorkersProductivityRecord
   * @property {string} country
   * @property {number|string} year
   * @property {number|string} productivity_hour
   * @property {number|string} avg_annual_hours
   * @property {number|string} gpd_per_capita
   * @property {number|string} human_capital
   * @property {number|string} capital_stock_worker
   * @property {number|string} employment
   * @property {number|string} household_consum
   * @property {number|string} investment_share
   */

  /**
   * @typedef {Object} ScatterPoint
   * @property {string} name
   * @property {string} country
   * @property {number} year
   * @property {number} x
   * @property {number} y
   * @property {number} productivity_hour
   * @property {number} avg_annual_hours
   * @property {number} gpd_per_capita
   * @property {number} human_capital
   * @property {number} capital_stock_worker
   * @property {number} employment
   * @property {number} household_consum
   * @property {number} investment_share
   */

  /** @type {HTMLDivElement | undefined} */
  let chartContainer;

  /** @type {import('highcharts').Chart | undefined} */
  let chart;

  let cargando = true;
  let error = '';

  let xMin = 0;
  let xMax = 0;
  let yMin = 0;
  let yMax = 0;

  let limitesIniciales = {
    xMin: 0,
    xMax: 0,
    yMin: 0,
    yMax: 0
  };

  const API_URL = '/api/v1/workers-productivity';

  /**
   * @param {number|string} valor
   * @returns {number}
   */
  function normalizarNumero(valor) {
    const numero = Number(valor);
    return Number.isNaN(numero) ? 0 : numero;
  }

  /**
   * @param {WorkersProductivityRecord[]} datos
   * @returns {ScatterPoint[]}
   */
  function transformarDatos(datos) {
    return datos.map((item) => ({
      name: `${item.country} (${item.year})`,
      country: item.country,
      year: normalizarNumero(item.year),
      x: normalizarNumero(item.gpd_per_capita),
      y: normalizarNumero(item.productivity_hour),
      productivity_hour: normalizarNumero(item.productivity_hour),
      avg_annual_hours: normalizarNumero(item.avg_annual_hours),
      gpd_per_capita: normalizarNumero(item.gpd_per_capita),
      human_capital: normalizarNumero(item.human_capital),
      capital_stock_worker: normalizarNumero(item.capital_stock_worker),
      employment: normalizarNumero(item.employment),
      household_consum: normalizarNumero(item.household_consum),
      investment_share: normalizarNumero(item.investment_share)
    }));
  }

  /**
   * @param {ScatterPoint[]} puntos
   * @returns {Array<{ type: 'line', name: string, data: ScatterPoint[], marker: { enabled: boolean, radius: number }, lineWidth: number }>}
   */
  function crearSeriesPorPais(puntos) {
    /** @type {Map<string, ScatterPoint[]>} */
    const puntosPorPais = new Map();

    for (const punto of puntos) {
      const puntosPais = puntosPorPais.get(punto.country) ?? [];
      puntosPais.push(punto);
      puntosPorPais.set(punto.country, puntosPais);
    }

    return Array.from(puntosPorPais.entries()).map(([country, puntosPais]) => ({
      type: 'line',
      name: country,
      data: puntosPais.sort((a, b) => a.year - b.year),
      marker: {
        enabled: true,
        radius: 4
      },
      lineWidth: 2
    }));
  }

  /**
   * @param {number[]} valores
   * @param {number} base
   * @returns {{ min: number, max: number }}
   */
  function calcularRango(valores, base) {
    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const margen = (maximo - minimo) * 0.06 || base;

    return {
      min: Math.max(0, Math.floor((minimo - margen) / base) * base),
      max: Math.ceil((maximo + margen) / base) * base
    };
  }

  /**
   * @param {ScatterPoint[]} puntos
   */
  function prepararRangos(puntos) {
    const rangoX = calcularRango(
      puntos.map((punto) => punto.x),
      1000
    );
    const rangoY = calcularRango(
      puntos.map((punto) => punto.y),
      100
    );

    xMin = rangoX.min;
    xMax = rangoX.max;
    yMin = rangoY.min;
    yMax = rangoY.max;

    limitesIniciales = { xMin, xMax, yMin, yMax };
  }

  function sincronizarRangosConGrafico() {
    if (!chart) {
      return;
    }

    const extremosX = chart.xAxis[0].getExtremes();
    const extremosY = chart.yAxis[0].getExtremes();

    xMin = Math.round(extremosX.min);
    xMax = Math.round(extremosX.max);
    yMin = Math.round(extremosY.min);
    yMax = Math.round(extremosY.max);

    limitesIniciales = { xMin, xMax, yMin, yMax };
  }

  function normalizarRangos() {
    xMin = Number(xMin);
    xMax = Number(xMax);
    yMin = Number(yMin);
    yMax = Number(yMax);

    if (xMin >= xMax) {
      xMax = xMin + 1000;
    }

    if (yMin >= yMax) {
      yMax = yMin + 100;
    }
  }

  function aplicarRangos() {
    if (!chart) {
      return;
    }

    normalizarRangos();
    chart.xAxis[0].setExtremes(xMin, xMax, false);
    chart.yAxis[0].setExtremes(yMin, yMax, false);
    chart.redraw();
  }

  /**
   * @param {number} factor
   */
  function escalarRangos(factor) {
    const centroX = (xMin + xMax) / 2;
    const centroY = (yMin + yMax) / 2;
    const mitadX = ((xMax - xMin) * factor) / 2;
    const mitadY = ((yMax - yMin) * factor) / 2;

    xMin = Math.max(0, Math.round(centroX - mitadX));
    xMax = Math.round(centroX + mitadX);
    yMin = Math.max(0, Math.round(centroY - mitadY));
    yMax = Math.round(centroY + mitadY);

    aplicarRangos();
  }

  function restablecerRangos() {
    xMin = limitesIniciales.xMin;
    xMax = limitesIniciales.xMax;
    yMin = limitesIniciales.yMin;
    yMax = limitesIniciales.yMax;
    aplicarRangos();
  }

  async function cargarGrafico() {
    try {
      const respuesta = await fetch(API_URL);

      if (!respuesta.ok) {
        throw new Error('No se han podido obtener los datos de la API.');
      }

      /** @type {WorkersProductivityRecord[]} */
      const datos = await respuesta.json();

      if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error('La API no ha devuelto datos para representar.');
      }

      const Highcharts = (await import('highcharts')).default;
      const datosGrafico = transformarDatos(datos);
      const seriesPorPais = crearSeriesPorPais(datosGrafico);

      prepararRangos(datosGrafico);

      if (!chartContainer) {
        throw new Error('No se ha podido inicializar el contenedor del grafico.');
      }

      chart = Highcharts.chart(chartContainer, {
        chart: {
          type: 'scatter',
          zooming: {
            type: 'xy'
          }
        },
        title: {
          text: 'Relacion entre PIB per capita y productividad laboral'
        },
        subtitle: {
          text: ''
        },
        xAxis: {
          min: xMin,
          max: xMax,
          title: {
            text: 'PIB per capita'
          }
        },
        yAxis: {
          min: yMin,
          max: yMax,
          title: {
            text: 'Productividad por hora'
          }
        },
        tooltip: {
          useHTML: true,
          headerFormat: '',
          pointFormat: '<strong>{point.country}</strong><br/>Año: {point.year}'
        },
        legend: {
          enabled: false
        },
        series: seriesPorPais,
        credits: {
          enabled: false
        }
      });

      sincronizarRangosConGrafico();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Ha ocurrido un error al cargar el grafico.';
    } finally {
      cargando = false;
    }
  }

  onMount(() => {
    cargarGrafico();
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
</script>

<svelte:head>
  <title>Analytics workers-productivity</title>
</svelte:head>

<main class="pagina-analitica">
  <section class="panel-grafico" aria-label="Grafico de productividad laboral">
    {#if cargando}
      <p class="estado">Cargando grafico...</p>
    {:else if error}
      <div class="mensaje-error">
        {error}
      </div>
    {/if}

    <div class="grafico" bind:this={chartContainer}></div>
  </section>

  <aside class="barra-lateral" aria-label="Controles del grafico">
    <a class="volver" href="/workers-productivity">Volver</a>

    <div>
      <p class="etiqueta">Rangos</p>
      <h2>Ajuste del grafico</h2>
    </div>

    <fieldset>
      <legend>PIB per capita</legend>
      <label>
        Minimo
        <input type="number" bind:value={xMin} step="100" oninput={aplicarRangos} />
      </label>
      <label>
        Maximo
        <input type="number" bind:value={xMax} step="100" oninput={aplicarRangos} />
      </label>
    </fieldset>

    <fieldset>
      <legend>Productividad por hora</legend>
      <label>
        Minimo
        <input type="number" bind:value={yMin} step="10" oninput={aplicarRangos} />
      </label>
      <label>
        Maximo
        <input type="number" bind:value={yMax} step="10" oninput={aplicarRangos} />
      </label>
    </fieldset>

    <div class="acciones">
      <button type="button" onclick={() => escalarRangos(0.75)}>
        Ampliar
      </button>
      <button type="button" onclick={() => escalarRangos(1.25)}>
        Disminuir
      </button>
      <button type="button" onclick={restablecerRangos}>
        Restablecer
      </button>
    </div>
  </aside>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f7f8fa;
    color: #17202a;
    font-family: Arial, sans-serif;
  }

  .pagina-analitica {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 1rem;
    min-height: 100vh;
    padding: 1rem;
    box-sizing: border-box;
  }

  .panel-grafico,
  .barra-lateral {
    background: #ffffff;
    border: 1px solid #e2e6ea;
    border-radius: 8px;
    box-shadow: 0 8px 22px rgba(24, 39, 75, 0.05);
  }

  .panel-grafico {
    position: relative;
    min-width: 0;
    padding: 0.75rem;
  }

  .grafico {
    width: 100%;
    height: calc(100vh - 3.5rem);
    min-height: 520px;
  }

  .estado {
    position: absolute;
    z-index: 1;
    top: 1rem;
    left: 1.25rem;
    margin: 0;
    color: #566573;
  }

  .mensaje-error {
    background: #fdecec;
    border: 1px solid #d98d8d;
    padding: 1rem;
    border-radius: 8px;
    font-weight: 600;
    margin: 1rem 0;
  }

  .barra-lateral {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .volver {
    color: #2563eb;
    font-weight: 700;
    text-decoration: none;
  }

  .volver:hover {
    text-decoration: underline;
  }

  .etiqueta {
    margin: 0 0 0.25rem;
    color: #6b7280;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  fieldset {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0.85rem;
    border: 1px solid #d9dee5;
    border-radius: 8px;
  }

  legend {
    padding: 0 0.35rem;
    font-size: 0.85rem;
    font-weight: 700;
  }

  label {
    display: grid;
    gap: 0.3rem;
    color: #4b5563;
    font-size: 0.82rem;
    font-weight: 700;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 0.55rem 0.6rem;
    font: inherit;
  }

  input:focus {
    border-color: #2563eb;
    outline: 3px solid rgba(37, 99, 235, 0.14);
  }

  .acciones {
    display: grid;
    gap: 0.6rem;
    margin-top: auto;
  }

  button {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    color: #111827;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.65rem 0.75rem;
  }

  button:hover:enabled {
    background: #f1f5f9;
  }

  @media (max-width: 860px) {
    .pagina-analitica {
      grid-template-columns: 1fr;
    }

    .grafico {
      height: 60vh;
    }

    .barra-lateral {
      order: -1;
    }
  }
</style>
