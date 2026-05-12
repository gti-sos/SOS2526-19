<script>
	//@ts-nocheck
	import { onMount } from 'svelte';

	let pokemon = $state([]);
	let selectedPokemon = $state(null);

	let loadingList = $state(true);
	let loadingDetails = $state(false);

	onMount(async () => {

		try {

			const response = await fetch(
				'https://pokeapi.co/api/v2/pokemon?limit=151'
			);

			const data = await response.json();

			pokemon = data.results.map((p) => {

				const id = p.url.split('/')[6];

				return {
					id,
					name: p.name,
					image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
					url: p.url
				};
			});

		} catch (err) {

			console.error('ERROR LIST:', err);

		} finally {

			loadingList = false;
		}
	});

	async function loadDetails(pokemonItem) {

		loadingDetails = true;
		selectedPokemon = null;

		try {

			const res = await fetch(pokemonItem.url);
			const details = await res.json();

			selectedPokemon = {
				...pokemonItem,
				types: details.types.map((t) => t.type.name),
				height: details.height,
				weight: details.weight
			};

		} catch (err) {

			console.error('ERROR DETAILS:', err);

		} finally {

			loadingDetails = false;
		}
	}
</script>

<svelte:head>
	<title>Pokédex</title>
</svelte:head>

<h1>Pokédex</h1>

{#if loadingList}

	<p>Cargando Pokémon...</p>

{:else}

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

				{#each pokemon as p}

					<tr>

						<td>#{p.id}</td>

						<td>
							<img src={p.image} alt={p.name} />
						</td>

						<td class="name">
							{p.name}
						</td>

						<td>
							<button
								class="btn"
								onclick={() => loadDetails(p)}
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

{/if}

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

	th, td {
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