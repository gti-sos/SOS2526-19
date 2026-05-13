<script>
  const members = [
    {
      name: 'Raul de los Reyes Benitez',
      note: 'Integraciones cruzadas con workers-productivity.',
      integrations: [
        {
          name: 'REST Countries',
          route: '/integrations/rest-countries',
          kind: 'Externa',
          proxy: 'Si',
          chart: 'Highcharts column',
          description: 'Cruza densidad de poblacion con productividad media por hora.'
        },
        {
          name: 'Open-Meteo',
          route: '/integrations/open-meteo',
          kind: 'Externa',
          proxy: 'Si',
          chart: 'Highcharts area',
          description: 'Relaciona clima actual en capitales con productividad laboral.'
        },
        {
          name: 'World Bank',
          route: '/integrations/world-bank',
          kind: 'Externa',
          proxy: 'Si',
          chart: 'Highcharts pie',
          description: 'Compara PIB per capita externo con productividad propia.'
        },
        {
          name: 'fifa-squad-value-per-years',
          route: '/integrations/fifa-squad-value-per-years',
          kind: 'SOS otro grupo',
          proxy: 'No',
          chart: 'Highcharts packedbubble',
          description: 'Cruza valor de plantilla con productividad en paises coincidentes.'
        },
        {
          name: 'natural-disasters',
          route: '/integrations/natural-disasters',
          kind: 'SOS otro grupo',
          proxy: 'No',
          chart: 'Highcharts treemap',
          description: 'Relaciona impacto de desastres con productividad media por pais.'
        }
      ]
    },
    {
      name: 'Pablo Rodriguez Armesto',
      note: 'Integraciones cruzadas con drought-stats.',
      integrations: [
        {
          name: 'Pokemon',
          route: '/integrations/pokemon',
          kind: 'Externa',
          proxy: 'No',
          chart: 'Tabla + ficha HTML',
          description: 'Listado de Pokemon con detalle individual desde PokeAPI.'
        },
        {
          name: 'Dogs',
          route: '/integrations/dogs',
          kind: 'Externa',
          proxy: 'SvelteKit /api/dogs',
          chart: 'Galeria HTML',
          description: 'Galeria de razas e imagenes usando Dog CEO API a traves de endpoint server.'
        },
        {
          name: 'Blackjack',
          route: '/integrations/blackjack',
          kind: 'Externa',
          proxy: 'No',
          chart: 'Juego HTML',
          description: 'Juego interactivo que consume Deck of Cards API.'
        },
        {
          name: 'wine-stats',
          route: '/integrations/wine-stats',
          kind: 'SOS otro grupo',
          proxy: 'No',
          chart: 'Highcharts column',
          description: 'Muestra una media enseñando el impacto de las sequias para el precio de los vinos.'
        },
        {
          name: 'international-construction-costs',
          route: '/integrations/international-construction-costs',
          kind: 'SOS otro grupo',
          proxy: 'No',
          chart: 'Highcharts pie chart',
          description: 'Representa la relación entre la severidad de las sequías y el coste medio internacional de construcción.'
        }
      ]
    }
  ];

</script>

<svelte:head>
  <title>Integraciones D03.B</title>
</svelte:head>

<main class="page">
  <a class="back" href="/">Volver al inicio</a>

  <section class="hero">
    <p class="eyebrow">D03.B</p>
    <h1>Integraciones externas y SOS</h1>
    <p>
      Esta seccion organiza las integraciones en rutas separadas. Cada tarjeta abre una
      pagina independiente con su endpoint, fetch, visualizacion, conclusion y manejo de error.
    </p>
  </section>

  <div class="member-list">
    {#each members as member}
      <section class="member" aria-label={`Integraciones de ${member.name}`}>
        <div class="member-heading">
          <h2>{member.name}</h2>
          <p>{member.note}</p>
        </div>

        <div class="grid">
          {#each member.integrations as integration}
            <a class="card" href={integration.route}>
              <div>
                <p class="kind">{integration.kind}</p>
                <h3>{integration.name}</h3>
                <p>{integration.description}</p>
              </div>
              <dl>
                <div>
                  <dt>Proxy</dt>
                  <dd>{integration.proxy}</dd>
                </div>
                <div>
                  <dt>Visualizacion</dt>
                  <dd>{integration.chart}</dd>
                </div>
              </dl>
              <span class="link">Abrir integracion</span>
            </a>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f6f8fb;
    color: #172033;
  }

  .page {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    padding: 32px 0 56px;
  }

  .back,
  .link {
    color: #0f5d8f;
    font-weight: 700;
    text-decoration: none;
  }

  .hero {
    margin-top: 24px;
    padding: 24px 0;
    border-bottom: 1px solid #d9e2ef;
  }

  .eyebrow,
  .kind {
    margin: 0 0 8px;
    color: #7a3e12;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    max-width: 780px;
    margin-bottom: 12px;
    font-size: clamp(2rem, 6vw, 4rem);
    line-height: 1;
  }

  .hero p:last-child {
    max-width: 760px;
    color: #4b5a70;
    font-size: 1.05rem;
    line-height: 1.6;
  }

  .member-list {
    display: grid;
    gap: 32px;
    margin-top: 28px;
  }

  .member {
    display: grid;
    gap: 16px;
  }

  .member-heading {
    border-bottom: 1px solid #d9e2ef;
    padding-bottom: 12px;
  }

  .member-heading h2 {
    margin-bottom: 6px;
    font-size: 1.45rem;
  }

  .member-heading p {
    color: #526177;
    margin-bottom: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }

  .card {
    display: grid;
    min-height: 260px;
    align-content: space-between;
    gap: 18px;
    padding: 20px;
    border: 1px solid #d9e2ef;
    border-radius: 8px;
    background: #ffffff;
    color: inherit;
    text-decoration: none;
    box-shadow: 0 12px 24px rgba(33, 48, 73, 0.08);
  }

  .card h3 {
    margin-bottom: 10px;
    font-size: 1.2rem;
  }

  .card p {
    color: #526177;
    line-height: 1.5;
  }

  dl {
    display: grid;
    gap: 8px;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid #edf1f7;
    padding-top: 8px;
  }

  dt {
    color: #64748b;
    font-weight: 700;
  }

  dd {
    margin: 0;
    color: #172033;
    font-weight: 800;
    text-align: right;
  }

</style>
