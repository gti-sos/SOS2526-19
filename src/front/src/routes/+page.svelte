<script>
  const BASE = "https://sos2526-19.onrender.com";

  const team = [
    {
      name: "Raúl de los Reyes Benítez",
      resource: "workers-productivity",
      frontend: `${BASE}/workers-productivity`,
      api: `${BASE}/api/v1/workers-productivity`,
      docs: `${BASE}/api/v1/workers-productivity/docs`
    },
    {
      name: "Pablo Rodríguez Armesto",
      resource: "drought-stats",
      frontend: `${BASE}/drought-stats`,
      api: `${BASE}/api/v1/drought-stats`,
      docs: `${BASE}/api/v1/drought-stats/docs`
    },
    {
      name: "Javier Morales Jiménez",
      resource: "earthquakes",
      frontend: "${BASE}/earthquakes",
      api: `${BASE}/api/v1/earthquakes`,
      docs: `${BASE}/api/v1/earthquakes/docs`
    }
  ];

  const githubRepo = "https://github.com/gti-sos/SOS2526-19";
</script>

<svelte:head>
  <title>SOS2526-19</title>
</svelte:head>

<h1>SOS2526-19</h1>
<p>Portal principal del equipo</p>

<h2>👥 Equipo</h2>
<ul>
  {#each team as member}
    <li>
      <strong>{member.name}</strong> — fuente de datos: <code>{member.resource}</code>
    </li>
  {/each}
</ul>

<h2>🌐 Frontends</h2>
<ul>
  {#each team as member}
    <li>
      {#if member.frontend}
        <a href={member.frontend} target="_blank">
          {member.frontend}
        </a>
      {:else}
        Frontend de {member.name} (pendiente)
      {/if}
    </li>
  {/each}
</ul>

<h2>🔌 APIs</h2>
<ul>
  {#each team as member}
    <li>
      <a href={member.api} target="_blank">
        {member.api}
      </a>
    </li>
  {/each}
</ul>

<h2>📄 Documentación (Postman)</h2>
<ul>
  {#each team as member}
    <li>
      <a href={member.docs} target="_blank">
        Docs de {member.resource}
      </a>
    </li>
  {/each}
</ul>

<h2>📦 Repositorio</h2>
<p>
  <a href={githubRepo} target="_blank">
    {githubRepo}
  </a>
</p>