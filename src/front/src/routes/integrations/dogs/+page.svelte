<script>
	//@ts-nocheck
	import { onMount } from 'svelte';

	let breeds = $state([]);
	let loading = $state(true);
	let error = $state(null);

	onMount(async () => {

		try {

			const res = await fetch('/api/dogs');
			const data = await res.json();

			if (data.error) {
				throw new Error(data.error);
			}

			breeds = data;

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

	<p>Cargando...</p>

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

				{#if breed.image}
					<img
						src={breed.image}
						alt={breed.name}
						loading="lazy"
					/>
				{/if}

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

	.skeleton {
		background: linear-gradient(
			90deg,
			#2a2a2a,
			#3a3a2a,
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