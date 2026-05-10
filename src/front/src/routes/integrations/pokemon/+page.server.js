//@ts-nocheck
export async function load({ fetch }) {
	const response = await fetch(
		'https://pokeapi.co/api/v2/pokemon?limit=151'
	);

	const data = await response.json();

	const pokemon = data.results.map((p) => {
		const id = p.url.split('/')[6];

		return {
			id,
			name: p.name,
			image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
			url: p.url
		};
	});

	return {
		pokemon
	};
}