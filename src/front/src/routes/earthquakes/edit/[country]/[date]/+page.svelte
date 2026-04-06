<script>
  import { goto } from '$app/navigation';
  import { traducirErrorApiEarthquake } from '$lib/apiMessagesEarthquakes.js';

  let { data } = $props();

  const API_BASE = '/api/v1/earthquakes';

  let mensaje = $state('');
  let tipoMensaje = $state('');
  let guardando = $state(false);

  let formulario = $state({
    country: '',
    fromdate: '',
    todate: '',
    severity: '',
    alertlevel: '',
    depth: '',
    exposed_population: ''
  });

  $effect(() => {
    if (data.resource) {
      formulario.country = data.resource.country ?? '';
      formulario.fromdate = data.resource.fromdate ?? '';
      formulario.todate = data.resource.todate ?? '';
      formulario.severity = data.resource.severity ?? '';
      formulario.alertlevel = data.resource.alertlevel ?? '';
      formulario.depth = data.resource.depth ?? '';
      formulario.exposed_population = data.resource.exposed_population ?? '';
    }
  });

  async function guardarCambios() {
    mensaje = '';
    tipoMensaje = '';
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
        `${API_BASE}/${encodeURIComponent(data.country)}/${encodeURIComponent(data.fromdate)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!respuesta.ok) {
        mensaje = traducirErrorApiEarthquake(respuesta.status, {
          country: payload.country,
          fromdate: payload.fromdate
        });
        tipoMensaje = 'error';
        guardando = false;
        return;
      }

      mensaje = 'Los cambios se han guardado correctamente.';
      tipoMensaje = 'exito';

      setTimeout(() => {
        goto('/earthquakes');
      }, 1500);
    } catch {
      mensaje = 'No se ha podido conectar con la API.';
      tipoMensaje = 'error';
    } finally {
      guardando = false;
    }
  }
</script>

<svelte:head>
  <title>Editar terremoto — {data.country}</title>
</svelte:head>

<p>
  <a href="/earthquakes">← Volver al listado de terremotos</a>
</p>

<h1>Editar terremoto</h1>
<p>Estás editando el terremoto de <strong>{data.country}</strong> con fecha <strong>{data.date}</strong>.</p>

{#if data.error || !data.resource}
  <div class="mensaje error">
    {traducirErrorApiEarthquake(data.error ?? 404, {
      country: data.country,
      fromdate: data.date
    })}
  </div>
{:else}
  {#if mensaje}
    <div class={`mensaje ${tipoMensaje}`}>
      {mensaje}
    </div>
  {/if}

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
      <button type="button" onclick={() => goto('/earthquakes')}>Cancelar</button>
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

  .acciones-formulario {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.6rem;
    margin-top: 0.5rem;
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