<script>
  import { onMount } from 'svelte';
  import { traducirErrorApiEarthquake } from '$lib/apiMessagesEarthquakes';

  /**
   * @typedef {Object} EarthquakeRecord
   * @property {string} country
   * @property {string} fromdate
   * @property {string} todate
   * @property {number} severity
   * @property {string|null} alertlevel
   * @property {number|null} depth
   * @property {number|null} exposed_population
   */

  /**
   * @typedef {Object} EarthquakeForm
   * @property {string} country
   * @property {string} fromdate
   * @property {string} todate
   * @property {string|number} severity
   * @property {string} alertlevel
   * @property {string|number} depth
   * @property {string|number} exposed_population
   */

  const API_BASE = '/api/v1/earthquakes';
  const NOMBRE_RECURSO = 'terremoto';

  /** @type {EarthquakeRecord[]} */
  let registros = $state([]);
  let cargando = $state(false);
  let paginaActual = $state(1);

  let mensaje = $state('');
  let tipoMensaje = $state('');

  /** @type {EarthquakeForm} */
  let formulario = $state({
    country: '',
    fromdate: '',
    todate: '',
    severity: '',
    alertlevel: '',
    depth: '',
    exposed_population: ''
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
    formulario.fromdate = '';
    formulario.todate = '';
    formulario.severity = '';
    formulario.alertlevel = '';
    formulario.depth = '';
    formulario.exposed_population = '';
  }

  /**
   * @returns {EarthquakeRecord}
   */
  function normalizarPayload() {
    /** @type {any} */
    const payload = {
      country: formulario.country,
      fromdate: formulario.fromdate,
      severity: Number(formulario.severity)
    };
    if (formulario.todate) payload.todate = formulario.todate;
    if (formulario.alertlevel) payload.alertlevel = formulario.alertlevel;
    if (formulario.depth !== '') payload.depth = Number(formulario.depth);
    if (formulario.exposed_population !== '') payload.exposed_population = Number(formulario.exposed_population);
    return payload;
  }

  /**
   * @param {number} [pagina=1]
   */
  async function cargarRegistros(pagina = 1) {
    limpiarMensaje();
    cargando = true;

    try {
      const respuesta = await fetch(`${API_BASE}?page=${pagina}`);

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, {}),
          'error'
        );
        registros = [];
        return;
      }

      registros = /** @type {EarthquakeRecord[]} */ (await respuesta.json());
      paginaActual = pagina;
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
      registros = [];
    } finally {
      cargando = false;
    }
  }

  async function crearRegistro() {
    limpiarMensaje();

    const payload = normalizarPayload();

    try {
      const respuesta = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, {
            country: payload.country,
            fromdate: payload.fromdate
          }),
          'error'
        );
        return;
      }

      mostrarMensaje('El terremoto se ha registrado correctamente.', 'exito');
      resetFormulario();
      await cargarRegistros(paginaActual);
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  async function borrarTodos() {
    limpiarMensaje();

    const confirmado = confirm('¿Seguro que quieres borrar todos los terremotos? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    try {
      const respuesta = await fetch(API_BASE, { method: 'DELETE' });

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, {}),
          'error'
        );
        return;
      }

      registros = [];
      mostrarMensaje('Todos los terremotos se han eliminado correctamente.', 'exito');
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  /**
   * @param {string} country
   * @param {string} fromdate
   */
  async function borrarRegistro(country, fromdate) {
    limpiarMensaje();

    const confirmado = confirm(`¿Seguro que quieres eliminar el terremoto de "${country}" ocurrido el ${fromdate}?`);
    if (!confirmado) return;

    try {
      const respuesta = await fetch(
        `${API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(fromdate)}`,
        { method: 'DELETE' }
      );

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, { country, fromdate }),
          'error'
        );
        return;
      }

      mostrarMensaje(`El terremoto de "${country}" del ${fromdate} se ha eliminado correctamente.`, 'exito');
      await cargarRegistros(paginaActual);
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  onMount(cargarRegistros);

  let filtroBusqueda = $state({
    country: '',
    severity: '',
    alertlevel: '',
    fromdate: ''
  });

  async function buscarRegistros() {
    limpiarMensaje();
    cargando = true;

    const params = new URLSearchParams();
    if (filtroBusqueda.country) params.set('country', filtroBusqueda.country);
    if (filtroBusqueda.severity !== '') params.set('severity', String(filtroBusqueda.severity));
    if (filtroBusqueda.alertlevel) params.set('alertlevel', filtroBusqueda.alertlevel);
    if (filtroBusqueda.fromdate) params.set('fromdate', filtroBusqueda.fromdate);
    params.set('page', '1');

    try {
      const respuesta = await fetch(`${API_BASE}?${params.toString()}`);
      if (!respuesta.ok) {
        mostrarMensaje(traducirErrorApiEarthquake(respuesta.status, {}), 'error');
        registros = [];
        return;
      }
      registros = await respuesta.json();
      paginaActual = 1;
    } catch {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
      registros = [];
    } finally {
      cargando = false;
    }
  }

  function limpiarBusqueda() {
    filtroBusqueda.country = '';
    filtroBusqueda.severity = '';
    filtroBusqueda.alertlevel = '';
    filtroBusqueda.fromdate = '';
    cargarRegistros(1);
  }
</script>

<svelte:head>
  <title>Gestión de terremotos</title>
</svelte:head>

<h1>Gestión de terremotos</h1>
<p>Desde esta página puedes registrar, consultar y eliminar terremotos.</p>

<p>
  <a href="/">Volver a la portada del equipo</a>
</p>

{#if mensaje}
  <div class={`mensaje ${tipoMensaje}`}>
    {mensaje}
  </div>
{/if}

<section class="bloque">
  <h2>Registrar nuevo terremoto</h2>

  <form
    onsubmit={(event) => {
      event.preventDefault();
      crearRegistro();
    }}
    class="formulario"
  >
    <label>
      País <span class="obligatorio">*</span>
      <input bind:value={formulario.country} placeholder="Ej: Spain" required />
    </label>

    <label>
      Fecha de inicio <span class="obligatorio">*</span>
      <input bind:value={formulario.fromdate} type="date" required />
    </label>

    <label>
      Fecha de fin
      <input bind:value={formulario.todate} type="date" />
    </label>

    <label>
      Severidad (escala Richter) <span class="obligatorio">*</span>
      <input bind:value={formulario.severity} type="number" step="0.1" placeholder="Ej: 6.5" required />
    </label>

    <label>
      Nivel de alerta
      <select bind:value={formulario.alertlevel}>
        <option value="">— Sin especificar —</option>
        <option value="Green">Verde</option>
        <option value="Yellow">Amarillo</option>
        <option value="Orange">Naranja</option>
        <option value="Red">Rojo</option>
      </select>
    </label>

    <label>
      Profundidad (km)
      <input bind:value={formulario.depth} type="number" step="0.1" placeholder="Ej: 10" />
    </label>

    <label>
      Población expuesta
      <input bind:value={formulario.exposed_population} type="number" placeholder="Ej: 50000" />
    </label>

    <div class="acciones-formulario">
      <button type="submit">Registrar terremoto</button>
      <button type="button" onclick={resetFormulario}>Limpiar formulario</button>
    </div>
  </form>
</section>

<section class="bloque">
  <h2>Buscar terremotos</h2>

  <form
    onsubmit={(e) => { e.preventDefault(); buscarRegistros(); }}
    class="formulario"
  >
    <label>
      País
      <input bind:value={filtroBusqueda.country} placeholder="Ej: Spain" />
    </label>

    <label>
      Severidad mínima
      <input bind:value={filtroBusqueda.severity} type="number" step="0.1" placeholder="Ej: 5.0" />
    </label>

    <label>
      Nivel de alerta
      <select bind:value={filtroBusqueda.alertlevel}>
        <option value="">— Todos —</option>
        <option value="Green">Verde</option>
        <option value="Yellow">Amarillo</option>
        <option value="Orange">Naranja</option>
        <option value="Red">Rojo</option>
      </select>
    </label>

    <label>
      Fecha de inicio
      <input bind:value={filtroBusqueda.fromdate} type="date" />
    </label>

    <div class="acciones-formulario">
      <button type="submit">Buscar</button>
      <button type="button" onclick={limpiarBusqueda}>Limpiar búsqueda</button>
    </div>
  </form>
</section>

<section class="bloque">
  <h2>Listado de terremotos</h2>

  <div class="acciones-superiores">
    <button type="button" onclick={() => cargarRegistros(paginaActual)}>Actualizar lista</button>
    <button type="button" onclick={borrarTodos}>Borrar todos los terremotos</button>
  </div>

  <div class="paginacion">
    <button
      type="button"
      disabled={paginaActual <= 1}
      onclick={() => cargarRegistros(paginaActual - 1)}
    >
      ← Anterior
    </button>
    <span>Página {paginaActual}</span>
    <button
      type="button"
      disabled={registros.length < 10}
      onclick={() => cargarRegistros(paginaActual + 1)}
    >
      Siguiente →
    </button>
  </div>

  {#if cargando}
    <p>Cargando datos...</p>
  {:else if registros.length === 0}
    <p>No hay terremotos registrados en esta página.</p>
  {:else}
    <div class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>País</th>
            <th>Fecha de inicio</th>
            <th>Fecha de fin</th>
            <th>Severidad</th>
            <th>Nivel de alerta</th>
            <th>Profundidad (km)</th>
            <th>Población expuesta</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each registros as registro}
            <tr>
              <td>{registro.country}</td>
              <td>{registro.fromdate}</td>
              <td>{registro.todate ?? '—'}</td>
              <td>{registro.severity}</td>
              <td>{registro.alertlevel ?? '—'}</td>
              <td>{registro.depth ?? '—'}</td>
              <td>{registro.exposed_population != null ? registro.exposed_population.toLocaleString('es-ES') : '—'}</td>
              <td class="acciones-celda">
              <a
                href={`/earthquakes/${encodeURIComponent(registro.country)}/${encodeURIComponent(registro.fromdate)}`}
                class="boton-editar"
              >
                Editar
              </a>
              <button
                type="button"
                onclick={() => borrarRegistro(registro.country, registro.fromdate)}
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

  h1, h2 {
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

  .obligatorio {
    color: #c0392b;
    margin-left: 2px;
  }

  input, select {
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

  button:hover:not(:disabled) {
    background: #ececec;
  }

  button:disabled {
    opacity: 0.4;
    cursor: default;
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

  .paginacion {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin: 1rem 0 0.5rem;
  }

  .paginacion span {
    font-weight: 600;
  }

  .tabla-contenedor {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  th, td {
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

  .boton-editar {
    padding: 0.6rem 0.9rem;
    border: 1px solid #999;
    border-radius: 6px;
    background: #f5f5f5;
    text-decoration: none;
    color: inherit;
    font: inherit;
  }

  .boton-editar:hover {
    background: #ececec;
  }
</style>