const PROXY_BASE = "/api/v1/integrations/proxy";

const COUNTRY_CODES = [
  { iso3: "ESP", name: "Spain" },
  { iso3: "KHM", name: "Cambodia" },
  { iso3: "BRA", name: "Brazil" },
  { iso3: "ARG", name: "Argentina" },
  { iso3: "DEU", name: "Germany" },
  { iso3: "FRA", name: "France" },
  { iso3: "ITA", name: "Italy" },
  { iso3: "NLD", name: "Netherlands" },
  { iso3: "BEL", name: "Belgium" },
  { iso3: "PRT", name: "Portugal" }
];

const WEATHER_LOCATIONS = [
  { country: "Spain", city: "Madrid", latitude: 40.4168, longitude: -3.7038 },
  { country: "Cambodia", city: "Phnom Penh", latitude: 11.5564, longitude: 104.9282 },
  { country: "Brazil", city: "Brasilia", latitude: -15.7939, longitude: -47.8828 },
  { country: "Argentina", city: "Buenos Aires", latitude: -34.6037, longitude: -58.3816 },
  { country: "Germany", city: "Berlin", latitude: 52.52, longitude: 13.405 },
  { country: "France", city: "Paris", latitude: 48.8566, longitude: 2.3522 }
];

async function fetchJson(url, sourceName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`${sourceName} responded with ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function handleProxyError(res, sourceName, error) {
  const message = error?.name === "AbortError"
    ? `${sourceName} did not respond before the proxy timeout.`
    : `Could not load data from ${sourceName}.`;

  res.status(502).json({
    error: message,
    detail: error?.message ?? "Unknown integration proxy error"
  });
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function loadIntegrationsProxy(app) {
  app.get(`${PROXY_BASE}/rest-countries`, async (_req, res) => {
    const fields = "name,cca2,cca3,capital,region,population,area,latlng,flags";
    const codes = COUNTRY_CODES.map((country) => country.iso3).join(",");
    const endpoint = `https://restcountries.com/v3.1/alpha?codes=${codes}&fields=${fields}`;

    try {
      const rawCountries = await fetchJson(endpoint, "REST Countries");

      if (!Array.isArray(rawCountries)) {
        return res.status(502).json({
          error: "REST Countries returned an unexpected data structure."
        });
      }

      const countries = rawCountries
        .map((country) => {
          const population = toNumber(country.population);
          const area = toNumber(country.area);

          return {
            country: country.name?.common ?? country.cca3 ?? "Unknown",
            officialName: country.name?.official ?? country.name?.common ?? "Unknown",
            cca2: country.cca2 ?? "",
            cca3: country.cca3 ?? "",
            capital: Array.isArray(country.capital) ? country.capital[0] : null,
            region: country.region ?? "Unknown",
            population,
            area,
            density: population !== null && area ? Number((population / area).toFixed(2)) : null,
            latitude: Array.isArray(country.latlng) ? toNumber(country.latlng[0]) : null,
            longitude: Array.isArray(country.latlng) ? toNumber(country.latlng[1]) : null,
            flag: country.flags?.svg ?? country.flags?.png ?? null
          };
        })
        .sort((a, b) => (b.density ?? 0) - (a.density ?? 0));

      res.json({
        source: "REST Countries",
        endpoint,
        count: countries.length,
        countries
      });
    } catch (error) {
      handleProxyError(res, "REST Countries", error);
    }
  });

  app.get(`${PROXY_BASE}/open-meteo`, async (_req, res) => {
    const latitudes = WEATHER_LOCATIONS.map((location) => location.latitude).join(",");
    const longitudes = WEATHER_LOCATIONS.map((location) => location.longitude).join(",");
    const current = "temperature_2m,apparent_temperature,wind_speed_10m,relative_humidity_2m";
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=${current}&timezone=auto`;

    try {
      const rawWeather = await fetchJson(endpoint, "Open-Meteo");
      const weatherResponses = Array.isArray(rawWeather) ? rawWeather : [rawWeather];

      const weather = weatherResponses.map((item, index) => {
        const location = WEATHER_LOCATIONS[index] ?? {};

        return {
          country: location.country ?? "Unknown",
          city: location.city ?? "Unknown",
          latitude: toNumber(item.latitude),
          longitude: toNumber(item.longitude),
          timezone: item.timezone ?? "",
          time: item.current?.time ?? "",
          temperature: toNumber(item.current?.temperature_2m),
          apparentTemperature: toNumber(item.current?.apparent_temperature),
          windSpeed: toNumber(item.current?.wind_speed_10m),
          humidity: toNumber(item.current?.relative_humidity_2m)
        };
      });

      res.json({
        source: "Open-Meteo",
        endpoint,
        count: weather.length,
        weather
      });
    } catch (error) {
      handleProxyError(res, "Open-Meteo", error);
    }
  });

  app.get(`${PROXY_BASE}/world-bank`, async (_req, res) => {
    const countries = COUNTRY_CODES.map((country) => country.iso3).join(";");
    const indicator = "NY.GDP.PCAP.CD";
    const endpoint = `https://api.worldbank.org/v2/country/${countries}/indicator/${indicator}?format=json&per_page=200&date=2022:2024`;

    try {
      const rawResponse = await fetchJson(endpoint, "World Bank");
      const metadata = Array.isArray(rawResponse) ? rawResponse[0] : null;
      const records = Array.isArray(rawResponse) ? rawResponse[1] : null;

      if (!Array.isArray(records)) {
        return res.status(502).json({
          error: "World Bank returned an unexpected data structure."
        });
      }

      const latestByCountry = new Map();

      records
        .filter((record) => record.value !== null && record.countryiso3code)
        .sort((a, b) => Number(b.date) - Number(a.date))
        .forEach((record) => {
          if (!latestByCountry.has(record.countryiso3code)) {
            latestByCountry.set(record.countryiso3code, {
              country: record.country?.value ?? record.countryiso3code,
              iso3: record.countryiso3code,
              year: Number(record.date),
              gdpPerCapitaUsd: Number(record.value.toFixed(2))
            });
          }
        });

      const data = COUNTRY_CODES
        .map((country) => latestByCountry.get(country.iso3))
        .filter(Boolean)
        .sort((a, b) => b.gdpPerCapitaUsd - a.gdpPerCapitaUsd);

      res.json({
        source: "World Bank",
        indicator,
        indicatorName: "GDP per capita (current US$)",
        endpoint,
        lastUpdated: metadata?.lastupdated ?? null,
        count: data.length,
        data
      });
    } catch (error) {
      handleProxyError(res, "World Bank", error);
    }
  });
}
