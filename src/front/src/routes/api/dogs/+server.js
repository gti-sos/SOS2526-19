//@ts-nocheck
export async function GET() {

	try {

		const res = await fetch(
			'https://dog.ceo/api/breeds/list/all'
		);

		const data = await res.json();

		const breedNames = Object.keys(data.message);

		const breeds = await Promise.all(
			breedNames.map(async (breed) => {

				try {

					const imgRes = await fetch(
						`https://dog.ceo/api/breed/${breed}/images/random`
					);

					const imgData = await imgRes.json();

					return {
						name: breed,
						label: formatBreed(breed),
						image: imgData.message
					};

				} catch {

					return {
						name: breed,
						label: formatBreed(breed),
						image: null
					};
				}
			})
		);

		return new Response(JSON.stringify(breeds), {
			headers: {
				'Content-Type': 'application/json'
			}
		});

	} catch (err) {

		return new Response(
			JSON.stringify({ error: 'Error fetching dogs' }),
			{ status: 500 }
		);
	}
}

function formatBreed(breed) {

	return breed
		.split('/')
		.reverse()
		.join(' ')
		.replace(/\b\w/g, (l) => l.toUpperCase());
}