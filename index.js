const DIFFICULTIES = {
  easy: { pairs: 3, totalSeconds: 100, cols: 3 },
  medium: { pairs: 6, totalSeconds: 200, cols: 4 },
  hard: { pairs: 10, totalSeconds: 300, cols: 5 },
};

let difficulty = "easy";
let allPokemon = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let clicks = 0;
let pairsMatched = 0;
let pairsTotal = 0;
let totalSeconds = 100;
let secondsPassed = 0;
let timerInterval = null;
let gameActive = false;
let peekUses = 3;

async function fetchAllPokemon() {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
  const data = await res.json();
  allPokemon = data.results;
}

async function fetchRandomPokemon(count) {
  const shuffled = [...allPokemon]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  const details = await Promise.all(
    shuffled.map((p) => fetch(p.url).then((r) => r.json())),
  );
  return details
    .map((d) => ({
      name: d.name,
      img:
        d.sprites.other["official-artwork"].front_default ||
        d.sprites.front_default,
    }))
    .filter((p) => p.img);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hideGame() {
  clearInterval(timerInterval);
  gameActive = false;
  lockBoard = false;
  firstCard = secondCard = null;
  $("#stats").addClass("hidden");
  $("#game_grid").addClass("hidden").empty();
  $("#theme_controls").addClass("hidden");
  $("#start_btn").removeClass("hidden");
}

function buildGrid(pokemonList) {
  const levels = DIFFICULTIES[difficulty];
  const $grid = $("#game_grid")
    .empty()
    .removeClass("cols-3 cols-4 cols-5")
    .addClass(`cols-${levels.cols}`);

  const cards = shuffle([...pokemonList, ...pokemonList]);

  cards.forEach((poke, idx) => {
    const $card = $(`
      <div class="card" data-name="${poke.name}" data-idx="${idx}">
        <img class="front_face" src="${poke.img}" alt="${poke.name}">
        <img class="back_face"  src="back.webp"  alt="back">
      </div>
    `);
    $grid.append($card);
  });

  $(".card").on("click", onCardClick);
}

function onCardClick() {
  if (!gameActive || lockBoard) return;
  const $card = $(this);
  if ($card.hasClass("flip")) return;
  if ($card.hasClass("matched")) return;

  $card.addClass("flip");
  clicks++;
  updateStats();

  if (!firstCard) {
    firstCard = $card;
    return;
  }

  secondCard = $card;
  lockBoard = true;
  checkMatch();
}

function checkMatch() {
  if (firstCard.data("name") === secondCard.data("name")) {
    firstCard.addClass("matched").off("click");
    secondCard.addClass("matched").off("click");
    pairsMatched++;
    updateStats();
    resetPair();
    if (pairsMatched === pairsTotal) endGame(true);
  } else {
    const $a = firstCard,
      $b = secondCard;
    setTimeout(() => {
      $a.removeClass("flip");
      $b.removeClass("flip");
      resetPair();
    }, 1000);
  }
}

function resetPair() {
  firstCard = secondCard = null;
  lockBoard = false;
}

function startTimer() {
  clearInterval(timerInterval);
  secondsPassed = 0;
  updateStats();
  timerInterval = setInterval(() => {
    secondsPassed++;
    updateStats();
    if (secondsPassed >= totalSeconds) endGame(false);
  }, 1000);
}

function updateStats() {
  $("#total_pairs").text(pairsTotal);
  $("#num_matches").text(pairsMatched);
  $("#pairs_left").text(pairsTotal - pairsMatched);
  $("#num_clicks").text(clicks);
  $("#total_seconds").text(totalSeconds);
  $("#seconds_passed").text(secondsPassed);
}

function endGame(won) {
  gameActive = false;
  clearInterval(timerInterval);
  lockBoard = true;
  $(".card").off("click");

  if (!won) $(".card:not(.matched)").addClass("flip");

  setTimeout(() => {
    alert(won ? `You won!` : `Game over! Time's up!`);
  }, 600);
}

async function startGame() {
  clearInterval(timerInterval);
  resetPair();
  lockBoard = true;
  gameActive = false;
  clicks = 0;
  pairsMatched = 0;
  secondsPassed = 0;
  peekUses = 3;
  $("#peek_btn").text("Peek (3 left)").prop("disabled", false);

  const levels = DIFFICULTIES[difficulty];
  pairsTotal = levels.pairs;
  totalSeconds = levels.totalSeconds;

  $("#start_btn").addClass("hidden");
  $("#stats").removeClass("hidden");
  $("#game_grid").removeClass("hidden");
  $("#theme_controls").removeClass("hidden");

  updateStats();
  $("#game_grid").html(
    "<p style='padding:20px;font-size:16px;'>Loading Pokémon…</p>",
  );

  const pokemonList = await fetchRandomPokemon(pairsTotal);
  buildGrid(pokemonList);

  gameActive = true;
  lockBoard = false;
  startTimer();
}

function peek() {
  if (!gameActive || peekUses <= 0) return;

  peekUses--;
  $("#peek_btn").text(`Peek (${peekUses} left)`);
  if (peekUses === 0) $("#peek_btn").prop("disabled", true);

  lockBoard = true;
  const $unmatched = $(".card:not(.matched):not(.flip)");
  $unmatched.addClass("flip");

  setTimeout(() => {
    $unmatched.removeClass("flip");
    lockBoard = false;
  }, 2000);
}

$(document).ready(async function () {
  await fetchAllPokemon();

  hideGame();

  $(".diff_btn").on("click", function () {
    $(".diff_btn").removeClass("active_diff");
    $(this).addClass("active_diff");
    difficulty = $(this).attr("id").replace("btn_", "");
    hideGame();
  });

  $("#start_btn").on("click", startGame);
  $("#reset_btn").on("click", hideGame);
  $("#peek_btn").on("click", peek);

  $("#btn_dark").on("click", function () {
    $("body").addClass("dark-mode");
    $(".theme_btn").removeClass("active_theme");
    $(this).addClass("active_theme");
  });

  $("#btn_light").on("click", function () {
    $("body").removeClass("dark-mode");
    $(".theme_btn").removeClass("active_theme");
    $(this).addClass("active_theme");
  });
});
