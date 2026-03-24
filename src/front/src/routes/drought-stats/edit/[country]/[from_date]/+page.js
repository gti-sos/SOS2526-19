/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
  const { country, from_date } = params;
  const API_BASE = '/api/v1/drought-stats';

  try {
    const respuesta = await fetch(`${API_BASE}/${encodeURIComponent(country)}/${from_date}`);

    if (!respuesta.ok) {
      return {
        country,
        from_date,
        resource: null,
        error: respuesta.status
      };
    }

    const data = await respuesta.json();
    const resource = Array.isArray(data) ? data[0] : data;

    return {
      country,
      from_date,
      resource,
      error: null
    };
  } catch (error) {
    return {
      country,
      from_date,
      resource: null,
      error: 500
    };
  }
}