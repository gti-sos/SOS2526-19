<script>
    //@ts-nocheck
	let { data } = $props();

    let selectedPokemon = $state(null);
    let loadingDetails = $state(false);

    async function loadDetails(pokemon) {
        console.log("CLICK:", pokemon);

        loadingDetails = true;
        selectedPokemon = null;

        try {
            console.log("URL:", pokemon.url);

            const res = await fetch(pokemon.url);

            console.log("STATUS:", res.status);

            const details = await res.json();

            console.log("DETAILS:", details);

            selectedPokemon = {
                ...pokemon,
                types: details.types.map((t) => t.type.name),
                height: details.height,
                weight: details.weight
            };

            console.log("SELECTED:", selectedPokemon);

        } catch (err) {
            console.error("ERROR FETCH:", err);
        } finally {
            loadingDetails = false;
        }
    }
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1>Pokédex</h1>

<div class="layout">
	<table>
		<thead>
			<tr>
				<th>ID</th>
				<th>Imagen</th>
				<th>Nombre</th>
				<th>Acción</th>
			</tr>
		</thead>

		<tbody>
			{#each data.pokemon as pokemon}
				<tr>
					<td>#{pokemon.id}</td>

					<td>
						<img src={pokemon.image} alt={pokemon.name} />
					</td>

					<td class="name">
						{pokemon.name}
					</td>

					<td>
						<button
							class="btn"
							onclick={() => loadDetails(pokemon)}
						>
							Ver
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<aside class="details">
		{#if loadingDetails}
			<p>Cargando...</p>

		{:else if selectedPokemon}
			<h2>
				#{selectedPokemon.id} {selectedPokemon.name}
			</h2>

			<img
				class="big"
				src={selectedPokemon.image}
				alt={selectedPokemon.name}
			/>

			<h3>Tipos</h3>

			<div class="types">
				{#each selectedPokemon.types as type}
					<span class="type {type}">
						{type}
					</span>
				{/each}
			</div>

			<p><b>Altura:</b> {selectedPokemon.height}</p>
			<p><b>Peso:</b> {selectedPokemon.weight}</p>

		{:else}
			<p>Selecciona un Pokémon</p>
		{/if}
	</aside>
</div>

<style>
	h1 {
		margin-bottom: 1rem;
	}

	.layout {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 1rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: #1e1e1e;
		color: white;
		border-radius: 10px;
		overflow: hidden;
	}

	th,
	td {
		padding: 10px;
		border-bottom: 1px solid #333;
		text-align: left;
	}

	th {
		background: #2a2a2a;
	}

	tr:hover {
		background: #2b2b2b;
	}

	img {
		width: 50px;
		height: 50px;
		image-rendering: pixelated;
	}

	.name {
		text-transform: capitalize;
		font-weight: bold;
	}

	.btn {
		background: #ffcb05;
		border: none;
		padding: 6px 10px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: bold;
	}

	.btn:hover {
		background: #ffe066;
	}

	.details {
		background: #1e1e1e;
		color: white;
		padding: 1rem;
		border-radius: 10px;
		height: fit-content;
	}

	.big {
		width: 150px;
		display: block;
		margin: 1rem auto;
	}

	.types {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.type {
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 0.8rem;
		text-transform: capitalize;
		color: white;
	}

	.fire { background: #f08030; }
	.water { background: #6890f0; }
	.grass { background: #78c850; }
	.electric { background: #f8d030; color: black; }
	.psychic { background: #f85888; }
	.ice { background: #98d8d8; color: black; }
	.dragon { background: #7038f8; }
	.dark { background: #705848; }
	.fairy { background: #ee99ac; color: black; }
	.normal { background: #a8a878; }
	.fighting { background: #c03028; }
	.flying { background: #a890f0; }
	.poison { background: #a040a0; }
	.ground { background: #e0c068; color: black; }
	.rock { background: #b8a038; color: black; }
	.bug { background: #a8b820; }
	.ghost { background: #705898; }
	.steel { background: #b8b8d0; color: black; }
</style>