/** @type {import('@sveltejs/kit').Load} */
export async function load({ params, fetch }) {
  const country = params.country ?? '';
  const date = params.fromdate ?? '';
  const API_BASE = '/api/v1/earthquakes';

  try {
    const respuesta = await fetch(
      `${API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(date)}`
    );

    if (!respuesta.ok) {
      return { country, date, resource: null, error: respuesta.status };
    }

    const data = await respuesta.json();
    const resource = Array.isArray(data) ? data[0] : data;

    return { country, date, resource, error: null };
  } catch {
    return { country, date, resource: null, error: 500 };
  }
}