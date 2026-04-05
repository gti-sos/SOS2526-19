<script>
  import { onMount } from 'svelte';
  import { traducirErrorApiDrought } from '$lib/apiMessagesDroughtStats';



  /**
   * @typedef {Object} DroughtStatsRecord
   * @property {string} description
   * @property {string} alert_level
   * @property {number} alert_score
   * @property {number} episode_alert_score
   * @property {string} country
   * @property {number} from_date
   * @property {number} to_date
   * @property {number} severity_km2
   * @property {string} iso
   * @property {string} gdacs_id
   * @property {number} duration_day
   * @property {string} impact
   * @property {number} longitude
   * @property {number} latitude
   */

  /**
   * @typedef {Object} DroughtStatsForm
   * @property {string} description
   * @property {string} alert_level
   * @property {string|number} alert_score
   * @property {string|number} episode_alert_score
   * @property {string} country
   * @property {string|number} from_date
   * @property {string|number} to_date
   * @property {string|number} severity_km2
   * @property {string} iso
   * @property {string} gdacs_id
   * @property {string|number} duration_day
   * @property {string} impact
   * @property {string|number} longitude
   * @property {string|number} latitude
   */

     /**
   * @typedef {Object} DroughtStatsSearchForm
   * @property {string} description
   * @property {string} alert_level
   * @property {string|number} alert_score
   * @property {string|number} episode_alert_score
   * @property {string} country
   * @property {string|number} from_date
   * @property {string|number} to_date
   * @property {string|number} severity_km2
   * @property {string} iso
   * @property {string} gdacs_id
   * @property {string|number} duration_day
   * @property {string} impact
   * @property {string|number} longitude
   * @property {string|number} latitude
   */
  
  const API_BASE = '/api/v1/drought-stats';
  const NOMBRE_RECURSO = 'registro de sequía';


  /** @type {DroughtStatsRecord[]} */

  let registros = $state([]);
  let cargando = $state(false);

  let mensaje = $state('');
  let tipoMensaje = $state('');
  let urlBusquedaActual = $state(API_BASE);
  let ultimaBusquedaFueFiltrada = $state(false);

  /** @type {DroughtStatsForm} */


  let formulario = $state({
    description: '',
    alert_level: '',
    alert_score: '',
    episode_alert_score: '',
    country: '',
    from_date: '',
    to_date: '',
    severity_km2: '',
    iso: '',
    gdacs_id: '',
    duration_day: '',
    impact: '',
    longitude: '',
    latitude: ''
  });

  /** @type {DroughtStatsSearchForm} */
  let filtros = $state({
    description: '',
    alert_level: '',
    alert_score: '',
    episode_alert_score: '',
    country: '',
    from_date: '',
    to_date: '',
    severity_km2: '',
    iso: '',
    gdacs_id: '',
    duration_day: '',
    impact: '',
    longitude: '',
    latitude: ''
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
    formulario.description = '';
    formulario.alert_level = '';
    formulario.alert_score = '';
    formulario.episode_alert_score = '';
    formulario.country = '';
    formulario.from_date = '';
    formulario.to_date = '';
    formulario.severity_km2 = '';
    formulario.iso = '';
    formulario.gdacs_id = '';
    formulario.duration_day = '';
    formulario.impact = '';
    formulario.longitude = '';
    formulario.latitude = '';
  }

  function resetFiltros() {
    filtros.description = '';
    filtros.alert_level = '';
    filtros.alert_score = '';
    filtros.episode_alert_score = '';
    filtros.country = '';
    filtros.from_date = '';
    filtros.to_date = '';
    filtros.severity_km2 = '';
    filtros.iso = '';
    filtros.gdacs_id = '';
    filtros.duration_day = '';
    filtros.impact = '';
    filtros.longitude = '';
    filtros.latitude = '';
  }

  /**
   * @returns {DroughtStatsRecord}
   */

  function normalizarPayload() {
    return {
      description: formulario.description,
      alert_level: formulario.alert_level,
      alert_score: Number(formulario.alert_score),
      episode_alert_score: Number(formulario.episode_alert_score),
      country: formulario.country,
      from_date: Number(formulario.from_date),
      to_date: Number(formulario.to_date),
      severity_km2: Number(formulario.severity_km2),
      iso: formulario.iso,
      gdacs_id: formulario.gdacs_id,
      duration_day: Number(formulario.duration_day),
      impact: formulario.impact,
      longitude: Number(formulario.longitude),
      latitude: Number(formulario.latitude)
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
   * @param {DroughtStatsSearchForm} estadoFiltros
   * @returns {DroughtStatsSearchForm}
   */
  function sanearFiltros(estadoFiltros) {
    return {
      description: normalizarTextoFiltro(estadoFiltros.description),
      alert_level: normalizarTextoFiltro(estadoFiltros.alert_level),
      alert_score: normalizarTextoFiltro(estadoFiltros.alert_score),
      episode_alert_score: normalizarTextoFiltro(estadoFiltros.episode_alert_score),
      country: normalizarTextoFiltro(estadoFiltros.country),
      from_date: normalizarTextoFiltro(estadoFiltros.from_date),
      to_date: normalizarTextoFiltro(estadoFiltros.to_date),
      severity_km2: normalizarTextoFiltro(estadoFiltros.severity_km2),
      iso: normalizarTextoFiltro(estadoFiltros.iso),
      gdacs_id: normalizarTextoFiltro(estadoFiltros.gdacs_id),
      duration_day: normalizarTextoFiltro(estadoFiltros.duration_day),
      impact: normalizarTextoFiltro(estadoFiltros.impact),
      longitude: normalizarTextoFiltro(estadoFiltros.longitude),
      latitude: normalizarTextoFiltro(estadoFiltros.latitude)

    };
  }

  /**
   * @param {DroughtStatsSearchForm} estadoFiltros
   * @returns {string}
   */
  function construirMotivoSinResultados(estadoFiltros) {
    const country = normalizarTextoFiltro(estadoFiltros.country);
    const from_date = normalizarTextoFiltro(estadoFiltros.from_date);
    const to_date = normalizarTextoFiltro(estadoFiltros.to_date);

    if (country && from_date && to_date) {
      return `No existen registros para el país "${country}" entre los años ${from_date} y ${to_date}.`;
    }

    if (country && from_date) {
      return `No existen registros para el país "${country}" desde el año ${from_date}.`;
    }

    if (country && to_date) {
      return `No existen registros para el país "${country}" hasta el año ${to_date}.`;
    }

    if (country) {
      return `No existen registros para el país "${country}" con los filtros indicados.`;
    }

    if (from_date && to_date) {
      return `No existen registros entre los años ${from_date} y ${to_date}.`;
    }

    if (from_date) {
      return `No existen registros desde el año ${from_date}.`;
    }

    if (to_date) {
      return `No existen registros hasta el año ${to_date}.`;
    }


    const filtrosAplicados = [];

    if (tieneValor(estadoFiltros.description)) filtrosAplicados.push(`description=${normalizarTextoFiltro(estadoFiltros.description)}`);
    if (tieneValor(estadoFiltros.alert_level)) filtrosAplicados.push(`alert_level=${normalizarTextoFiltro(estadoFiltros.alert_level)}`);
    if (tieneValor(estadoFiltros.alert_score)) filtrosAplicados.push(`alert_score=${normalizarTextoFiltro(estadoFiltros.alert_score)}`);
    if (tieneValor(estadoFiltros.episode_alert_score)) filtrosAplicados.push(`episode_alert_score=${normalizarTextoFiltro(estadoFiltros.episode_alert_score)}`);
    if (tieneValor(estadoFiltros.severity_km2)) filtrosAplicados.push(`severity_km2=${normalizarTextoFiltro(estadoFiltros.severity_km2)}`);
    if (tieneValor(estadoFiltros.iso)) filtrosAplicados.push(`iso=${normalizarTextoFiltro(estadoFiltros.iso)}`);
    if (tieneValor(estadoFiltros.gdacs_id)) filtrosAplicados.push(`gdacs_id=${normalizarTextoFiltro(estadoFiltros.gdacs_id)}`);
    if (tieneValor(estadoFiltros.duration_day)) filtrosAplicados.push(`duration_day=${normalizarTextoFiltro(estadoFiltros.duration_day)}`);
    if (tieneValor(estadoFiltros.impact)) filtrosAplicados.push(`impact=${normalizarTextoFiltro(estadoFiltros.impact)}`);
    if (tieneValor(estadoFiltros.longitude)) filtrosAplicados.push(`longitude=${normalizarTextoFiltro(estadoFiltros.longitude)}`);
    if (tieneValor(estadoFiltros.latitude)) filtrosAplicados.push(`latitude=${normalizarTextoFiltro(estadoFiltros.latitude)}`);


    if (filtrosAplicados.length > 0) {
      return `No existen registros que cumplan estos filtros: ${filtrosAplicados.join(', ')}.`;
    }

    return 'No se han encontrado registros con la búsqueda realizada.';
  }

  /**
   * @param {DroughtStatsSearchForm} estadoFiltros
   * @returns {{ok:false,mensaje:string} | {ok:true,url:string,endpoint:string}}
   */
  function construirBusqueda(estadoFiltros) {
    const country = normalizarTextoFiltro(estadoFiltros.country);
    const from_date = normalizarTextoFiltro(estadoFiltros.from_date);
    const to_date = normalizarTextoFiltro(estadoFiltros.to_date);

    const from_dateNum = convertirNumero(estadoFiltros.from_date);
    const to_dateNum = convertirNumero(estadoFiltros.to_date);

    if (from_date && to_date && from_dateNum !== null && to_dateNum !== null && from_dateNum > to_dateNum) {
      return {
        ok: false,
        mensaje: `El rango de años no es válido: "Año desde" (${from_date}) no puede ser mayor que "Año hasta" (${to_date}).`
      };
    }

    let endpoint = API_BASE;
    const params = new URLSearchParams();
/*
    if (country && from_date) {
      endpoint = `${API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(from_date)}`;
    } else if (country) {
      endpoint = `${API_BASE}/${encodeURIComponent(country)}`;
    }
*/
    const queryMap = {
      description: estadoFiltros.description,
      alert_level: estadoFiltros.alert_level,
      alert_score: estadoFiltros.alert_score,
      episode_alert_score: estadoFiltros.episode_alert_score,
      country: estadoFiltros.country,
      from_date: estadoFiltros.from_date,
      to_date: estadoFiltros.to_date,
      severity_km2: estadoFiltros.severity_km2,
      iso: estadoFiltros.iso,
      gdacs_id: estadoFiltros.gdacs_id,
      duration_day: estadoFiltros.duration_day,
      impact: estadoFiltros.impact,
      longitude: estadoFiltros.longitude,
      latitude: estadoFiltros.latitude
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
   * @param {DroughtStatsSearchForm} estadoFiltros
   * @returns {string}
   */
  function obtenerContextoBusqueda(estadoFiltros) {
    const partes = [];

    if (tieneValor(estadoFiltros.country)) partes.push(`país="${normalizarTextoFiltro(estadoFiltros.country)}"`);
    if (tieneValor(estadoFiltros.from_date) && tieneValor(estadoFiltros.to_date)) {
      partes.push(`rango=${normalizarTextoFiltro(estadoFiltros.from_date)}-${normalizarTextoFiltro(estadoFiltros.to_date)}`);
    } else if (tieneValor(estadoFiltros.from_date)) {
      partes.push(`desde=${normalizarTextoFiltro(estadoFiltros.from_date)}`);
    } else if (tieneValor(estadoFiltros.to_date)) {
      partes.push(`hasta=${normalizarTextoFiltro(estadoFiltros.to_date)}`);
    }
    return partes.length > 0 ? `Filtros usados: ${partes.join(', ')}.` : '';
  }

  /**
   * @param {string} url
   * @param {boolean} [esBusquedaFiltrada=false]
   * @param {DroughtStatsSearchForm|null} [filtrosBusqueda=null]
   */

  async function cargarRegistros(url = API_BASE, esBusquedaFiltrada = false, filtrosBusqueda = null) {
    cargando = true;
    urlBusquedaActual = url;
    ultimaBusquedaFueFiltrada = esBusquedaFiltrada;
    //limpiarMensaje();

    try {
      /*
      const respuesta = await fetch(url);

      let data = [];

      if (respuesta.status === 404) {
        data = [];
      } 
      else if (respuesta.ok) {
        data = await respuesta.json();
      } 
      else {
        mostrarMensaje(
          traducirErrorApiDrought(respuesta.status, {
            recurso: NOMBRE_RECURSO
          }),
          'error'
        );
        registros = [];
        return;
      }

      if (!data || data.length === 0) {
        const respuestaInit = await fetch(`${API_BASE}/loadInitialData`);

        if (!respuestaInit.ok) {
          mostrarMensaje(
            traducirErrorApiDrought(respuestaInit.status, {
              recurso: NOMBRE_RECURSO
            }),
            'error'
          );
          registros = [];
          return;
        }

        mostrarMensaje('Datos iniciales cargados correctamente.', 'exito');

        const nuevaRespuesta = await fetch(API_BASE);

        if (!nuevaRespuesta.ok) {
          mostrarMensaje(
            traducirErrorApiDrought(nuevaRespuesta.status, {
              recurso: NOMBRE_RECURSO
            }),
            'error'
          );
          registros = [];
          return;
        }

        data = await nuevaRespuesta.json();
      }

      registros = data;
*/

      const respuesta = await fetch(url);

      let datos = [];

      if (respuesta.status === 404) {
        datos = [];
      } 
      else if (respuesta.ok) {
        datos = await respuesta.json();
      } 
      else {
        const mensajeBackend = await extraerMensajeErrorBackend(respuesta);
        const filtrosActivos = filtrosBusqueda || filtros;

        mostrarMensaje(
          mensajeBackend ||
            traducirErrorApiDrought(respuesta.status, {
              recurso: NOMBRE_RECURSO,
              country: normalizarTextoFiltro(filtrosActivos.country),
              from_date: normalizarTextoFiltro(filtrosActivos.from_date)
            }),
          'error'
        );

        registros = [];
        return;
      }

      registros = Array.isArray(datos) ? datos : [datos];


      if (registros.length === 0 && !esBusquedaFiltrada) {
        const respuestaInit = await fetch(`${API_BASE}/loadInitialData`);

        if (!respuestaInit.ok) {
          mostrarMensaje(
            traducirErrorApiDrought(respuestaInit.status, {
              recurso: NOMBRE_RECURSO
            }),
            'error'
          );
          registros = [];
          return;
        }

        mostrarMensaje('Datos iniciales cargados correctamente.', 'exito');

        const nuevaRespuesta = await fetch(API_BASE);

        if (!nuevaRespuesta.ok) {
          mostrarMensaje(
            traducirErrorApiDrought(nuevaRespuesta.status, {
              recurso: NOMBRE_RECURSO
            }),
            'error'
          );
          registros = [];
          return;
        }

        const nuevosDatos = await nuevaRespuesta.json();
        registros = Array.isArray(nuevosDatos) ? nuevosDatos : [nuevosDatos];
      }


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

    filtros.description = filtrosSaneados.description;
    filtros.alert_level = filtrosSaneados.alert_level;
    filtros.alert_score = filtrosSaneados.alert_score;
    filtros.episode_alert_score = filtrosSaneados.episode_alert_score;
    filtros.country = filtrosSaneados.country;
    filtros.from_date = filtrosSaneados.from_date;
    filtros.to_date = filtrosSaneados.to_date;
    filtros.severity_km2 = filtrosSaneados.severity_km2;
    filtros.iso = filtrosSaneados.iso;
    filtros.gdacs_id = filtrosSaneados.gdacs_id;
    filtros.duration_day = filtrosSaneados.duration_day;
    filtros.impact = filtrosSaneados.impact;
    filtros.longitude = filtrosSaneados.longitude;
    filtros.latitude = filtrosSaneados.latitude;


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
          traducirErrorApiDrought(respuesta.status, {
            recurso: NOMBRE_RECURSO,
            country: payload.country,
            from_date: payload.from_date
          }),
          'error'
        );
        return;
      }

      mostrarMensaje('El registro se ha creado correctamente.', 'exito');
      resetFormulario();
      await cargarRegistros();
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
          traducirErrorApiDrought(respuesta.status, {
            recurso: NOMBRE_RECURSO
          }),
          'error'
        );
        return;
      }

      registros = [];
      mostrarMensaje('Todos los datos se han eliminado correctamente.', 'exito');
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  /**
   * @param {string} country
   * @param {number} from_date
   */

  async function borrarRegistro(country, from_date) {
    limpiarMensaje();

    const confirmado = confirm(`¿Seguro que quieres eliminar el registro de ${country} en ${from_date}?`);
    if (!confirmado) return;

    try {
      const respuesta = await fetch(`${API_BASE}/${encodeURIComponent(country)}/${from_date}`, {
        method: 'DELETE'
      });

      if (!respuesta.ok) {
        const mensajeBackend = await extraerMensajeErrorBackend(respuesta);

        mostrarMensaje(
          mensajeBackend ||
          traducirErrorApiDrought(respuesta.status, {
            recurso: NOMBRE_RECURSO,
            country,
            from_date
          }),
          'error'
        );
        return;
      }

      mostrarMensaje('El registro se ha eliminado correctamente.', 'exito');
      await cargarRegistros();
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  onMount(cargarRegistros);
</script>

<svelte:head>
  <title>Gestión de sequías</title>
</svelte:head>

<h1>Gestión de sequías</h1>
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
      Descripción
      <input bind:value={formulario.description} data-testid="description"/>
    </label>

    <label>
      Nivel de alerta
      <input bind:value={formulario.alert_level} data-testid="alert_level"/>
    </label>

    <label>
      Puntuación de alerta
      <input bind:value={formulario.alert_score} type="number" step="any" data-testid="alert_score"/>
    </label>

    <label>
      Episodio puntuación de alerta
      <input bind:value={formulario.episode_alert_score} type="number" step="any" data-testid="episode_alert_score"/>
    </label>

    <label>
      País
      <input bind:value={formulario.country} step="any" required data-testid="country"/>
    </label>

    <label>
      Año de origen
      <input bind:value={formulario.from_date} type="number" step="any" required data-testid="from_date"/>
    </label>

    <label>
      Año de finalización
      <input bind:value={formulario.to_date} type="number" step="any" required data-testid="to_date"/>
    </label>

    <label>
      Severidad en kilómetros cuadrados
      <input bind:value={formulario.severity_km2} type="number" step="any" required data-testid="severity_km2"/>
    </label>

    <label>
      ISO
      <input bind:value={formulario.iso} step="any" data-testid="iso"/>
    </label>

    <label>
      GDACS_ID
      <input bind:value={formulario.gdacs_id} step="any" data-testid="gdacs_id"/>
    </label>

    <label>
      Días de duración
      <input bind:value={formulario.duration_day} type="number" step="any" data-testid="duration_day"/>
    </label>

    <label>
      Impacto
      <input bind:value={formulario.impact} step="any" data-testid="impact"/>
    </label>

    <label>
      Longitud
      <input bind:value={formulario.longitude} type="number" step="any" data-testid="longitude"/>
    </label>

    <label>
      Latitud
      <input bind:value={formulario.latitude} type="number" step="any" data-testid="latitude"/>
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
      Descripción
      <input bind:value={filtros.description} type="text" data-testid="filter-description"/>
    </label>

    <label>
      Nivel de alerta
      <input bind:value={filtros.alert_level} type="text" data-testid="filter-alert_level"/>
    </label>

    <label>
      Puntuación de alerta
      <input bind:value={filtros.alert_score} type="text" inputmode="numeric" data-testid="filter-alert_score"/>
    </label>

    <label>
      Episodio puntuación de alerta
      <input bind:value={filtros.episode_alert_score} type="text" inputmode="numeric" data-testid="filter-episode_alert_score"/>
    </label>

    <label>
      País
      <input bind:value={filtros.country} type="text" data-testid="filter-country"/>
    </label>

    <label>
      Año de origen
      <input bind:value={filtros.from_date} type="text" inputmode="numeric" data-testid="filter-from_date"/>
    </label>

    <label>
      Año de finalización
      <input bind:value={filtros.to_date} type="text" inputmode="numeric" data-testid="filter-to_date"/>
    </label>

    <label>
      Severidad en kilómetros cuadrados
      <input bind:value={filtros.severity_km2} type="text" inputmode="numeric" data-testid="filter-severity_km2"/>
    </label>

    <label>
      ISO
      <input bind:value={filtros.iso} type="text" data-testid="filter-iso"/>
    </label>

    <label>
      GDACS_ID
      <input bind:value={filtros.gdacs_id} type="text" data-testid="filter-gdacs_id"/>
    </label>

    <label>
      Días de duración
      <input bind:value={filtros.duration_day} type="text" inputmode="numeric" data-testid="filter-duration_day"/>
    </label>

    <label>
      Impacto
      <input bind:value={filtros.impact} type="text" data-testid="filter-impact"/>
    </label>

    <label>
      Longitud
      <input bind:value={filtros.longitude} type="text" inputmode="decimal" data-testid="filter-longitude"/>
    </label>

    <label>
      Latitud
      <input bind:value={filtros.latitude} type="text" inputmode="decimal" data-testid="filter-latitude"/>
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
    <button type="button" onclick={() => cargarRegistros(urlBusquedaActual, ultimaBusquedaFueFiltrada)}>Cargar registros</button>
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
            <th>Descripción</th>
            <th>Nivel de alerta</th>
            <th>Puntuación de alerta</th>
            <th>Episodio puntuación de alerta</th>
            <th>País</th>
            <th>Año de origen</th>
            <th>Año de finalización</th>
            <th>Severidad en kilómetros cuadrados</th>
            <th>ISO</th>
            <th>GDACS_ID</th>
            <th>Días de duración</th>
            <th>Impacto</th>
            <th>Longitud</th>
            <th>Latitud</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each registros as registro}
            <tr>
              <td>{registro.description}</td>
              <td>{registro.alert_level}</td>
              <td>{registro.alert_score}</td>
              <td>{registro.episode_alert_score}</td>
              <td>{registro.country}</td>
              <td>{registro.from_date}</td>
              <td>{registro.to_date}</td>
              <td>{registro.severity_km2}</td>
              <td>{registro.iso}</td>
              <td>{registro.gdacs_id}</td>
              <td>{registro.duration_day}</td>
              <td>{registro.impact}</td>
              <td>{registro.longitude}</td>
              <td>{registro.latitude}</td>
              <td class="acciones-celda">
                <a href={`/drought-stats/edit/${encodeURIComponent(registro.country)}/${registro.from_date}`}>
                  Editar
                </a>
                <button
                  type="button"
                  onclick={() => borrarRegistro(registro.country, registro.from_date)}
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