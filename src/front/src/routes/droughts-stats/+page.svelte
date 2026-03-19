<script>
  import { onMount } from 'svelte';

  
  const API_BASE = '/api/v1/drought-stats';

  let registros = $state([]);
  let cargando = $state(false);

  let mensaje = $state('');
  let tipoMensaje = $state('');

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

  function mostrarMensaje(texto, tipo = 'exito') {
    mensaje = texto;
    tipoMensaje = tipo;
  }

  function limpiarMensaje() {
    mensaje = '';
    tipoMensaje = '';
  }

  function traducirError(status, contexto = {}) {
    if (status === 400) {
      return 'Los datos introducidos no son válidos. Revisa el formulario.';
    }

    if (status === 404) {
      if (contexto.country && contexto.from_date) {
        return `No existe ningún registro para ${contexto.country} en el año ${contexto.from_date}.`;
      }
      return 'No se ha encontrado la información solicitada.';
    }

    if (status === 405) {
      return 'La operación solicitada no está permitida.';
    }

    if (status === 409) {
      return `Ya existe un registro para ${contexto.country || 'ese país'} en el año ${contexto.year || 'indicado'}.`;
    }

    return 'Se ha producido un error inesperado. Inténtalo de nuevo más tarde.';
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

  async function cargarRegistros() {
    limpiarMensaje();
    cargando = true;

    try {
      const respuesta = await fetch(API_BASE);

      if (!respuesta.ok) {
        mostrarMensaje(traducirError(respuesta.status), 'error');
        registros = [];
        return;
      }

      registros = await respuesta.json();
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirError(respuesta.status, {
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
        mostrarMensaje(traducirError(respuesta.status), 'error');
        return;
      }

      registros = [];
      mostrarMensaje('Todos los datos se han eliminado correctamente.', 'exito');
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  async function borrarRegistro(country, from_date) {
    limpiarMensaje();

    const confirmado = confirm(`¿Seguro que quieres eliminar el registro de ${country} en ${from_date}?`);
    if (!confirmado) return;

    try {
      const respuesta = await fetch(`${API_BASE}/${encodeURIComponent(country)}/${from_date}`, {
        method: 'DELETE'
      });

      if (!respuesta.ok) {
        mostrarMensaje(traducirError(respuesta.status, { country, from_date }), 'error');
        return;
      }

      mostrarMensaje(`El registro de ${country} en ${from_date} se ha eliminado correctamente.`, 'exito');
      await cargarRegistros();
    } catch (error) {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    }
  }

  onMount(cargarRegistros);
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
      Descripción
      <input bind:value={formulario.description} required />
    </label>

    <label>
      Nivel de alerta
      <input bind:value={formulario.alert_level} required />
    </label>

    <label>
      Puntuación de alerta
      <input bind:value={formulario.alert_score} type="number" step="any" required />
    </label>

    <label>
      Episodio puntuación de alerta
      <input bind:value={formulario.episode_alert_score} type="number" step="any" required />
    </label>

    <label>
      País
      <input bind:value={formulario.country} step="any" required />
    </label>

    <label>
      Año de origen
      <input bind:value={formulario.from_date} type="number" step="any" required />
    </label>

    <label>
      Año de finalización
      <input bind:value={formulario.to_date} type="number" step="any" required />
    </label>

    <label>
      Severidad en kilómetros cuadrados
      <input bind:value={formulario.severity_km2} type="number" step="any" required />
    </label>

    <label>
      ISO
      <input bind:value={formulario.iso} step="any" required />
    </label>

    <label>
      GDACS_ID
      <input bind:value={formulario.gdacs_id} step="any" required />
    </label>

    <label>
      Días de duración
      <input bind:value={formulario.duration_day} type="number" step="any" required />
    </label>

    <label>
      Impacto
      <input bind:value={formulario.impact} step="any" required />
    </label>

    <label>
      Longitud
      <input bind:value={formulario.longitude} type="number" step="any" required />
    </label>

    <label>
      Latitud
      <input bind:value={formulario.latitude} type="number" step="any" required />
    </label>

    <div class="acciones-formulario">
      <button type="submit">Crear registro</button>
      <button type="button" onclick={resetFormulario}>Limpiar formulario</button>
    </div>
  </form>
</section>

<section class="bloque">
  <h2>Listado de registros</h2>

  <div class="acciones-superiores">
    <button type="button" onclick={cargarRegistros}>Actualizar lista</button>
    <button type="button" onclick={borrarTodos}>Borrar todos los datos</button>
  </div>

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
                <a href={`/workers-productivity/edit/${encodeURIComponent(registro.country)}/${registro.from_date}`}>
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