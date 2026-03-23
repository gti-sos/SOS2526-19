<script>
  import { onMount } from 'svelte';
  import { traducirErrorApi, traducirExitoApi } from '$lib/apiMessages';

  /**
   * @typedef {Object} WorkersProductivityRecord
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

  const API_BASE = '/api/v1/workers-productivity';
  const NOMBRE_RECURSO = 'registro de productividad laboral';
  const NOMBRE_RECURSO_PLURAL = 'registros de productividad laboral';

  /** @type {WorkersProductivityRecord[]} */
  let registros = $state([]);
  let cargando = $state(false);

  let mensaje = $state('');
  let tipoMensaje = $state('');

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

  async function cargarRegistros() {
    //limpiarMensaje();
    cargando = true;

    try {
      const respuesta = await fetch(API_BASE);

      if (!respuesta.ok) {
        mostrarMensaje(
          traducirErrorApi(respuesta.status, {
            recurso: NOMBRE_RECURSO
          }),
          'error'
        );
        registros = [];
        return;
      }

      registros = /** @type {WorkersProductivityRecord[]} */ (await respuesta.json());
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
        mostrarMensaje(
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
        mostrarMensaje(
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