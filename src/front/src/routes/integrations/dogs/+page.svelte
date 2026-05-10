<script>
  //@ts-nocheck
	import { onMount } from 'svelte';

	let breeds = $state([]);
	let loading = $state(true);
	let progress = $state(0);
	let error = $state(null);

	function formatBreed(breed) {
		return breed
			.split('/')
			.reverse()
			.join(' ')
			.replace(/\b\w/g, (l) => l.toUpperCase());
	}

	async function getImage(breed) {
		try {
			const res = await fetch(
				`https://dog.ceo/api/breed/${breed}/images/random`
			);
			const data = await res.json();
			return data.message;
		} catch {
			return null;
		}
	}

	onMount(async () => {
		try {
			const res = await fetch(
				'https://dog.ceo/api/breeds/list/all'
			);

			const data = await res.json();
			const breedNames = Object.keys(data.message);

			const results = [];

			for (let i = 0; i < breedNames.length; i++) {
				const breed = breedNames[i];

				const image = await getImage(breed);

				results.push({
					name: breed,
					label: formatBreed(breed),
					image
				});

				progress = Math.round(
					((i + 1) / breedNames.length) * 100
				);
			}

			breeds = results;

		} catch (err) {
			console.error(err);
			error = 'Error cargando razas';
		} finally {
			loading = false;
		}
	});
</script>

<h1>🐶 Razas de perros</h1>

{#if loading}
	<p>Cargando... {progress}%</p>

	<div class="grid">
		{#each Array(12) as _}
			<div class="card skeleton"></div>
		{/each}
	</div>

{:else if error}
	<p>{error}</p>

{:else}
	<div class="grid">
		{#each breeds as breed}
			<div class="card">
				<img
					src={breed.image}
					alt={breed.name}
					loading="lazy"
				/>
				<p>{breed.label}</p>
			</div>
		{/each}
	</div>
{/if}

<style>
	h1 {
		margin-bottom: 1rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
	}

	.card {
		background: #1e1e1e;
		color: white;
		border-radius: 12px;
		overflow: hidden;
		text-align: center;
		min-height: 200px;
	}

	img {
		width: 100%;
		height: 150px;
		object-fit: cover;
	}

	p {
		margin: 8px;
		font-weight: bold;
		text-transform: capitalize;
	}

	/* Skeleton loading */
	.skeleton {
		background: linear-gradient(
			90deg,
			#2a2a2a,
			#3a3a3a,
			#2a2a2a
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}
</style>