<script>
  import { goto } from '$app/navigation';
  import { traducirErrorApiDrought } from '$lib/apiMessagesDroughtStats.js';

  let { data } = $props();

  const API_BASE = '/api/v1/drought-stats';
  const NOMBRE_RECURSO = 'registro de sequías';

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

  $effect(() => {
    if (data.resource) {
      formulario.description = data.resource.description ?? '';
      formulario.alert_level = data.resource.alert_level ?? '';
      formulario.alert_score = data.resource.alert_score ?? '';
      formulario.episode_alert_score = data.resource.episode_alert_score ?? '';
      formulario.country = data.resource.country ?? '';
      formulario.from_date = data.resource.from_date ?? '';
      formulario.to_date = data.resource.to_date ?? '';
      formulario.severity_km2 = data.resource.severity_km2 ?? '';
      formulario.iso = data.resource.iso ?? '';
      formulario.gdacs_id = data.resource.gdacs_id ?? '';
      formulario.duration_day = data.resource.duration_day ?? '';
      formulario.impact = data.resource.impact ?? '';
      formulario.longitude = data.resource.longitude ?? '';
      formulario.latitude = data.resource.latitude ?? '';
    }
  });

  async function guardarCambios() {
    mensaje = '';
    tipoMensaje = '';

    const payload = {
      description: formulario.description.trim(),
      alert_level: formulario.alert_level.trim(),
      alert_score: Number(formulario.alert_score),
      episode_alert_score: Number(formulario.episode_alert_score),
      country: formulario.country.trim(),
      from_date: Number(formulario.from_date),
      to_date: Number(formulario.to_date),
      severity_km2: Number(formulario.severity_km2),
      iso: formulario.iso.trim(),
      gdacs_id: formulario.gdacs_id.trim(),
      duration_day: Number(formulario.duration_day),
      impact: formulario.impact.trim(),
      longitude: Number(formulario.longitude),
      latitude: Number(formulario.latitude)
    };

    try {
      const respuesta = await fetch(
        `${API_BASE}/${encodeURIComponent(data.country)}/${data.from_date}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!respuesta.ok) {
        mensaje = traducirErrorApiDrought(respuesta.status, {
          recurso: NOMBRE_RECURSO,
          country: payload.country,
          from_date: payload.from_date
        });
        tipoMensaje = 'error';
        return;
      }
/*
      mensaje = traducirExitoApi('editar', {
        recurso: NOMBRE_RECURSO,
        country: payload.country,
        year: payload.year
      });
      tipoMensaje = 'exito';
*/
      setTimeout(() => {
        goto('/drought-stats');
      }, 1800);
    } catch (error) {
      mensaje = 'No se ha podido conectar con la API.';
      tipoMensaje = 'error';
    }
  }
</script>

<svelte:head>
  <title>Editar registro</title>
</svelte:head>

<h1>Editar registro</h1>

<p>
  <a href="/drought-stats">Volver al listado</a>
</p>

{#if data.error || !data.resource}
  <div class="mensaje error">
    {traducirErrorApiDrought(data.error ?? 404, {
      recurso: NOMBRE_RECURSO,
      country: data.country,
      from_date: data.from_date
    })}
  </div>
{:else}
  {#if mensaje}
    <div class={`mensaje ${tipoMensaje}`}>
      {mensaje}
    </div>
  {/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      guardarCambios();
    }}
    class="formulario"
  >
    <label>
      Descripción
      <input bind:value={formulario.description} />
    </label>

    <label>
      Nivel de alerta
      <input bind:value={formulario.alert_level} />
    </label>

    <label>
      Puntuación de alerta
      <input bind:value={formulario.alert_score} type="number" step="any" />
    </label>

    <label>
      Episodio puntuación de alerta
      <input bind:value={formulario.episode_alert_score} type="number" step="any" />
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
      <input bind:value={formulario.iso} step="any" />
    </label>

    <label>
      GDACS_ID
      <input bind:value={formulario.gdacs_id} step="any" />
    </label>

    <label>
      Días de duración
      <input bind:value={formulario.duration_day} type="number" step="any" />
    </label>

    <label>
      Impacto
      <input bind:value={formulario.impact} step="any" />
    </label>

    <label>
      Longitud
      <input bind:value={formulario.longitude} type="number" step="any" />
    </label>

    <label>
      Latitud
      <input bind:value={formulario.latitude} type="number" step="any" />
    </label>

    <div class="acciones-formulario">
      <button type="submit">Guardar cambios</button>
      <button type="button" onclick={() => goto('/drought-stats')}>
        Cancelar
      </button>
    </div>
  </form>
{/if}

<style>
  :global(body) {
    font-family: Arial, sans-serif;
  }

  .formulario {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.9rem;
    margin-top: 1rem;
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

  .acciones-formulario {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
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