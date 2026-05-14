<script>
    // @ts-nocheck
    import { onMount, tick } from 'svelte';

    // ─── Estado global ────────────────────────────────────────────────────────────
    let cargando = $state({ fema: true, countries: true, travelRisk: true, cityStats: true, tourists: true });
    let datos    = $state({ fema: null, countries: null, travelRisk: null, cityStats: null, tourists: null });
    let errores  = $state({ fema: '', countries: '', travelRisk: '', cityStats: '', tourists: '' });

    // Referencias DOM para los gráficos
    let chartFema;
    let chartCountries;
    let chartTravelRisk;
    let chartCityStats;
    let chartTourists;

    // ─── Utilidad: normaliza un nombre de país ───────────────────────────────────
    function normalizarPais(str) {
        return (str ?? '').toLowerCase().trim();
    }

    // ─── Carga todos los registros paginados de la API propia ───────────────
    async function cargarEarthquakesPropios() {
        const todos = [];
        let pagina = 1;
        while (true) {
            const res = await fetch(`/api/v1/earthquakes?page=${pagina}`);
            if (!res.ok) break;
            const lote = await res.json();
            todos.push(...lote);
            if (lote.length < 10) break;
            pagina++;
        }
        return todos;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. OpenFEMA — Disaster Declarations Summaries
    //    URL:    https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries
    //    Proxy:  /api/fema-proxy
    //    Auth:   Sin API key (API pública del gobierno de EE.UU.)
    //    Estilo: RESTful JSON
    //    Cruce:  Declaraciones FEMA tipo "Earthquake" agrupadas por año fiscal
    //            vs. terremotos registrados en la API propia ese mismo año.
    //    Widget: ECharts BAR (barras agrupadas)
    // ═══════════════════════════════════════════════════════════════════════════
    async function cargarFEMA() {
        try {
            const [res, earthquakes] = await Promise.all([
                fetch('/api/fema-proxy'),
                cargarEarthquakesPropios()
            ]);
            if (!res.ok) throw new Error(`OpenFEMA respondió ${res.status}`);
            const json = await res.json();
            const registros = json.DisasterDeclarationsSummaries ?? [];

            // Declaraciones de terremoto por año (FEMA)
            const femaPorAnio = new Map();
            for (const r of registros) {
                if ((r.incidentType ?? '').toLowerCase() !== 'earthquake') continue;
                const anio = r.fyDeclared ?? new Date(r.declarationDate ?? '').getFullYear();
                if (!anio) continue;
                femaPorAnio.set(anio, (femaPorAnio.get(anio) ?? 0) + 1);
            }

            // Terremotos por año (API propia)
            const propiosPorAnio = new Map();
            for (const eq of earthquakes) {
                const anio = new Date(eq.fromdate).getFullYear();
                if (!anio) continue;
                propiosPorAnio.set(anio, (propiosPorAnio.get(anio) ?? 0) + 1);
            }

            const todosAnios = [...new Set([...femaPorAnio.keys(), ...propiosPorAnio.keys()])]
                .filter(a => a >= 2010)
                .sort((a, b) => a - b);

            const serieFEMA   = todosAnios.map(a => femaPorAnio.get(a)    ?? 0);
            const seriePropia = todosAnios.map(a => propiosPorAnio.get(a) ?? 0);

            datos.fema = { total: registros.length, todosAnios, serieFEMA, seriePropia };

            await tick();
            await renderFEMA(todosAnios, serieFEMA, seriePropia, registros.length);
        } catch (e) {
            errores.fema = e.message;
        } finally {
            cargando.fema = false;
        }
    }

    async function renderFEMA(anios, serieFEMA, seriePropia, total) {
        if (!chartFema) return;
        const echarts = await import('echarts');
        const chart = echarts.init(chartFema, null, { width: chartFema.clientWidth, height: 420 });

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: 'Declaraciones FEMA (Earthquake) vs. terremotos registrados',
                subtext: `Agrupados por año fiscal · ${total} declaraciones totales FEMA`,
                left: 'center',
                top: 8,
                subtextStyle: { fontSize: 12 }
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params) =>
                    `Año ${params[0].axisValue}<br/>` +
                    params.map(p => `${p.marker} ${p.seriesName}: <b>${p.value}</b>`).join('<br/>')
            },
            legend: {
                top: 60,
                data: ['Declaraciones FEMA (Earthquake)', 'Terremotos registrados']
            },
            grid: { top: 100, bottom: 60, left: 60, right: 20 },
            xAxis: {
                type: 'category',
                data: anios.map(String),
                axisLabel: { rotate: 30 }
            },
            yAxis: { type: 'value', name: 'Cantidad' },
            series: [
                {
                    name: 'Declaraciones FEMA (Earthquake)',
                    type: 'bar',
                    data: serieFEMA,
                    itemStyle: { color: '#e06c75' }
                },
                {
                    name: 'Terremotos registrados',
                    type: 'bar',
                    data: seriePropia,
                    itemStyle: { color: '#61afef' }
                }
            ]
        });

        window.addEventListener('resize', () => chart.resize());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. REST Countries API
    //    URL:    https://restcountries.com/v3.1/name/{pais}
    //    Auth:   Sin API key · API pública
    //    Estilo: RESTful JSON
    //    Cruce:  Países únicos de la API propia consultados en REST Countries
    //            para obtener región y población. Radar con dos polígonos:
    //            nº de países con terremotos por región vs. población relativa.
    //    Widget: ECharts RADAR (dos series superpuestas)
    // ═══════════════════════════════════════════════════════════════════════════
    async function cargarCountries() {
        try {
            const propios = await cargarEarthquakesPropios();
            const paisesDB = [...new Set(propios.map(r => r.country?.trim()).filter(Boolean))];
            if (!paisesDB.length) throw new Error('No hay países disponibles. Carga los datos iniciales primero.');

            const promises = paisesDB.slice(0, 15).map(pais =>
                fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(pais)}?fields=name,region,population`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
            );
            const resultados = await Promise.all(promises);

            const porRegion = new Map();
            for (const res of resultados) {
                if (!res?.[0]) continue;
                const region = res[0].region || 'Unknown';
                const pop    = res[0].population ?? 0;
                const actual = porRegion.get(region) ?? { count: 0, poblacion: 0 };
                actual.count++;
                actual.poblacion += pop;
                porRegion.set(region, actual);
            }

            const regiones = Array.from(porRegion.entries()).map(([region, d]) => ({
                region,
                count: d.count,
                poblacion: d.poblacion
            }));

            datos.countries = { regiones, totalPaises: paisesDB.length };
            await tick();
            await renderCountries(regiones, paisesDB.length);
        } catch (e) {
            errores.countries = e.message;
        } finally {
            cargando.countries = false;
        }
    }

    async function renderCountries(regiones, totalPaises) {
        if (!chartCountries || !regiones?.length) return;
        const echarts = await import('echarts');
        const chart = echarts.init(chartCountries, null, { width: chartCountries.clientWidth, height: 420 });

        const maxCount = Math.max(...regiones.map(r => r.count)) + 1;
        const maxPob   = Math.max(...regiones.map(r => r.poblacion));
        const pobNorm  = regiones.map(r => +(r.poblacion / maxPob * maxCount).toFixed(2));

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: 'Distribución regional de terremotos (REST Countries)',
                subtext: `${totalPaises} países únicos · región y población obtenidos de REST Countries`,
                left: 'center',
                top: 8,
                subtextStyle: { fontSize: 12 }
            },
            legend: {
                top: 60,
                data: ['Países con terremotos', 'Población relativa (REST Countries)']
            },
            tooltip: { trigger: 'item' },
            radar: {
                indicator: regiones.map(r => ({ name: r.region, max: maxCount })),
                radius: '55%',
                center: ['50%', '58%']
            },
            series: [
                {
                    name: 'Países con terremotos',
                    type: 'radar',
                    data: [{ value: regiones.map(r => r.count), name: 'Países con terremotos' }],
                    areaStyle: { opacity: 0.3, color: '#e06c75' },
                    lineStyle: { color: '#e06c75' },
                    itemStyle: { color: '#e06c75' }
                },
                {
                    name: 'Población relativa (REST Countries)',
                    type: 'radar',
                    data: [{ value: pobNorm, name: 'Población relativa (REST Countries)' }],
                    areaStyle: { opacity: 0.2, color: '#61afef' },
                    lineStyle: { color: '#61afef', type: 'dashed' },
                    itemStyle: { color: '#61afef' }
                }
            ]
        });
        window.addEventListener('resize', () => chart.resize());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. TravelRiskAPI
    //    URL:    https://travelriskapi.com/api/v1/countries
    //    Auth:   Header X-API-Key: demo-key-travel-risk-2026
    //    Estilo: RESTful JSON
    //    Cruce:  Scatter XY: eje X = severidad sísmica media (API propia),
    //            eje Y = risk_score (TravelRiskAPI). Tamaño de burbuja = nº
    //            de terremotos del país. Permite ver correlación entre
    //            actividad sísmica y riesgo para viajeros.
    //    Widget: ECharts SCATTER XY
    // ═══════════════════════════════════════════════════════════════════════════
    async function cargarTravelRisk() {
        try {
            const [res, propios] = await Promise.all([
                fetch('https://travelriskapi.com/api/v1/countries?limit=100', {
                    headers: { 'X-API-Key': 'demo-key-travel-risk-2026' }
                }),
                cargarEarthquakesPropios()
            ]);
            if (!res.ok) throw new Error(`TravelRiskAPI respondió ${res.status}`);
            const json = await res.json();
            const countries = json.data ?? [];

            const sevPorPais = new Map();
            for (const eq of propios) {
                const pais = normalizarPais(eq.country);
                const sev  = Number(eq.severity);
                if (!pais || !Number.isFinite(sev)) continue;
                const actual = sevPorPais.get(pais) ?? { suma: 0, count: 0 };
                actual.suma  += sev;
                actual.count += 1;
                sevPorPais.set(pais, actual);
            }

            const puntos = [];
            for (const c of countries) {
                const pnorm   = normalizarPais(c.name);
                const sevData = sevPorPais.get(pnorm);
                if (!sevData) continue;
                const sevMedia  = +(sevData.suma / sevData.count).toFixed(2);
                const riskScore = Number(c.risk_score);
                const advisory  = Number(c.advisory_level);
                if (!Number.isFinite(riskScore)) continue;
                puntos.push({ nombre: c.name, sevMedia, riskScore, advisory, numTerremotos: sevData.count });
            }

            datos.travelRisk = { countries, puntos, total: countries.length };
            await tick();
            await renderTravelRisk(puntos, countries.length);
        } catch (e) {
            errores.travelRisk = e.message;
        } finally {
            cargando.travelRisk = false;
        }
    }

    async function renderTravelRisk(puntos, total) {
        if (!chartTravelRisk) return;
        const echarts = await import('echarts');
        const chart = echarts.init(chartTravelRisk, null, { width: chartTravelRisk.clientWidth, height: 420 });

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: 'Severidad sísmica vs. Riesgo para viajeros',
                subtext: `${puntos.length} países cruzados de ${total} disponibles en TravelRiskAPI`,
                left: 'center',
                top: 8,
                subtextStyle: { fontSize: 12 }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    const d = params.data;
                    return `<b>${d[2]}</b><br/>
                        Severidad media: <b>${d[0]}</b><br/>
                        Risk score: <b>${d[1]}</b><br/>
                        Terremotos: <b>${d[3]}</b><br/>
                        Advisory level: <b>${d[4]}</b>`;
                }
            },
            grid: { top: 80, bottom: 60, left: 70, right: 20 },
            xAxis: {
                type: 'value',
                name: 'Severidad media',
                nameLocation: 'middle',
                nameGap: 30
            },
            yAxis: {
                type: 'value',
                name: 'Risk Score (TravelRiskAPI)',
                nameLocation: 'middle',
                nameGap: 50
            },
            series: [{
                type: 'scatter',
                data: puntos.map(p => [p.sevMedia, p.riskScore, p.nombre, p.numTerremotos, p.advisory]),
                symbolSize: (val) => Math.max(val[3] * 6, 10),
                itemStyle: { color: '#98c379', opacity: 0.85 },
                label: {
                    show: puntos.length <= 10,
                    formatter: (p) => p.data[2],
                    position: 'top',
                    fontSize: 10
                }
            }]
        });
        window.addEventListener('resize', () => chart.resize());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. SOS2526-29 — City Stats
    //    URL:      https://sos2526-29.onrender.com/api/v2/citys-stats
    //    LoadData: GET /api/v2/citys-stats/loadInitialData
    //    Auth:     Sin API key · API SOS grupo 29
    //    Estilo:   RESTful JSON
    //    Cruce:    Bubble chart: eje X = severidad sísmica media del país
    //              (API propia), eje Y = población de la ciudad en 2025 (SOS-29),
    //              tamaño de burbuja = nº de terremotos del país.
    //    Widget:   ECharts SCATTER con symbolSize variable (bubble chart)
    // ═══════════════════════════════════════════════════════════════════════════
    async function cargarCityStats() {
        try {
            await fetch('https://sos2526-29.onrender.com/api/v2/citys-stats/loadInitialData')
                .catch(() => null);

            const [res, propios] = await Promise.all([
                fetch('https://sos2526-29.onrender.com/api/v2/citys-stats'),
                cargarEarthquakesPropios()
            ]);
            if (!res.ok) throw new Error(`city-stats respondió ${res.status}`);
            const lista = await res.json();
            const ciudades = Array.isArray(lista) ? lista : (lista.data ?? []);

            const datosPorPais = new Map();
            for (const eq of propios) {
                const pais = normalizarPais(eq.country);
                const sev  = Number(eq.severity);
                if (!pais || !Number.isFinite(sev)) continue;
                const actual = datosPorPais.get(pais) ?? { suma: 0, count: 0 };
                actual.suma  += sev;
                actual.count += 1;
                datosPorPais.set(pais, actual);
            }

            const combinados = ciudades
                .map(c => {
                    const paisNorm = normalizarPais(c.country);
                    const d = datosPorPais.get(paisNorm);
                    if (!d) return null;
                    return {
                        city: c.city,
                        country: c.country,
                        poblacion: Number(c.un_2025_population) || 0,
                        sevMedia: +(d.suma / d.count).toFixed(2),
                        numTerremotos: d.count
                    };
                })
                .filter(Boolean)
                .filter(c => c.poblacion > 0)
                .sort((a, b) => b.poblacion - a.poblacion)
                .slice(0, 40);

            const todosCombinados = ciudades.map(c => {
                const paisNorm = normalizarPais(c.country);
                const d = datosPorPais.get(paisNorm);
                return {
                    city: c.city,
                    country: c.country,
                    poblacion: Number(c.un_2025_population) || 0,
                    sevMedia: d ? +(d.suma / d.count).toFixed(2) : null,
                    en_db_propia: !!d
                };
            });

            datos.cityStats = todosCombinados;
            await tick();
            await renderCityStats(combinados);
        } catch (e) {
            errores.cityStats = e.message;
        } finally {
            cargando.cityStats = false;
        }
    }

    async function renderCityStats(combinados) {
        if (!chartCityStats || !combinados?.length) return;
        const echarts = await import('echarts');
        const chart = echarts.init(chartCityStats, null, { width: chartCityStats.clientWidth, height: 420 });

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: 'Población urbana (SOS-29) vs. Severidad sísmica',
                subtext: `${combinados.length} ciudades en países con terremotos · tamaño de burbuja = nº de terremotos`,
                left: 'center',
                top: 8,
                subtextStyle: { fontSize: 12 }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    const d = params.data;
                    return `<b>${d[3]}</b> (${d[4]})<br/>
                        Severidad media: <b>${d[0]}</b><br/>
                        Población 2025: <b>${Number(d[1]).toLocaleString('es-ES')}</b><br/>
                        Terremotos: <b>${d[2]}</b>`;
                }
            },
            grid: { top: 90, bottom: 60, left: 80, right: 20 },
            xAxis: {
                type: 'value',
                name: 'Severidad media sísmica',
                nameLocation: 'middle',
                nameGap: 30
            },
            yAxis: {
                type: 'value',
                name: 'Población 2025 (SOS-29)',
                nameLocation: 'middle',
                nameGap: 65,
                axisLabel: {
                    formatter: v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v
                }
            },
            series: [{
                type: 'scatter',
                data: combinados.map(c => [c.sevMedia, c.poblacion, c.numTerremotos, c.city, c.country]),
                symbolSize: (val) => Math.max(val[2] * 8, 10),
                itemStyle: { color: '#e5c07b', opacity: 0.8 },
                label: {
                    show: combinados.length <= 15,
                    formatter: p => p.data[3],
                    position: 'top',
                    fontSize: 9
                }
            }]
        });
        window.addEventListener('resize', () => chart.resize());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. SOS2526-25 — International Tourist Arrivals
    //    URL:      https://sos2526-25.onrender.com/api/v2/international-tourist-arrivals
    //    LoadData: GET /api/v2/international-tourist-arrivals/loadInitialData
    //    Auth:     Sin API key · API SOS grupo 25
    //    Estilo:   RESTful JSON
    //    Cruce:    Heatmap: eje X = año, eje Y = [Turismo | Terremotos].
    //              Turismo = suma de llegadas (aéreas + marítimas + terrestres)
    //              de SOS-25. Terremotos = conteo anual de la API propia.
    //              El color indica la intensidad relativa de cada fila.
    //    Widget:   ECharts HEATMAP
    // ═══════════════════════════════════════════════════════════════════════════
    async function cargarTourists() {
        try {
            await fetch('https://sos2526-25.onrender.com/api/v2/international-tourist-arrivals/loadInitialData')
                .catch(() => null);

            const [res, propios] = await Promise.all([
                fetch('https://sos2526-25.onrender.com/api/v2/international-tourist-arrivals'),
                cargarEarthquakesPropios()
            ]);
            if (!res.ok) throw new Error(`tourist-arrivals respondió ${res.status}`);
            const lista = await res.json();
            const turistas = Array.isArray(lista) ? lista : (lista.data ?? []);

            const llegadasPorAnio = new Map();
            for (const r of turistas) {
                const anio = Number(r.year);
                if (!anio) continue;
                const total =
                    (Number(r.air_arrival)   || 0) +
                    (Number(r.water_arrival) || 0) +
                    (Number(r.land_arrival)  || 0);
                llegadasPorAnio.set(anio, (llegadasPorAnio.get(anio) ?? 0) + total);
            }

            const terremotosPorAnio = new Map();
            for (const eq of propios) {
                const anio = new Date(eq.fromdate).getFullYear();
                if (!anio) continue;
                terremotosPorAnio.set(anio, (terremotosPorAnio.get(anio) ?? 0) + 1);
            }

            const todosAnios = [...new Set([...llegadasPorAnio.keys(), ...terremotosPorAnio.keys()])]
                .sort((a, b) => a - b);

            const serieArrival   = todosAnios.map(a => llegadasPorAnio.get(a)   ?? 0);
            const serieTeremotos = todosAnios.map(a => terremotosPorAnio.get(a) ?? 0);
            const paisesUnicos   = [...new Set(turistas.map(r => r.country).filter(Boolean))];

            datos.tourists = { turistas, todosAnios, serieArrival, serieTeremotos, paisesUnicos };
            await tick();
            await renderTourists(todosAnios, serieArrival, serieTeremotos, paisesUnicos.length, turistas.length);
        } catch (e) {
            errores.tourists = e.message;
        } finally {
            cargando.tourists = false;
        }
    }

    async function renderTourists(anios, serieArrival, serieTeremotos, numPaises, numRegistros) {
        if (!chartTourists) return;
        const echarts = await import('echarts');
        const chart = echarts.init(chartTourists, null, { width: chartTourists.clientWidth, height: 420 });

        const maxArrival    = Math.max(...serieArrival, 1);
        const maxTerremotos = Math.max(...serieTeremotos, 1);

        const heatData = [];
        anios.forEach((a, i) => {
            heatData.push([i, 0, serieArrival[i]]);
            heatData.push([i, 1, +(serieTeremotos[i] / maxTerremotos * maxArrival).toFixed(0)]);
        });

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: 'Turismo internacional (SOS-25) vs. Terremotos por año',
                subtext: `${numPaises} países · ${numRegistros} registros · color = intensidad relativa`,
                left: 'center',
                top: 8,
                subtextStyle: { fontSize: 12 }
            },
            tooltip: {
                formatter: (params) => {
                    const anio  = anios[params.data[0]];
                    const fila  = params.data[1] === 0 ? 'Turismo' : 'Terremotos';
                    const valor = fila === 'Turismo'
                        ? serieArrival[params.data[0]].toLocaleString('es-ES')
                        : serieTeremotos[params.data[0]];
                    return `<b>${anio}</b> — ${fila}: <b>${valor}</b>`;
                }
            },
            grid: { top: 80, bottom: 80, left: 160, right: 20 },
            xAxis: {
                type: 'category',
                data: anios.map(String),
                splitArea: { show: true },
                axisLabel: { rotate: 30 }
            },
            yAxis: {
                type: 'category',
                data: ['Turismo (SOS-25)', 'Terremotos registrados'],
                splitArea: { show: true }
            },
            visualMap: {
                min: 0,
                max: maxArrival,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: 5,
                inRange: { color: ['#eef2ff', '#4361ee'] }
            },
            series: [{
                type: 'heatmap',
                data: heatData,
                label: { show: false },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
            }]
        });
        window.addEventListener('resize', () => chart.resize());
    }

    // ─── Inicialización ───────────────────────────────────────────────────────
    onMount(() => {
        cargarFEMA();
        cargarCountries();
        cargarTravelRisk();
        cargarCityStats();
        cargarTourists();
    });
</script>

<svelte:head>
    <title>Integraciones — Earthquakes</title>
</svelte:head>

<div class="page">

    <!-- HERO -->
    <header class="hero">
        <div class="hero-texto">
            <h1>Integraciones con APIs externas</h1>
            <p class="subtitulo">
                Datos de terremotos cruzados con 5 APIs externas: OpenFEMA, REST Countries,
                TravelRiskAPI, SOS2526-29 city-stats y SOS2526-25 tourist-arrivals.
            </p>
            <a href="/earthquakes" class="enlace-volver">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Volver a Gestión de terremotos
            </a>
        </div>
    </header>

    <!-- ══════════════════════════════════════════════════════════
        1. OpenFEMA — BAR agrupado (ECharts)
    ══════════════════════════════════════════════════════════ -->
    <section class="bloque">
        <div class="bloque-cabecera">
            <h2>1. OpenFEMA — Disaster Declarations</h2>
            <p class="bloque-meta">
                <span class="badge badge-proxy">Proxy propio</span>
                <span class="badge badge-ext">API pública · sin key</span>
                <code>fema.gov/api/open/v2/DisasterDeclarationsSummaries</code>
                &nbsp;·&nbsp; ECharts <strong>bar (agrupado)</strong>
            </p>
        </div>

        <div class="integracion-info">
            <strong>Cruce de datos:</strong> Se filtran las declaraciones FEMA de tipo
            <em>Earthquake</em> y se agrupan por año fiscal. La API propia aporta el número de
            terremotos registrados ese mismo año. Ambas series se muestran como barras agrupadas:
            roja = declaraciones FEMA, azul = terremotos registrados.
            <br/>
            <strong>Proxy:</strong> <code>GET /api/fema-proxy</code> →
            <code>fema.gov/api/open/v2/DisasterDeclarationsSummaries</code>
        </div>

        {#if cargando.fema}
            <p class="estado">Cargando datos de OpenFEMA...</p>
        {:else if errores.fema}
            <div class="mensaje mensaje-error">{errores.fema}</div>
        {/if}

        <div class="chart-contenedor" bind:this={chartFema}></div>

        {#if datos.fema?.todosAnios?.length}
            <details class="tabla-detalle">
                <summary>Ver tabla por año ({datos.fema.todosAnios.length} años · {datos.fema.total} declaraciones FEMA totales)</summary>
                <div class="tabla-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Año</th>
                                <th>Declaraciones FEMA (Earthquake)</th>
                                <th>Terremotos registrados</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each datos.fema.todosAnios as anio, i}
                                <tr>
                                    <td>{anio}</td>
                                    <td>{datos.fema.serieFEMA[i]}</td>
                                    <td>{datos.fema.seriePropia[i]}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </details>
        {/if}
    </section>

    <!-- ══════════════════════════════════════════════════════════
        2. REST Countries — Radar dos series (ECharts)
    ══════════════════════════════════════════════════════════ -->
    <section class="bloque">
        <div class="bloque-cabecera">
            <h2>2. REST Countries API</h2>
            <p class="bloque-meta">
                <span class="badge badge-ext">API pública · sin key</span>
                <code>restcountries.com/v3.1/name/{'{pais}'}</code>
                &nbsp;·&nbsp; ECharts <strong>radar (2 series)</strong>
            </p>
        </div>

        <div class="integracion-info">
            <strong>Cruce de datos:</strong> Los países únicos de la API propia se consultan en REST
            Countries para obtener su región y población. El radar muestra dos polígonos:
            el rojo indica cuántos países con terremotos hay en cada región;
            el azul discontinuo refleja la población relativa acumulada de esos países.
            <br/>
            <strong>Operación:</strong>
            <code>earthquake.country → GET /v3.1/name/{'{pais}'} → region, population</code>
        </div>

        {#if cargando.countries}
            <p class="estado">Cargando datos de REST Countries...</p>
        {:else if errores.countries}
            <div class="mensaje mensaje-error">{errores.countries}</div>
        {/if}

        <div class="chart-contenedor" bind:this={chartCountries}></div>

        {#if datos.countries?.regiones?.length}
            <details class="tabla-detalle">
                <summary>Ver tabla ({datos.countries.regiones.length} regiones · {datos.countries.totalPaises} países)</summary>
                <div class="tabla-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Región (REST Countries)</th>
                                <th>Países con terremotos</th>
                                <th>Población acumulada (REST Countries)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each datos.countries.regiones as r}
                                <tr>
                                    <td>{r.region}</td>
                                    <td>{r.count}</td>
                                    <td>{Number(r.poblacion).toLocaleString('es-ES')}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </details>
        {/if}
    </section>

    <!-- ══════════════════════════════════════════════════════════
        3. TravelRiskAPI — Scatter XY (ECharts)
    ══════════════════════════════════════════════════════════ -->
    <section class="bloque">
        <div class="bloque-cabecera">
            <h2>3. TravelRiskAPI</h2>
            <p class="bloque-meta">
                <span class="badge badge-ext">API pública · demo key</span>
                <code>travelriskapi.com/api/v1/countries</code>
                &nbsp;·&nbsp; ECharts <strong>scatter XY</strong>
            </p>
        </div>

        <div class="integracion-info">
            <strong>Cruce de datos:</strong> Para cada país presente en ambas fuentes,
            el eje X muestra la severidad sísmica media y el eje Y muestra el risk score
            de TravelRiskAPI. El tamaño de cada burbuja es proporcional al número de
            terremotos del país. Permite visualizar si una mayor actividad sísmica
            correlaciona con un mayor riesgo para viajeros.
            <br/>
            <strong>Autenticación:</strong> <code>X-API-Key: demo-key-travel-risk-2026</code>
        </div>

        {#if cargando.travelRisk}
            <p class="estado">Cargando datos de TravelRiskAPI...</p>
        {:else if errores.travelRisk}
            <div class="mensaje mensaje-error">{errores.travelRisk}</div>
        {/if}

        <div class="chart-contenedor" bind:this={chartTravelRisk}></div>

        {#if datos.travelRisk?.puntos?.length}
            <details class="tabla-detalle">
                <summary>Ver países cruzados ({datos.travelRisk.puntos.length} de {datos.travelRisk.total} disponibles en TravelRiskAPI)</summary>
                <div class="tabla-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>País</th>
                                <th>Severidad media</th>
                                <th>Nº terremotos</th>
                                <th>Risk score (TravelRisk)</th>
                                <th>Advisory level (TravelRisk)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each datos.travelRisk.puntos as p}
                                <tr>
                                    <td>{p.nombre}</td>
                                    <td>{p.sevMedia}</td>
                                    <td>{p.numTerremotos}</td>
                                    <td>{p.riskScore}</td>
                                    <td>{p.advisory}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </details>
        {/if}
    </section>

    <!-- ══════════════════════════════════════════════════════════
        4. SOS2526-29 city-stats — Bubble chart (ECharts)
    ══════════════════════════════════════════════════════════ -->
    <section class="bloque">
        <div class="bloque-cabecera">
            <h2>4. SOS2526-29 — City Stats</h2>
            <p class="bloque-meta">
                <span class="badge badge-sos">API SOS · grupo 29</span>
                <code>sos2526-29.onrender.com/api/v2/citys-stats</code>
                &nbsp;·&nbsp; ECharts <strong>bubble (scatter 3 ejes)</strong>
            </p>
        </div>

        <div class="integracion-info">
            <strong>Cruce de datos:</strong> Solo se representan ciudades de países presentes
            en ambas fuentes. El eje X muestra la severidad sísmica media del país,
            el eje Y la población de la ciudad en 2025 (SOS-29), y el tamaño de la burbuja
            el número de terremotos de ese país.
            <br/>
            <strong>Cruce:</strong>
            <code>normalizarPais(city.country) === normalizarPais(earthquake.country)</code>
        </div>

        {#if cargando.cityStats}
            <p class="estado">Cargando datos de city-stats...</p>
        {:else if errores.cityStats}
            <div class="mensaje mensaje-error">{errores.cityStats}</div>
        {/if}

        <div class="chart-contenedor" bind:this={chartCityStats}></div>

        {#if datos.cityStats?.length}
            <details class="tabla-detalle">
                <summary>Ver tabla combinada ({datos.cityStats.length} ciudades)</summary>
                <div class="tabla-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Ciudad (SOS-29)</th>
                                <th>País (SOS-29)</th>
                                <th>Población 2025 (SOS-29)</th>
                                <th>Severidad media</th>
                                <th>En API propia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each datos.cityStats as c}
                                <tr>
                                    <td>{c.city}</td>
                                    <td>{c.country}</td>
                                    <td>{Number(c.poblacion).toLocaleString('es-ES')}</td>
                                    <td>{c.sevMedia ?? '—'}</td>
                                    <td>{c.en_db_propia ? '✓' : '✗'}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </details>
        {/if}
    </section>

    <!-- ══════════════════════════════════════════════════════════
        5. SOS2526-25 tourist-arrivals — Heatmap (ECharts)
    ══════════════════════════════════════════════════════════ -->
    <section class="bloque">
        <div class="bloque-cabecera">
            <h2>5. SOS2526-25 — International Tourist Arrivals</h2>
            <p class="bloque-meta">
                <span class="badge badge-sos">API SOS · grupo 25</span>
                <code>sos2526-25.onrender.com/api/v2/international-tourist-arrivals</code>
                &nbsp;·&nbsp; ECharts <strong>heatmap</strong>
            </p>
        </div>

        <div class="integracion-info">
            <strong>Cruce de datos:</strong> SOS-25 aporta las llegadas turísticas totales
            (aéreas + marítimas + terrestres) por año. La API propia aporta el número de
            terremotos registrados ese mismo año. El heatmap tiene dos filas —
            <em>Turismo (SOS-25)</em> y <em>Terremotos registrados</em> —
            con el color indicando la intensidad relativa. El tooltip muestra el valor real de cada celda.
            <br/>
            <strong>Operación:</strong>
            <code>SUM(air + water + land) por año</code> ×
            <code>COUNT(earthquakes) por año</code> → heatmap comparativo
        </div>

        {#if cargando.tourists}
            <p class="estado">Cargando datos de tourist-arrivals...</p>
        {:else if errores.tourists}
            <div class="mensaje mensaje-error">{errores.tourists}</div>
        {/if}

        <div class="chart-contenedor" bind:this={chartTourists}></div>

        {#if datos.tourists?.turistas?.length}
            <details class="tabla-detalle">
                <summary>Ver tabla combinada ({datos.tourists.turistas.length} registros · {datos.tourists.paisesUnicos?.length} países)</summary>
                <div class="tabla-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>País (SOS-25)</th>
                                <th>Año</th>
                                <th>Llegadas aéreas</th>
                                <th>Llegadas marítimas</th>
                                <th>Llegadas terrestres</th>
                                <th>Terremotos ese año</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each datos.tourists.turistas as r}
                                <tr>
                                    <td>{r.country}</td>
                                    <td>{r.year}</td>
                                    <td>{Number(r.air_arrival).toLocaleString('es-ES')}</td>
                                    <td>{Number(r.water_arrival).toLocaleString('es-ES')}</td>
                                    <td>{Number(r.land_arrival).toLocaleString('es-ES')}</td>
                                    <td>
                                        {datos.tourists.serieTeremotos[
                                            datos.tourists.todosAnios.indexOf(Number(r.year))
                                        ] ?? 0}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </details>
        {/if}
    </section>
</div>

<style>
    :global(body) {
        font-family: Arial, sans-serif;
        background: #f7f6f3;
        color: #1a1a1a;
        margin: 0;
    }

    .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1.5rem;
    }

    /* ── Hero ── */
    .hero {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding: 1.5rem;
        border-radius: 16px;
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        color: white;
    }

    .hero h1 {
        color: white;
        margin: 0 0 0.35rem;
        font-size: 2rem;
        font-weight: 600;
    }

    .hero .subtitulo {
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 1rem;
        font-size: 0.9rem;
        max-width: 680px;
    }

    .enlace-volver {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.85);
        text-decoration: none;
    }

    .enlace-volver:hover { color: white; }

    /* ── Bloques ── */
    .bloque {
        background: #fff;
        border: 1px solid #e8e8e8;
        border-radius: 10px;
        padding: 1.25rem 1.5rem;
        margin: 1rem 0;
    }

    .bloque-cabecera { margin-bottom: 0.75rem; }

    h2 {
        font-size: 1.2rem;
        font-weight: 600;
        margin: 0 0 0.3rem;
        color: #1a1a1a;
    }

    .bloque-meta {
        font-size: 0.8rem;
        color: #5f6b7a;
        margin: 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .bloque-meta code {
        font-size: 0.78rem;
        color: #374151;
        background: #f3f4f6;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
    }

    /* ── Badges ── */
    .badge {
        display: inline-block;
        padding: 0.15rem 0.55rem;
        border-radius: 20px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
    }

    .badge-ext   { background: #e8f5e2; color: #2e7d32; }
    .badge-sos   { background: #e8f0fe; color: #1a56db; }
    .badge-proxy { background: #fff3cd; color: #856404; }

    /* ── Info integración ── */
    .integracion-info {
        margin-bottom: 1rem;
        padding: 0.8rem 1rem;
        background: #f9fafb;
        border-left: 3px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.85rem;
        color: #374151;
        line-height: 1.6;
    }

    .integracion-info code {
        color: #1a56db;
        font-size: 0.82rem;
        background: #eff6ff;
        padding: 0.1rem 0.35rem;
        border-radius: 3px;
    }

    /* ── Gráficos ── */
    .chart-contenedor {
        width: 100%;
        height: 420px;
    }

    /* ── Estados ── */
    .estado {
        color: #475569;
        font-size: 0.875rem;
        padding: 0.75rem 0;
    }

    .mensaje {
        padding: 0.8rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        margin: 0.5rem 0;
    }

    .mensaje-error {
        background: #fdecea;
        border: 1px solid #f0b8b5;
        color: #9b2020;
    }

    /* ── Tablas ── */
    .tabla-detalle { margin-top: 0.75rem; }

    .tabla-detalle summary {
        cursor: pointer;
        color: #2563eb;
        font-size: 0.85rem;
        padding: 0.3rem 0;
        user-select: none;
    }

    .tabla-detalle summary:hover { color: #1d4ed8; }

    .tabla-scroll {
        overflow-x: auto;
        margin-top: 0.5rem;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
    }

    thead th {
        background: #f7f6f3;
        font-size: 0.75rem;
        font-weight: 600;
        color: #777;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.5rem 0.85rem;
        text-align: left;
        border-bottom: 1px solid #e8e8e8;
        white-space: nowrap;
    }

    tbody td {
        padding: 0.5rem 0.85rem;
        border-bottom: 1px solid #f0f0ee;
        color: #374151;
        vertical-align: middle;
    }

    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #fafaf8; }
</style>