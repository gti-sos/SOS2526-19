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

  /** @type {EarthquakeRecord[]} */
  let registros = $state([]);
  let cargando = $state(false);
  let cargandoInicial = $state(false);
  let paginaActual = $state(1);

  let estadoMensaje = $state({ texto: '', tipo: '' });

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

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timeoutMensaje;

  /** @param {string} texto @param {'exito' | 'error'} [tipo='exito'] */
  function mostrarMensaje(texto, tipo = 'exito') {
    estadoMensaje = { texto, tipo };

    clearTimeout(timeoutMensaje);

    timeoutMensaje = setTimeout(() => {
      estadoMensaje = { texto: '', tipo: '' };
    }, 3000);
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

  /** @returns {EarthquakeRecord} */
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

  /** @param {number} [pagina=1] */
  async function cargarRegistros(pagina = 1) {
    cargando = true;
    try {
      const respuesta = await fetch(`${API_BASE}?page=${pagina}`);
      if (!respuesta.ok) {
        mostrarMensaje(traducirErrorApiEarthquake(respuesta.status, {}), 'error');
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

  async function cargarDatosIniciales() {
    const confirmado = confirm('¿Quieres cargar los datos iniciales? Esto puede sobreescribir registros existentes.');
    if (!confirmado) return;
    cargandoInicial = true;
    try {
      const respuesta = await fetch(`${API_BASE}/loadInitialData`, { method: 'GET' });
      if (!respuesta.ok) {
        mostrarMensaje(traducirErrorApiEarthquake(respuesta.status, {}), 'error');
        return;
      }
      mostrarMensaje('Datos iniciales cargados correctamente.', 'exito');
      await cargarRegistros(1);
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    } finally {
      cargandoInicial = false;
    }
  }

  async function crearRegistro() {
    const payload = normalizarPayload();
    try {
      const respuesta = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, { country: payload.country, fromdate: payload.fromdate }),
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
    const confirmado = confirm('¿Seguro que quieres borrar todos los terremotos? Esta acción no se puede deshacer.');
    if (!confirmado) return;
    try {
      const respuesta = await fetch(API_BASE, { method: 'DELETE' });
      if (!respuesta.ok) {
        mostrarMensaje(traducirErrorApiEarthquake(respuesta.status, {}), 'error');
        return;
      }
      registros = [];
      mostrarMensaje('Todos los terremotos se han eliminado correctamente.', 'exito');
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  /** @param {string} country @param {string} fromdate */
  async function borrarRegistro(country, fromdate) {
    const confirmado = confirm(`¿Seguro que quieres eliminar el terremoto de "${country}" ocurrido el ${fromdate}?`);
    if (!confirmado) return;
    try {
      const respuesta = await fetch(
        `${API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(fromdate)}`,
        { method: 'DELETE' }
      );
      if (!respuesta.ok) {
        mostrarMensaje(traducirErrorApiEarthquake(respuesta.status, { country, fromdate }), 'error');
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
    fromdate: '',
    todate: '',
    depth: '', 
    exposed_population: ''
  });

  async function buscarRegistros() {
    cargando = true;
    const params = new URLSearchParams();
    if (filtroBusqueda.country) params.set('country', filtroBusqueda.country);
    if (filtroBusqueda.severity !== '') params.set('severity', String(filtroBusqueda.severity));
    if (filtroBusqueda.alertlevel) params.set('alertlevel', filtroBusqueda.alertlevel);
    if (filtroBusqueda.fromdate) params.set('fromdate', filtroBusqueda.fromdate);
    if (filtroBusqueda.todate) params.set('todate', filtroBusqueda.todate);
    if (filtroBusqueda.depth !== '') params.set('depth', String(filtroBusqueda.depth));
    if (filtroBusqueda.exposed_population !== '') params.set('exposed_population', String(filtroBusqueda.exposed_population));
    params.set('page', '1');
    try {
      const respuesta = await fetch(`${API_BASE}?${params.toString()}`);
      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, {
            country: filtroBusqueda.country || undefined,
            fromdate: filtroBusqueda.fromdate || undefined
          }),
          'error'
        );
        registros = [];
        return;
      }

      registros = await respuesta.json();
      paginaActual = 1;
      if (registros.length === 0 && respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(404, {
            country: filtroBusqueda.country || undefined,
            fromdate: filtroBusqueda.fromdate || undefined
          }),
          'exito'
        );
      }
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
    filtroBusqueda.todate = '';
    filtroBusqueda.depth = '';
    filtroBusqueda.exposed_population = '';
    cargarRegistros(1);
  }

  /** @param {string|null} nivel */
  function claseAlerta(nivel) {
    switch (nivel) {
      case 'Green': return 'badge badge-green';
      case 'Yellow': return 'badge badge-yellow';
      case 'Orange': return 'badge badge-orange';
      case 'Red': return 'badge badge-red';
      default: return 'badge badge-none';
    }
  }

  /** @param {string|null} nivel*/
  function textoAlerta(nivel) {
    switch (nivel) {
      case 'Green': return 'Verde';
      case 'Yellow': return 'Amarillo';
      case 'Orange': return 'Naranja';
      case 'Red': return 'Rojo';
      default: return '—';
    }
  }
</script>

<svelte:head>
  <title>Gestión de terremotos</title>
</svelte:head>

<header class="hero">
  <div class="hero-texto">
    <h1>Gestión de terremotos</h1>

    <p class="subtitulo">
      Consulta, registra y administra eventos sísmicos de forma centralizada.
    </p>

    <a href="/" class="enlace-volver">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>

      Volver a la portada del equipo
    </a>
  </div>
</header>

{#if estadoMensaje.texto}
  <div class="mensaje {estadoMensaje.tipo}">
    {estadoMensaje.texto}
  </div>
{/if}

<!-- Registrar terremoto -->
<section class="bloque">
  <h2>Registrar nuevo terremoto</h2>

  <form
    onsubmit={(event) => { event.preventDefault(); crearRegistro(); }}
    class="formulario-fila"
  >
    <div class="formulario-campos">
      <label>
        <span class="label-text">País <span class="obligatorio">*</span></span>
        <input bind:value={formulario.country} placeholder="Ej: Spain" required />
      </label>

      <label>
        <span class="label-text">Fecha de inicio <span class="obligatorio">*</span></span>
        <input bind:value={formulario.fromdate} type="date" required />
      </label>

      <label>
        Fecha de fin
        <input bind:value={formulario.todate} type="date" />
      </label>

      <label>
        <span class="label-text">Severidad (Richter) <span class="obligatorio">*</span></span>
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
    </div>

    <div class="acciones-formulario">
      <button type="submit" class="btn-primario">Registrar terremoto</button>
      <button type="button" onclick={resetFormulario}>Limpiar formulario</button>
    </div>
  </form>
</section>

<!-- Buscar terremotos -->
<section class="bloque">
  <h2>Buscar terremotos</h2>

  <form onsubmit={(e) => { e.preventDefault(); buscarRegistros(); }} class="formulario-fila">
  <div class="formulario-campos">
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

    <!-- Campos nuevos -->
    <label>
      Fecha de fin
      <input bind:value={filtroBusqueda.todate} type="date" />
    </label>

    <label>
      Profundidad mínima (km)
      <input bind:value={filtroBusqueda.depth} type="number" step="0.1" placeholder="Ej: 10" />
    </label>

    <label>
      Población expuesta mínima
      <input bind:value={filtroBusqueda.exposed_population} type="number" placeholder="Ej: 50000" />
    </label>
  </div>

  <div class="acciones-formulario">
    <button type="submit" class="btn-primario">Buscar</button>
    <button type="button" onclick={limpiarBusqueda}>Limpiar búsqueda</button>
  </div>
</form>
</section>

<!-- Listado de terremotos -->
<section class="bloque">
  <div class="cabecera-seccion">
    <h2>Listado de terremotos</h2>
    <div class="acciones-superiores">
      <button type="button" onclick={cargarDatosIniciales} disabled={cargandoInicial}>
        {cargandoInicial ? 'Cargando...' : 'Cargar datos iniciales'}
      </button>
      <button type="button" onclick={() => cargarRegistros(paginaActual)}>Actualizar lista</button>
      <button type="button" class="btn-peligro" onclick={borrarTodos}>Borrar todos</button>
    </div>
  </div>

  {#if cargando}
    <p class="estado-vacio">Cargando datos...</p>
  {:else if registros.length === 0}
    <p class="estado-vacio">No hay terremotos registrados en esta página.</p>
  {:else}
    <div class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>País</th>
            <th>Fecha inicio</th>
            <th>Fecha fin</th>
            <th>Severidad</th>
            <th>Alerta</th>
            <th>Profundidad</th>
            <th>Población expuesta</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each registros as registro}
            <tr>
              <td>{registro.country}</td>
              <td>{registro.fromdate}</td>
              <td>{registro.todate ?? '—'}</td>
              <td>{registro.severity}</td>
              <td><span class={claseAlerta(registro.alertlevel)}>{textoAlerta(registro.alertlevel)}</span></td>
              <td>{registro.depth != null ? `${registro.depth} km` : '—'}</td>
              <td>{registro.exposed_population != null ? registro.exposed_population.toLocaleString('es-ES') : '—'}</td>
              <td class="acciones-celda">
                <a
                  href={`/earthquakes/edit/${encodeURIComponent(registro.country)}/${encodeURIComponent(registro.fromdate)}`}
                  class="boton-editar"
                >Editar</a>
                <button
                  type="button"
                  class="btn-peligro"
                  onclick={() => borrarRegistro(registro.country, registro.fromdate)}
                >Eliminar</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="paginacion">
    <button
      type="button"
      disabled={paginaActual <= 1}
      onclick={() => cargarRegistros(paginaActual - 1)}
    >← Anterior</button>
    <span>Página {paginaActual}</span>
    <button
      type="button"
      disabled={registros.length < 10}
      onclick={() => cargarRegistros(paginaActual + 1)}
    >Siguiente →</button>
  </div>
</section>

<style>
  :global(body) {
    font-family: Arial, sans-serif;
    background: #f7f6f3;
    color: #1a1a1a;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }

  .subtitulo {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.35rem;
  }

  .enlace-volver {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.85rem;
    color: #666;
    text-decoration: none;
    margin-bottom: 1.5rem;
  }

  .enlace-volver:hover {
    color: #1a1a1a;
  }

  .bloque {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
    margin: 1rem 0;
  }

  .cabecera-seccion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .cabecera-seccion h2 {
    margin-bottom: 0;
  }

  /* Formulario */
  .formulario-fila {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .formulario-campos {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
  }

  .formulario-fila label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #555;
    flex: 1 1 120px;
    min-width: 0;
  }

  .formulario-fila label > span.label-text {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .obligatorio {
    color: #c0392b;
  }

  input, select {
    padding: 0.5rem 0.65rem;
    border: 1px solid #ddd;
    border-radius: 7px;
    font: inherit;
    font-size: 0.875rem;
    color: #1a1a1a;
    background: #fff;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #aaa;
  }

  /* Botones */
  button {
    padding: 0.5rem 0.9rem;
    border: 1px solid #ddd;
    border-radius: 7px;
    background: #fff;
    font: inherit;
    font-size: 0.85rem;
    color: #1a1a1a;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s;
  }

  button:hover:not(:disabled) {
    background: #f5f5f3;
    border-color: #bbb;
  }

  button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .btn-primario {
    background: #1a1a1a;
    color: #fff;
    border-color: #1a1a1a;
  }

  .btn-primario:hover:not(:disabled) {
    background: #333;
    border-color: #333;
  }

  .btn-peligro {
    color: #c0392b;
    border-color: #f0c0bb;
  }

  .btn-peligro:hover:not(:disabled) {
    background: #fdf0ef;
  }

  .acciones-formulario {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .acciones-superiores {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  /* Tabla */
  .tabla-contenedor {
    overflow-x: auto;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  thead th {
    background: #f7f6f3;
    font-size: 0.75rem;
    font-weight: 600;
    color: #777;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.55rem 0.85rem;
    text-align: left;
    border-bottom: 1px solid #e8e8e8;
    white-space: nowrap;
  }

  tbody td {
    padding: 0.6rem 0.85rem;
    border-bottom: 1px solid #f0f0ee;
    vertical-align: middle;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: #fafaf8;
  }

  .acciones-celda {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  /* Badge de alerta */
  :global(.badge) {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  :global(.badge-green)  { background: #e8f5e2; color: #2e7d32; }
  :global(.badge-yellow) { background: #fff8e1; color: #a0760a; }
  :global(.badge-orange) { background: #fdf0e6; color: #c4511a; }
  :global(.badge-red)    { background: #fdecea; color: #b71c1c; }
  :global(.badge-none)   { background: #f0f0ee; color: #888; }

  /* Enlace editar con aspecto de botón */
  .boton-editar {
    display: inline-flex;
    align-items: center;
    padding: 0.4rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 7px;
    background: #fff;
    text-decoration: none;
    color: #1a1a1a;
    font: inherit;
    font-size: 0.85rem;
    transition: background 0.12s;
  }

  .boton-editar:hover {
    background: #f5f5f3;
    border-color: #bbb;
  }

  /* Paginación */
  .paginacion {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.85rem;
    justify-content: flex-end;
  }

  .paginacion span {
    font-size: 0.85rem;
    color: #666;
  }

  /* Mensajes */
  .mensaje {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);

    z-index: 9999;
    padding: 0.8rem 1rem;
    border-radius: 8px;
    margin: 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .mensaje.exito {
    background: #edf7f0;
    border: 1px solid #a3d4b0;
    color: #1e6b3a;
  }

  .mensaje.error {
    background: #fdecea;
    border: 1px solid #f0b8b5;
    color: #9b2020;
  }

  .estado-vacio {
    font-size: 0.875rem;
    color: #888;
    padding: 1.5rem 0;
    text-align: center;
  }

  /* HERO */
.hero {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      #1f2937 0%,
      #111827 100%
    );
  color: white;
}

.hero h1 {
  color: white;
  margin-bottom: 0.35rem;
  font-size: 2rem;
}

.hero .subtitulo {
  color: rgba(255,255,255,0.8);
  margin-bottom: 1rem;
  max-width: 680px;
}

.hero-etiqueta {
  display: inline-block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #cbd5e1;
  margin-bottom: 0.5rem;
}
.hero .enlace-volver {
  color: rgba(255,255,255,0.85);
  margin-bottom: 0;
}

.hero .enlace-volver:hover {
  color: white;
}

</style>