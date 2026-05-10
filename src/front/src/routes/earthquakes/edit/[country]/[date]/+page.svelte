<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { traducirErrorApiEarthquake } from '$lib/apiMessagesEarthquakes';

  const API_BASE = '/api/v1/earthquakes';

  const country = $derived($page.params.country ?? '');
  const date = $derived($page.params.date ?? '');

  let cargando = $state(true);
  let guardando = $state(false);
  let estadoMensaje = $state({ texto: '', tipo: '' });

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

  /**
   * @param {string} texto
   * @param {'exito' | 'error'} [tipo='exito']
   */
  function mostrarMensaje(texto, tipo = 'exito') {
    estadoMensaje = { texto, tipo };

    clearTimeout(timeoutMensaje);

    timeoutMensaje = setTimeout(() => {
      estadoMensaje = { texto: '', tipo: '' };
    }, 3000);
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

      const nuevoCountry = formulario.country;
      const nuevaDate = formulario.fromdate;

      if (nuevoCountry !== country || nuevaDate !== date) {
        setTimeout(() => {
          goto('/earthquakes');
        }, 3000);
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

<h1>Editar terremoto</h1>
<p class="subtitulo">Estás editando el terremoto de <strong>{country}</strong> con fecha de inicio <strong>{date}</strong>.</p>

<p>
  <a href="/earthquakes" class="enlace-volver">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
    Volver al listado de terremotos
  </a>
</p>

{#if estadoMensaje.texto}
  <div class="mensaje {estadoMensaje.tipo}">
    {estadoMensaje.texto}
  </div>
{/if}

{#if cargando}
  <p class="estado-vacio">Cargando datos del terremoto...</p>
{:else}
  <section class="bloque">
    <h2>Datos del terremoto</h2>

    <form
      onsubmit={(e) => { e.preventDefault(); guardarCambios(); }}
      class="formulario-fila"
    >
      <div class="formulario-campos">
        <label>
          <span class="label-text">País <span class="obligatorio">*</span></span>
          <input bind:value={formulario.country} required />
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
      </div>

      <div class="acciones-formulario">
        <button type="submit" class="btn-primario" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <a href="/earthquakes" class="boton-cancelar">Cancelar</a>
      </div>
    </form>
  </section>
{/if}

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
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #555;
  }

  .subtitulo {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.35rem;
  }

  .subtitulo strong {
    color: #1a1a1a;
    font-weight: 600;
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

  .formulario-campos label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #555;
    flex: 1 1 180px;
    min-width: 0;
  }

  .label-text {
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
  button, .boton-cancelar {
    padding: 0.5rem 0.9rem;
    border: 1px solid #ddd;
    border-radius: 7px;
    background: #fff;
    font: inherit;
    font-size: 0.85rem;
    color: #1a1a1a;
    cursor: pointer;
    white-space: nowrap;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: background 0.12s, border-color 0.12s;
  }

  button:hover:not(:disabled), .boton-cancelar:hover {
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

  .acciones-formulario {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  /* Mensajes */
  .mensaje {
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
  }
</style>