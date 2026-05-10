//@ts-nocheck

import { json } from '@sveltejs/kit';

export async function GET({ fetch, url }) {

	const limit = url.searchParams.get('limit') || '151';

	const response = await fetch(
		`https://pokeapi.co/api/v2/pokemon?limit=${limit}`
	);

	const data = await response.json();

	const pokemon = data.results.map((p) => {

		const id = p.url.split('/')[6];

		return {
			id,
			name: p.name,
			image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
		};
	});

	return json(pokemon);
}