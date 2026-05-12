//@ts-nocheck

const PRODUCTIVITY_ENDPOINT = '/api/v1/workers-productivity';
const PRODUCTIVITY_LOAD_ENDPOINT = '/api/v1/workers-productivity/loadInitialData';

export function normalizeCountryName(country) {
  return String(country ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

async function fetchJson(endpoint) {
  const response = await fetch(endpoint);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se han podido cargar los datos de productividad.');
  }

  return payload;
}

export async function loadProductivityByCountry() {
  let rows = await fetchJson(PRODUCTIVITY_ENDPOINT);

  if (Array.isArray(rows) && rows.length === 0) {
    await fetchJson(PRODUCTIVITY_LOAD_ENDPOINT);
    rows = await fetchJson(PRODUCTIVITY_ENDPOINT);
  }

  if (!Array.isArray(rows)) {
    throw new Error('La estructura de workers-productivity no coincide con la esperada.');
  }

  const grouped = new Map();

  rows.forEach((row) => {
    const country = row.country;
    const key = normalizeCountryName(country);
    if (!key) return;

    const current = grouped.get(key) ?? {
      key,
      country,
      records: [],
      years: []
    };

    current.records.push(row);
    current.years.push(toNumber(row.year));
    grouped.set(key, current);
  });

  grouped.forEach((group) => {
    const records = group.records;
    const latestYear = Math.max(...group.years.filter((year) => Number.isFinite(year)));
    const latestRecord = records.find((row) => Number(row.year) === latestYear) ?? records.at(-1);

    group.latestYear = Number.isFinite(latestYear) ? latestYear : null;
    group.averageProductivity = average(records.map((row) => toNumber(row.productivity_hour)));
    group.averageAnnualHours = average(records.map((row) => toNumber(row.avg_annual_hours)));
    group.averageGdpPerCapita = average(records.map((row) => toNumber(row.gpd_per_capita)));
    group.averageHumanCapital = average(records.map((row) => toNumber(row.human_capital)));
    group.averageCapitalStockWorker = average(records.map((row) => toNumber(row.capital_stock_worker)));
    group.latestProductivity = toNumber(latestRecord?.productivity_hour);
    group.latestGdpPerCapita = toNumber(latestRecord?.gpd_per_capita);
    group.count = records.length;
  });

  return grouped;
}

export function getProductivityForCountry(productivityByCountry, country) {
  return productivityByCountry.get(normalizeCountryName(country)) ?? null;
}
