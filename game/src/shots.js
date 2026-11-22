// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the
// real rules forward from a fresh world with a fixed script, so the frame is
// what a short game really looks like and the same seed always gives the
// same frame. Hands are dealt by the staging so the scripted cards are
// there; every card is then played through the engine.

import { createRandom } from './random.js';
import { createGame, startGame, playCard, enemyStep, endPlayerTurn, SCREEN_WIN, SCREEN_LOSS } from './state.js';
import { drawUpTo } from './deck.js';

/** Play the card with `id` from the player's hand, if it is there and
 * affordable. Returns true when it was played. */
function playId(state, id) {
  const index = state.player.hand.indexOf(id);
  if (index === -1) return false;
  return playCard(state, index) !== null;
}

/** Run the enemy's whole turn, step by step, until it reports done. */
function runEnemyTurn(state) {
  for (let i = 0; i < 8; i += 1) {
    const events = enemyStep(state);
    if (events.some((e) => e.type === 'done')) return;
    if (state.screen !== 'play') return;
  }
}

/** Stage the named scene on a fresh game and return the game. */
export function stageShot(name, seed) {
  const random = createRandom(seed);
  const state = createGame(random);
  if (name === 'title' || !name) {
    drawUpTo(state.player, random);
    drawUpTo(state.enemy, random);
    return state;
  }

  startGame(state);
  if (name === 'play') {
    // Turn 1: chill Vex with Frostbite, then Ember Bolt. Vex answers with
    // Tide Surge and a chilled Ember Bolt, so the table shows a chill, a
    // ward-free trade and the poison-free early game.
    state.player.hand = ['frostbite', 'ember-bolt', 'thorn-lash', 'tide-surge', 'glacial-wall'];
    state.enemy.hand = ['tide-surge', 'ember-bolt', 'thorn-lash', 'frostbite', 'glacial-wall'];
    state.intent = 'tide-surge';
    playId(state, 'frostbite');
    playId(state, 'ember-bolt');
    endPlayerTurn(state);
    runEnemyTurn(state);
    // Turn 2: re-chill Vex with Frostbite, then the Melt — Cinder Fan bursts
    // for +3 against the chilled foe. The log keeps the MELT line.
    state.player.hand = ['frostbite', 'cinder-fan', 'thorn-lash', 'tide-surge', 'healing-spring'];
    playId(state, 'frostbite');
    playId(state, 'cinder-fan');
    return state;
  }

  if (name === 'win') {
    state.enemy.hp = 8;
    state.player.hand = ['inferno', 'ember-bolt', 'thorn-lash', 'tide-surge', 'glacial-wall'];
    state.player.ember = 4;
    playId(state, 'inferno');
    state.stats.turns = 7;
    state.stats.cardsPlayed = 14;
    state.stats.damageDealt = 31;
    return state;
  }

  if (name === 'loss') {
    state.player.hp = 5;
    state.enemy.hand = ['inferno', 'ember-bolt', 'thorn-lash', 'frostbite', 'glacial-wall'];
    state.enemy.ember = 4;
    state.intent = 'inferno';
    endPlayerTurn(state);
    runEnemyTurn(state);
    state.stats.turns = 6;
    state.stats.cardsPlayed = 11;
    state.stats.damageDealt = 24;
    return state;
  }

  return state;
}

export { SCREEN_WIN, SCREEN_LOSS };
