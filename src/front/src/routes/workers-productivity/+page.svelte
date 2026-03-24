<script>
  import { onMount } from 'svelte';
  import { traducirErrorApi, traducirExitoApi } from '$lib/apiMessages';

  /**
   * @typedef {Object} WorkersProductivityRecord
   * @property {number} [id]
   * @property {string} country
   * @property {number} year
   * @property {number} productivity_hour
   * @property {number} avg_annual_hours
   * @property {number} gpd_per_capita
   * @property {number} human_capital
   * @property {number} capital_stock_worker
   * @property {number} employment
   * @property {number} household_consum
   * @property {number} investment_share
   */

  /**
   * @typedef {Object} WorkersProductivityForm
   * @property {string} country
   * @property {string|number} year
   * @property {string|number} productivity_hour
   * @property {string|number} avg_annual_hours
   * @property {string|number} gpd_per_capita
   * @property {string|number} human_capital
   * @property {string|number} capital_stock_worker
   * @property {string|number} employment
   * @property {string|number} household_consum
   * @property {string|number} investment_share
   */

  /**
   * @typedef {Object} WorkersProductivitySearchForm
   * @property {string|number} id
   * @property {string} country
   * @property {string|number} year
   * @property {string|number} from
   * @property {string|number} to
   * @property {string|number} productivity_hour
   * @property {string|number} avg_annual_hours
   * @property {string|number} gpd_per_capita
   * @property {string|number} human_capital
   * @property {string|number} capital_stock_worker
   * @property {string|number} employment
   * @property {string|number} household_consum
   * @property {string|number} investment_share
   */

  const API_BASE = '/api/v1/workers-productivity';
  const NOMBRE_RECURSO = 'registro de productividad laboral';
  const NOMBRE_RECURSO_PLURAL = 'registros de productividad laboral';

  /** @type {WorkersProductivityRecord[]} */
  let registros = $state([]);
  let cargando = $state(false);

  let mensaje = $state('');
  let tipoMensaje = $state('');
  let urlBusquedaActual = $state(API_BASE);
  let ultimaBusquedaFueFiltrada = $state(false);

  /** @type {WorkersProductivityForm} */
  let formulario = $state({
    country: '',
    year: '',
    productivity_hour: '',
    avg_annual_hours: '',
    gpd_per_capita: '',
    human_capital: '',
    capital_stock_worker: '',
    employment: '',
    household_consum: '',
    investment_share: ''
  });

  /** @type {WorkersProductivitySearchForm} */
  let filtros = $state({
    id: '',
    country: '',
    year: '',
    from: '',
    to: '',
    productivity_hour: '',
    avg_annual_hours: '',
    gpd_per_capita: '',
    human_capital: '',
    capital_stock_worker: '',
    employment: '',
    household_consum: '',
    investment_share: ''
  });

  /**
   * @param {string} texto
   * @param {'exito' | 'error'} [tipo='exito']
   */
  function mostrarMensaje(texto, tipo = 'exito') {
    mensaje = texto;
    tipoMensaje = tipo;
  }

  function limpiarMensaje() {
    mensaje = '';
    tipoMensaje = '';
  }

  function resetFormulario() {
    formulario.country = '';
    formulario.year = '';
    formulario.productivity_hour = '';
    formulario.avg_annual_hours = '';
    formulario.gpd_per_capita = '';
    formulario.human_capital = '';
    formulario.capital_stock_worker = '';
    formulario.employment = '';
    formulario.household_consum = '';
    formulario.investment_share = '';
  }

  function resetFiltros() {
    filtros.id = '';
    filtros.country = '';
    filtros.year = '';
    filtros.from = '';
    filtros.to = '';
    filtros.productivity_hour = '';
    filtros.avg_annual_hours = '';
    filtros.gpd_per_capita = '';
    filtros.human_capital = '';
    filtros.capital_stock_worker = '';
    filtros.employment = '';
    filtros.household_consum = '';
    filtros.investment_share = '';
  }

  /**
   * @returns {WorkersProductivityRecord}
   */
  function normalizarPayload() {
    return {
      country: formulario.country.trim(),
      year: Number(formulario.year),
      productivity_hour: Number(formulario.productivity_hour),
      avg_annual_hours: Number(formulario.avg_annual_hours),
      gpd_per_capita: Number(formulario.gpd_per_capita),
      human_capital: Number(formulario.human_capital),
      capital_stock_worker: Number(formulario.capital_stock_worker),
      employment: Number(formulario.employment),
      household_consum: Number(formulario.household_consum),
      investment_share: Number(formulario.investment_share)
    };
  }

  /**
   * Convierte cualquier valor del formulario en texto seguro.
   * Si está vacío, undefined, null o NaN, devuelve cadena vacía.
   * @param {string|number|null|undefined} valor
   * @returns {string}
   */
  function normalizarTextoFiltro(valor) {
    if (valor === undefined || valor === null) return '';

    if (typeof valor === 'number' && Number.isNaN(valor)) return '';

    const texto = String(valor).trim();

    if (texto === 'undefined' || texto === 'null' || texto === 'NaN') return '';

    return texto;
  }

  /**
   * @param {string|number|null|undefined} valor
   * @returns {boolean}
   */
  function tieneValor(valor) {
    return normalizarTextoFiltro(valor) !== '';
  }

  /**
   * @param {string|number|null|undefined} valor
   * @returns {number|null}
   */
  function convertirNumero(valor) {
    const texto = normalizarTextoFiltro(valor);
    if (!texto) return null;

    const numero = Number(texto);
    return Number.isNaN(numero) ? null : numero;
  }

  /**
   * Devuelve una copia de los filtros con todos los valores vacíos normalizados.
   * @param {WorkersProductivitySearchForm} estadoFiltros
   * @returns {WorkersProductivitySearchForm}
   */
  function sanearFiltros(estadoFiltros) {
    return {
      id: normalizarTextoFiltro(estadoFiltros.id),
      country: normalizarTextoFiltro(estadoFiltros.country),
      year: normalizarTextoFiltro(estadoFiltros.year),
      from: normalizarTextoFiltro(estadoFiltros.from),
      to: normalizarTextoFiltro(estadoFiltros.to),
      productivity_hour: normalizarTextoFiltro(estadoFiltros.productivity_hour),
      avg_annual_hours: normalizarTextoFiltro(estadoFiltros.avg_annual_hours),
      gpd_per_capita: normalizarTextoFiltro(estadoFiltros.gpd_per_capita),
      human_capital: normalizarTextoFiltro(estadoFiltros.human_capital),
      capital_stock_worker: normalizarTextoFiltro(estadoFiltros.capital_stock_worker),
      employment: normalizarTextoFiltro(estadoFiltros.employment),
      household_consum: normalizarTextoFiltro(estadoFiltros.household_consum),
      investment_share: normalizarTextoFiltro(estadoFiltros.investment_share)
    };
  }

  /**
   * @param {WorkersProductivitySearchForm} estadoFiltros
   * @returns {string}
   */
  function construirMotivoSinResultados(estadoFiltros) {
    const country = normalizarTextoFiltro(estadoFiltros.country);
    const year = normalizarTextoFiltro(estadoFiltros.year);
    const from = normalizarTextoFiltro(estadoFiltros.from);
    const to = normalizarTextoFiltro(estadoFiltros.to);

    if (country && year) {
      return `No existe ningún registro para el país "${country}" en el año ${year}.`;
    }

    if (country && from && to) {
      return `No existen registros para el país "${country}" entre los años ${from} y ${to}.`;
    }

    if (country && from) {
      return `No existen registros para el país "${country}" desde el año ${from}.`;
    }

    if (country && to) {
      return `No existen registros para el país "${country}" hasta el año ${to}.`;
    }

    if (country) {
      return `No existen registros para el país "${country}" con los filtros indicados.`;
    }

    if (year) {
      return `No existen registros para el año ${year}.`;
    }

    if (from && to) {
      return `No existen registros entre los años ${from} y ${to}.`;
    }

    if (from) {
      return `No existen registros desde el año ${from}.`;
    }

    if (to) {
      return `No existen registros hasta el año ${to}.`;
    }

    const filtrosAplicados = [];

    if (tieneValor(estadoFiltros.id)) filtrosAplicados.push(`id=${normalizarTextoFiltro(estadoFiltros.id)}`);
    if (tieneValor(estadoFiltros.productivity_hour)) filtrosAplicados.push(`productivity_hour=${normalizarTextoFiltro(estadoFiltros.productivity_hour)}`);
    if (tieneValor(estadoFiltros.avg_annual_hours)) filtrosAplicados.push(`avg_annual_hours=${normalizarTextoFiltro(estadoFiltros.avg_annual_hours)}`);
    if (tieneValor(estadoFiltros.gpd_per_capita)) filtrosAplicados.push(`gpd_per_capita=${normalizarTextoFiltro(estadoFiltros.gpd_per_capita)}`);
    if (tieneValor(estadoFiltros.human_capital)) filtrosAplicados.push(`human_capital=${normalizarTextoFiltro(estadoFiltros.human_capital)}`);
    if (tieneValor(estadoFiltros.capital_stock_worker)) filtrosAplicados.push(`capital_stock_worker=${normalizarTextoFiltro(estadoFiltros.capital_stock_worker)}`);
    if (tieneValor(estadoFiltros.employment)) filtrosAplicados.push(`employment=${normalizarTextoFiltro(estadoFiltros.employment)}`);
    if (tieneValor(estadoFiltros.household_consum)) filtrosAplicados.push(`household_consum=${normalizarTextoFiltro(estadoFiltros.household_consum)}`);
    if (tieneValor(estadoFiltros.investment_share)) filtrosAplicados.push(`investment_share=${normalizarTextoFiltro(estadoFiltros.investment_share)}`);

    if (filtrosAplicados.length > 0) {
      return `No existen registros que cumplan estos filtros: ${filtrosAplicados.join(', ')}.`;
    }

    return 'No se han encontrado registros con la búsqueda realizada.';
  }

  /**
   * @param {WorkersProductivitySearchForm} estadoFiltros
   * @returns {{ok:false,mensaje:string} | {ok:true,url:string,endpoint:string}}
   */
  function construirBusqueda(estadoFiltros) {
    const country = normalizarTextoFiltro(estadoFiltros.country);
    const year = normalizarTextoFiltro(estadoFiltros.year);
    const from = normalizarTextoFiltro(estadoFiltros.from);
    const to = normalizarTextoFiltro(estadoFiltros.to);

    const fromNum = convertirNumero(estadoFiltros.from);
    const toNum = convertirNumero(estadoFiltros.to);

    if (year && (from || to)) {
      return {
        ok: false,
        mensaje: 'No puedes usar "Año exacto" junto con "Año desde/hasta". Debes elegir una sola forma de búsqueda temporal.'
      };
    }

    if (from && to && fromNum !== null && toNum !== null && fromNum > toNum) {
      return {
        ok: false,
        mensaje: `El rango de años no es válido: "Año desde" (${from}) no puede ser mayor que "Año hasta" (${to}).`
      };
    }

    let endpoint = API_BASE;
    const params = new URLSearchParams();

    if (country && year) {
      endpoint = `${API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(year)}`;
    } else if (country) {
      endpoint = `${API_BASE}/${encodeURIComponent(country)}`;
    }

    const queryMap = {
      id: estadoFiltros.id,
      country: !country ? estadoFiltros.country : '',
      year: country && year ? '' : estadoFiltros.year,
      from: country && year ? '' : estadoFiltros.from,
      to: country && year ? '' : estadoFiltros.to,
      productivity_hour: estadoFiltros.productivity_hour,
      avg_annual_hours: estadoFiltros.avg_annual_hours,
      gpd_per_capita: estadoFiltros.gpd_per_capita,
      human_capital: estadoFiltros.human_capital,
      capital_stock_worker: estadoFiltros.capital_stock_worker,
      employment: estadoFiltros.employment,
      household_consum: estadoFiltros.household_consum,
      investment_share: estadoFiltros.investment_share
    };

    for (const [clave, valor] of Object.entries(queryMap)) {
      const texto = normalizarTextoFiltro(valor);
      if (texto) {
        params.set(clave, texto);
      }
    }

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    return { ok: true, url, endpoint };
  }

  /**
   * @param {Response} respuesta
   * @returns {Promise<string|null>}
   */
  async function extraerMensajeErrorBackend(respuesta) {
    try {
      const contenido = await respuesta.clone().json();

      if (typeof contenido === 'string' && contenido.trim()) {
        return contenido;
      }

      if (contenido?.error && typeof contenido.error === 'string') {
        return contenido.error;
      }

      if (contenido?.message && typeof contenido.message === 'string') {
        return contenido.message;
      }

      if (contenido?.mensaje && typeof contenido.mensaje === 'string') {
        return contenido.mensaje;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * @param {WorkersProductivitySearchForm} estadoFiltros
   * @returns {string}
   */
  function obtenerContextoBusqueda(estadoFiltros) {
    const partes = [];

    if (tieneValor(estadoFiltros.country)) partes.push(`país="${normalizarTextoFiltro(estadoFiltros.country)}"`);
    if (tieneValor(estadoFiltros.year)) partes.push(`año=${normalizarTextoFiltro(estadoFiltros.year)}`);
    if (tieneValor(estadoFiltros.from) && tieneValor(estadoFiltros.to)) {
      partes.push(`rango=${normalizarTextoFiltro(estadoFiltros.from)}-${normalizarTextoFiltro(estadoFiltros.to)}`);
    } else if (tieneValor(estadoFiltros.from)) {
      partes.push(`desde=${normalizarTextoFiltro(estadoFiltros.from)}`);
    } else if (tieneValor(estadoFiltros.to)) {
      partes.push(`hasta=${normalizarTextoFiltro(estadoFiltros.to)}`);
    }
    if (tieneValor(estadoFiltros.id)) partes.push(`id=${normalizarTextoFiltro(estadoFiltros.id)}`);
    return partes.length > 0 ? `Filtros usados: ${partes.join(', ')}.` : '';
  }

  /**
   * @param {string} url
   * @param {boolean} [esBusquedaFiltrada=false]
   * @param {WorkersProductivitySearchForm|null} [filtrosBusqueda=null]
   */
  async function cargarRegistros(url = API_BASE, esBusquedaFiltrada = false, filtrosBusqueda = null) {
    cargando = true;
    urlBusquedaActual = url;
    ultimaBusquedaFueFiltrada = esBusquedaFiltrada;

    try {
      const respuesta = await fetch(url);

      if (!respuesta.ok) {
        const mensajeBackend = await extraerMensajeErrorBackend(respuesta);
        const filtrosActivos = filtrosBusqueda || filtros;

        mostrarMensaje(
          mensajeBackend ||
            traducirErrorApi(respuesta.status, {
              recurso: NOMBRE_RECURSO,
              country: normalizarTextoFiltro(filtrosActivos.country),
              year: normalizarTextoFiltro(filtrosActivos.year)
            }),
          'error'
        );

        registros = [];
        return;
      }

      const datos = await respuesta.json();
      registros = Array.isArray(datos) ? datos : [datos];

      if (esBusquedaFiltrada && registros.length === 0) {
        const filtrosActivos = filtrosBusqueda || filtros;
        const motivo = construirMotivoSinResultados(filtrosActivos);
        const contexto = obtenerContextoBusqueda(filtrosActivos);
        mostrarMensaje(`${motivo}${contexto ? ` ${contexto}` : ''}`, 'error');
      }
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
      registros = [];
    } finally {
      cargando = false;
    }
  }

  async function buscarRegistros() {
    limpiarMensaje();

    const filtrosSaneados = sanearFiltros(filtros);

    filtros.id = filtrosSaneados.id;
    filtros.country = filtrosSaneados.country;
    filtros.year = filtrosSaneados.year;
    filtros.from = filtrosSaneados.from;
    filtros.to = filtrosSaneados.to;
    filtros.productivity_hour = filtrosSaneados.productivity_hour;
    filtros.avg_annual_hours = filtrosSaneados.avg_annual_hours;
    filtros.gpd_per_capita = filtrosSaneados.gpd_per_capita;
    filtros.human_capital = filtrosSaneados.human_capital;
    filtros.capital_stock_worker = filtrosSaneados.capital_stock_worker;
    filtros.employment = filtrosSaneados.employment;
    filtros.household_consum = filtrosSaneados.household_consum;
    filtros.investment_share = filtrosSaneados.investment_share;

    const busqueda = construirBusqueda(filtrosSaneados);

    if (!busqueda.ok) {
      mostrarMensaje(busqueda.mensaje || 'No se ha podido realizar la búsqueda.', 'error');
      return;
    }

    await cargarRegistros(busqueda.url, true, filtrosSaneados);
  }

  async function limpiarBusquedaYCargarTodo() {
    limpiarMensaje();
    resetFiltros();
    await cargarRegistros(API_BASE, false);
  }

  async function crearRegistro() {
    limpiarMensaje();

    const payload = normalizarPayload();

    try {
      const respuesta = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!respuesta.ok) {
        const mensajeBackend = await extraerMensajeErrorBackend(respuesta);

        mostrarMensaje(
          mensajeBackend ||
            traducirErrorApi(respuesta.status, {
              recurso: NOMBRE_RECURSO,
              country: payload.country,
              year: payload.year
            }),
          'error'
        );
        return;
      }

      mostrarMensaje(
        traducirExitoApi('crear', {
          recurso: NOMBRE_RECURSO,
          country: payload.country,
          year: payload.year
        }),
        'exito'
      );

      resetFormulario();
      await cargarRegistros(urlBusquedaActual, ultimaBusquedaFueFiltrada);
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  async function borrarTodos() {
    limpiarMensaje();

    const confirmado = confirm('¿Seguro que quieres borrar todos los datos?');
    if (!confirmado) return;

    try {
      const respuesta = await fetch(API_BASE, {
        method: 'DELETE'
      });

      if (!respuesta.ok) {
        const mensajeBackend = await extraerMensajeErrorBackend(respuesta);

        mostrarMensaje(
          mensajeBackend ||
            traducirErrorApi(respuesta.status, {
              recurso: NOMBRE_RECURSO
            }),
          'error'
        );
        return;
      }

      registros = [];
      mostrarMensaje(
        traducirExitoApi('eliminarTodos', {
          recursoPlural: NOMBRE_RECURSO_PLURAL
        }),
        'exito'
      );
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  /**
   * @param {string} country
   * @param {number} year
   */
  async function borrarRegistro(country, year) {
    limpiarMensaje();

    const confirmado = confirm(`¿Seguro que quieres eliminar el registro de ${country} en ${year}?`);
    if (!confirmado) return;

    try {
      const respuesta = await fetch(`${API_BASE}/${encodeURIComponent(country)}/${year}`, {
        method: 'DELETE'
      });

      if (!respuesta.ok) {
        const mensajeBackend = await extraerMensajeErrorBackend(respuesta);

        mostrarMensaje(
          mensajeBackend ||
            traducirErrorApi(respuesta.status, {
              recurso: NOMBRE_RECURSO,
              country,
              year
            }),
          'error'
        );
        return;
      }

      mostrarMensaje(
        traducirExitoApi('eliminar', {
          recurso: NOMBRE_RECURSO,
          country,
          year
        }),
        'exito'
      );

      await cargarRegistros(urlBusquedaActual, ultimaBusquedaFueFiltrada);
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  onMount(() => cargarRegistros());
</script>

<svelte:head>
  <title>Gestión de productividad laboral</title>
</svelte:head>

<h1>Gestión de productividad laboral</h1>
<p>Desde esta página puedes crear, consultar, editar y eliminar registros.</p>

<p>
  <a href="/">Volver a la portada del equipo</a>
</p>

{#if mensaje}
  <div class={`mensaje ${tipoMensaje}`}>
    {mensaje}
  </div>
{/if}

<section class="bloque">
  <h2>Crear nuevo registro</h2>

  <form
    onsubmit={(event) => {
      event.preventDefault();
      crearRegistro();
    }}
    class="formulario"
  >
    <label>
      País
      <input bind:value={formulario.country} required />
    </label>

    <label>
      Año
      <input bind:value={formulario.year} type="number" required />
    </label>

    <label>
      Productividad por hora
      <input bind:value={formulario.productivity_hour} type="number" step="any" required />
    </label>

    <label>
      Horas anuales medias
      <input bind:value={formulario.avg_annual_hours} type="number" step="any" required />
    </label>

    <label>
      PIB per cápita
      <input bind:value={formulario.gpd_per_capita} type="number" step="any" required />
    </label>

    <label>
      Capital humano
      <input bind:value={formulario.human_capital} type="number" step="any" required />
    </label>

    <label>
      Capital por trabajador
      <input bind:value={formulario.capital_stock_worker} type="number" step="any" required />
    </label>

    <label>
      Empleo
      <input bind:value={formulario.employment} type="number" step="any" required />
    </label>

    <label>
      Consumo del hogar
      <input bind:value={formulario.household_consum} type="number" step="any" required />
    </label>

    <label>
      Cuota de inversión
      <input bind:value={formulario.investment_share} type="number" step="any" required />
    </label>

    <div class="acciones-formulario">
      <button type="submit">Crear registro</button>
      <button type="button" onclick={resetFormulario}>Limpiar formulario</button>
    </div>
  </form>
</section>

<section class="bloque">
  <h2>Búsqueda y filtros</h2>
  <p>
    Si los filtros no son válidos o no coinciden con ningún registro, se mostrará un mensaje
    explicando la razón.
  </p>

  <form
    onsubmit={(event) => {
      event.preventDefault();
      buscarRegistros();
    }}
    class="formulario"
  >
    <label>
      ID
      <input bind:value={filtros.id} type="text" inputmode="numeric" placeholder="Ej. 3" />
    </label>

    <label>
      País
      <input bind:value={filtros.country} placeholder="Ej. Spain" />
    </label>

    <label>
      Año exacto
      <input bind:value={filtros.year} type="text" inputmode="numeric" placeholder="Ej. 1998" />
    </label>

    <label>
      Año desde
      <input bind:value={filtros.from} type="text" inputmode="numeric" placeholder="Ej. 1995" />
    </label>

    <label>
      Año hasta
      <input bind:value={filtros.to} type="text" inputmode="numeric" placeholder="Ej. 1999" />
    </label>

    <label>
      Productividad por hora
      <input bind:value={filtros.productivity_hour} type="text" inputmode="decimal" />
    </label>

    <label>
      Horas anuales medias
      <input bind:value={filtros.avg_annual_hours} type="text" inputmode="decimal" />
    </label>

    <label>
      PIB per cápita
      <input bind:value={filtros.gpd_per_capita} type="text" inputmode="decimal" />
    </label>

    <label>
      Capital humano
      <input bind:value={filtros.human_capital} type="text" inputmode="decimal" />
    </label>

    <label>
      Capital por trabajador
      <input bind:value={filtros.capital_stock_worker} type="text" inputmode="decimal" />
    </label>

    <label>
      Empleo
      <input bind:value={filtros.employment} type="text" inputmode="decimal" />
    </label>

    <label>
      Consumo del hogar
      <input bind:value={filtros.household_consum} type="text" inputmode="decimal" />
    </label>

    <label>
      Cuota de inversión
      <input bind:value={filtros.investment_share} type="text" inputmode="decimal" />
    </label>

    <div class="acciones-formulario">
      <button type="submit">Buscar</button>
      <button type="button" onclick={limpiarBusquedaYCargarTodo}>Quitar filtros</button>
    </div>
  </form>
</section>

<section class="bloque">
  <h2>Listado de registros</h2>

  <div class="acciones-superiores">
    <button type="button" onclick={() => cargarRegistros(urlBusquedaActual, ultimaBusquedaFueFiltrada)}>
      Actualizar lista
    </button>
    <button type="button" onclick={borrarTodos}>Borrar todos los datos</button>
  </div>

  <p class="url-actual">
    <strong>Consulta actual:</strong> <code>{urlBusquedaActual}</code>
  </p>

  {#if cargando}
    <p>Cargando datos...</p>
  {:else if registros.length === 0}
    <p>No hay registros disponibles.</p>
  {:else}
    <div class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>País</th>
            <th>Año</th>
            <th>Productividad/hora</th>
            <th>Horas anuales</th>
            <th>PIB per cápita</th>
            <th>Capital humano</th>
            <th>Capital/trabajador</th>
            <th>Empleo</th>
            <th>Consumo hogar</th>
            <th>Cuota inversión</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each registros as registro}
            <tr>
              <td>{registro.id ?? '-'}</td>
              <td>{registro.country}</td>
              <td>{registro.year}</td>
              <td>{registro.productivity_hour}</td>
              <td>{registro.avg_annual_hours}</td>
              <td>{registro.gpd_per_capita}</td>
              <td>{registro.human_capital}</td>
              <td>{registro.capital_stock_worker}</td>
              <td>{registro.employment}</td>
              <td>{registro.household_consum}</td>
              <td>{registro.investment_share}</td>
              <td class="acciones-celda">
                <a href={`/workers-productivity/edit/${encodeURIComponent(registro.country)}/${registro.year}`}>
                  Editar
                </a>
                <button
                  type="button"
                  onclick={() => borrarRegistro(registro.country, registro.year)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  :global(body) {
    font-family: Arial, sans-serif;
  }

  h1,
  h2 {
    margin-bottom: 0.6rem;
  }

  .bloque {
    margin: 1.5rem 0;
  }

  .formulario {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.9rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-weight: 600;
  }

  input {
    padding: 0.55rem;
    border: 1px solid #bbb;
    border-radius: 6px;
    font: inherit;
  }

  button {
    padding: 0.6rem 0.9rem;
    border: 1px solid #999;
    border-radius: 6px;
    background: #f5f5f5;
    cursor: pointer;
  }

  button:hover {
    background: #ececec;
  }

  .acciones-formulario,
  .acciones-superiores,
  .acciones-celda {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .acciones-formulario {
    grid-column: 1 / -1;
    margin-top: 0.5rem;
  }

  .tabla-contenedor {
    overflow-x: auto;
  }

  .url-actual {
    margin: 1rem 0 0.25rem;
    word-break: break-word;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  th,
  td {
    border: 1px solid #ccc;
    padding: 0.55rem;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f0f0f0;
  }

  .mensaje {
    padding: 0.9rem;
    border-radius: 8px;
    margin: 1rem 0;
    font-weight: 600;
  }

  .mensaje.exito {
    background: #e9f8ee;
    border: 1px solid #7abf8a;
  }

  .mensaje.error {
    background: #fdecec;
    border: 1px solid #d98d8d;
  }
</style>