<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { traducirErrorApiEarthquake } from '$lib/apiMessagesEarthquakes';

  const API_BASE = '/api/v1/earthquakes';

  const country = $derived($page.params.country);
  const date = $derived($page.params.date);

  let cargando = $state(true);
  let guardando = $state(false);
  let mensaje = $state('');
  let tipoMensaje = $state('');

  let formulario = $state({
    country: '',
    fromdate: '',
    todate: '',
    severity: '',
    alertlevel: '',
    depth: '',
    exposed_population: ''
  });

  function mostrarMensaje(texto, tipo = 'exito') {
    mensaje = texto;
    tipoMensaje = tipo;
  }

  function limpiarMensaje() {
    mensaje = '';
    tipoMensaje = '';
  }

  onMount(async () => {
    try {
      const respuesta = await fetch(
        `${API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(date)}`
      );

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, { country, fromdate: date }),
          'error'
        );
        cargando = false;
        return;
      }

      const datos = await respuesta.json();
      formulario.country = datos.country ?? '';
      formulario.fromdate = datos.fromdate ?? '';
      formulario.todate = datos.todate ?? '';
      formulario.severity = datos.severity ?? '';
      formulario.alertlevel = datos.alertlevel ?? '';
      formulario.depth = datos.depth ?? '';
      formulario.exposed_population = datos.exposed_population ?? '';
    } catch {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    } finally {
      cargando = false;
    }
  });

  async function guardarCambios() {
    limpiarMensaje();
    guardando = true;

    /** @type {any} */
    const payload = {
      country: formulario.country,
      fromdate: formulario.fromdate,
      severity: Number(formulario.severity)
    };
    if (formulario.todate) payload.todate = formulario.todate;
    if (formulario.alertlevel) payload.alertlevel = formulario.alertlevel;
    if (formulario.depth !== '' && formulario.depth !== null)
      payload.depth = Number(formulario.depth);
    if (formulario.exposed_population !== '' && formulario.exposed_population !== null)
      payload.exposed_population = Number(formulario.exposed_population);

    try {
      const respuesta = await fetch(
        `${API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(date)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApiEarthquake(respuesta.status, {
            country: formulario.country,
            fromdate: formulario.fromdate
          }),
          'error'
        );
        return;
      }

      mostrarMensaje('Los cambios se han guardado correctamente.', 'exito');

      // Si cambiaron los identificadores, redirigir a la nueva ruta tras 1.5s
      const nuevoCountry = formulario.country;
      const nuevaDate = formulario.fromdate;
      if (nuevoCountry !== country || nuevaDate !== date) {
        setTimeout(() => {
          goto(`/earthquakes/${encodeURIComponent(nuevoCountry)}/${encodeURIComponent(nuevaDate)}`);
        }, 1500);
      }
    } catch {
      mostrarMensaje('No se ha podido conectar con la API.', 'error');
    } finally {
      guardando = false;
    }
  }
</script>

<svelte:head>
  <title>Editar terremoto — {country} / {date}</title>
</svelte:head>

<p>
  <a href="/earthquakes">← Volver al listado de terremotos</a>
</p>

<h1>Editar terremoto</h1>
<p>Estás editando el terremoto de <strong>{country}</strong> con fecha de inicio <strong>{date}</strong>.</p>

{#if mensaje}
  <div class={`mensaje ${tipoMensaje}`}>
    {mensaje}
  </div>
{/if}

{#if cargando}
  <p>Cargando datos del terremoto...</p>
{:else}
  <form
    onsubmit={(e) => { e.preventDefault(); guardarCambios(); }}
    class="formulario"
  >
    <label>
      País <span class="obligatorio">*</span>
      <input bind:value={formulario.country} required />
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
      <input bind:value={formulario.severity} type="number" step="0.1" required />
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
      <input bind:value={formulario.depth} type="number" step="0.1" />
    </label>

    <label>
      Población expuesta
      <input bind:value={formulario.exposed_population} type="number" />
    </label>

    <div class="acciones-formulario">
      <button type="submit" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
      <a href="/earthquakes" class="boton-secundario">Cancelar</a>
    </div>
  </form>
{/if}

<style>
  h1 { margin-bottom: 0.4rem; }

  .formulario {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.9rem;
    margin-top: 1.2rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-weight: 600;
  }

  .obligatorio { color: #c0392b; margin-left: 2px; }

  input, select {
    padding: 0.55rem;
    border: 1px solid #bbb;
    border-radius: 6px;
    font: inherit;
  }

  button {
    padding: 0.6rem 1rem;
    border: 1px solid #999;
    border-radius: 6px;
    background: #f5f5f5;
    cursor: pointer;
  }

  button:hover:not(:disabled) { background: #ececec; }
  button:disabled { opacity: 0.4; cursor: default; }

  .boton-secundario {
    padding: 0.6rem 1rem;
    border: 1px solid #bbb;
    border-radius: 6px;
    background: #fff;
    text-decoration: none;
    color: inherit;
  }

  .acciones-formulario {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.6rem;
    margin-top: 0.5rem;
    align-items: center;
  }

  .mensaje {
    padding: 0.9rem;
    border-radius: 8px;
    margin: 1rem 0;
    font-weight: 600;
  }

  .mensaje.exito { background: #e9f8ee; border: 1px solid #7abf8a; }
  .mensaje.error { background: #fdecec; border: 1px solid #d98d8d; }
</style>