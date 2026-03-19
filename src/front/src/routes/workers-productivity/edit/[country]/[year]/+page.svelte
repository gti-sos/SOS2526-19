<script>
  import { goto } from '$app/navigation';
  import { traducirErrorApi } from '$lib/apiMessages';

  let { data } = $props();

  const API_BASE = '/api/v1/workers-productivity';
  const NOMBRE_RECURSO = 'registro de productividad laboral';

  let mensaje = $state('');
  let tipoMensaje = $state('');

  let formulario = $state(
    data.resource
      ? {
          country: data.resource.country ?? '',
          year: data.resource.year ?? '',
          productivity_hour: data.resource.productivity_hour ?? '',
          avg_annual_hours: data.resource.avg_annual_hours ?? '',
          gpd_per_capita: data.resource.gpd_per_capita ?? '',
          human_capital: data.resource.human_capital ?? '',
          capital_stock_worker: data.resource.capital_stock_worker ?? '',
          employment: data.resource.employment ?? '',
          household_consum: data.resource.household_consum ?? '',
          investment_share: data.resource.investment_share ?? ''
        }
      : {
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
        }
  );

  async function guardarCambios() {
    mensaje = '';
    tipoMensaje = '';

    const payload = {
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

    try {
      const respuesta = await fetch(
        `${API_BASE}/${encodeURIComponent(data.country)}/${data.year}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!respuesta.ok) {
        mensaje = traducirErrorApi(respuesta.status, {
          recurso: NOMBRE_RECURSO,
          country: payload.country,
          year: payload.year
        });
        tipoMensaje = 'error';
        return;
      }

      mensaje = 'Los cambios se han guardado correctamente.';
      tipoMensaje = 'exito';

      setTimeout(() => {
        goto('/workers-productivity');
      }, 800);
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
  <a href="/workers-productivity">Volver al listado</a>
</p>

{#if data.error || !data.resource}
  <div class="mensaje error">
    {traducirErrorApi(data.error ?? 404, {
      recurso: NOMBRE_RECURSO,
      country: data.country,
      year: data.year
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
      <button type="submit">Guardar cambios</button>
      <button type="button" onclick={() => goto('/workers-productivity')}>
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