<script>
	//@ts-nocheck

	let deckId = $state(null);

	let playerCards = $state([]);
	let dealerCards = $state([]);

	let playerScore = $state(0);
	let dealerScore = $state(0);

	let gameOver = $state(false);
	let message = $state('');

	// 1. crear baraja
	async function initDeck() {

		const res = await fetch(
			'https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1'
		);

		const data = await res.json();
		deckId = data.deck_id;
	}

	// 2. sacar carta
	async function drawCard() {

		const res = await fetch(
			`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=1`
		);

		const data = await res.json();

		return data.cards[0];
	}

	// 3. convertir valor a puntos
	function getValue(card) {

		if (card.value === 'ACE') return 11;
		if (['KING', 'QUEEN', 'JACK'].includes(card.value)) return 10;

		return parseInt(card.value);
	}

	// 4. recalcular score
	function calcScore(cards) {

		let score = 0;
		let aces = 0;

		for (const c of cards) {

			if (c.value === 'ACE') {
				aces++;
				score += 11;
			} else if (['KING', 'QUEEN', 'JACK'].includes(c.value)) {
				score += 10;
			} else {
				score += parseInt(c.value);
			}
		}

		// ajustar ases
		while (score > 21 && aces > 0) {
			score -= 10;
			aces--;
		}

		return score;
	}

	// 5. empezar juego
	async function startGame() {

		await initDeck();

		playerCards = [];
		dealerCards = [];

		gameOver = false;
		message = '';

		// jugador
		playerCards.push(await drawCard());
		playerCards.push(await drawCard());

		// dealer
		dealerCards.push(await drawCard());

		playerScore = calcScore(playerCards);
		dealerScore = calcScore(dealerCards);
	}

	// 6. pedir carta
	async function hit() {

		if (gameOver) return;

		playerCards.push(await drawCard());
		playerScore = calcScore(playerCards);

		if (playerScore > 21) {
			gameOver = true;
			message = '💥 Te has pasado!';
		}
	}

	// 7. plantarse
	async function stand() {

		gameOver = true;

		// dealer juega
		while (dealerScore < 17) {

			dealerCards.push(await drawCard());
			dealerScore = calcScore(dealerCards);
		}

		// resultado
		if (dealerScore > 21 || playerScore > dealerScore) {
			message = '🎉 Ganaste!';
		} else if (dealerScore === playerScore) {
			message = '🤝 Empate';
		} else {
			message = '💀 Perdiste';
		}
	}
</script>

<svelte:head>
	<title>Blackjack</title>
</svelte:head>

<h1>🃏 Blackjack</h1>

<button onclick={startGame}>
	Nueva partida
</button>

<hr />

<div class="game">

	<!-- JUGADOR -->
	<div>
		<h2>Jugador ({playerScore})</h2>

		<div class="cards">
			{#each playerCards as card}
				<img src={card.image} alt={card.value} />
			{/each}
		</div>

		<button onclick={hit} disabled={gameOver || !deckId}>
			Hit
		</button>

		<button onclick={stand} disabled={gameOver || !deckId}>
			Stand
		</button>
	</div>

	<!-- DEALER -->
	<div>
		<h2>Dealer ({dealerScore})</h2>

		<div class="cards">
			{#each dealerCards as card}
				<img src={card.image} alt={card.value} />
			{/each}
		</div>
	</div>

</div>

{#if message}
	<h2 class="result">{message}</h2>
{/if}

<style>
	h1 {
		margin-bottom: 1rem;
	}

	.game {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.cards {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	img {
		width: 80px;
	}
	
	button {
		margin-right: 0.5rem;
		padding: 0.5rem 1rem;
		border: none;
		background: #ffcb05;
		cursor: pointer;
		font-weight: bold;
		border-radius: 6px;
	}

	button:hover {
		background: #ffe066;
	}

	.result {
		margin-top: 1rem;
	}
</style>