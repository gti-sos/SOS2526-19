/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
  const { country, year } = params;
  const API_BASE = '/api/v1/workers-productivity';

  try {
    const respuesta = await fetch(`${API_BASE}/${encodeURIComponent(country)}/${year}`);

    if (!respuesta.ok) {
      return {
        country,
        year,
        resource: null,
        error: respuesta.status
      };
    }

    const data = await respuesta.json();
    const resource = Array.isArray(data) ? data[0] : data;

    return {
      country,
      year,
      resource,
      error: null
    };
  } catch (error) {
    return {
      country,
      year,
      resource: null,
      error: 500
    };
  }
}