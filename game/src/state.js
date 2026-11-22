// The engine: the duel's state and every rule that moves it. One file, one
// job: turns, cards, damage, ward, poison, chill and the Melt combo. It knows
// nothing about the DOM; it returns events the renderer and the sounds play.

import {
  BASE_EMBER, CHILL_WEAKEN, ENEMY_NAME, HAND_SIZE, MAX_EMBER,
  PLAYER_NAME, START_HP,
} from './config.js';
import { cardDef, createSide, drawCards, drawUpTo } from './deck.js';
import { chooseIntent, pickExtraCard } from './ai.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

/** A fresh fighter: health, ward, ember, poison, chill and its card piles. */
function createFighter(random) {
  return {
    hp: START_HP, maxHp: START_HP, ward: 0,
    ember: BASE_EMBER, maxEmber: BASE_EMBER,
    poison: 0, chilled: false,
    ...createSide(random),
  };
}

/** A fresh duel, on the title screen. */
export function createGame(random) {
  return {
    random,
    screen: SCREEN_TITLE,
    turn: 0,
    phase: 'player',
    enemyPhase: 'idle',
    player: createFighter(random),
    enemy: createFighter(random),
    intent: null,
    log: [],
    lastEvents: [],
    stats: { damageDealt: 0, cardsPlayed: 0, turns: 0 },
    best: 0,
  };
}

/** Reset both fighters and begin turn 1 on the player's side. */
export function startGame(state) {
  state.player = createFighter(state.random);
  state.enemy = createFighter(state.random);
  state.turn = 0;
  state.screen = SCREEN_PLAY;
  state.phase = 'player';
  state.enemyPhase = 'idle';
  state.intent = null;
  state.log = [`${PLAYER_NAME} faces ${ENEMY_NAME}.`];
  state.stats = { damageDealt: 0, cardsPlayed: 0, turns: 0 };
  beginPlayerTurn(state);
  return state;
}

function pushLog(state, line) {
  state.log.push(line);
  if (state.log.length > 6) state.log.shift();
}

/** Poison ticks at the start of the afflicted side's turn: it bites through
 * ward, then fades by one. */
function poisonTick(state, side, name) {
  const events = [];
  if (side.poison > 0) {
    const amount = side.poison;
    side.hp = Math.max(0, side.hp - amount);
    side.poison = Math.max(0, side.poison - 1);
    events.push({ type: 'poison', name, amount, hp: side.hp });
    pushLog(state, `${name} suffers ${amount} poison.`);
  }
  return events;
}

/** Begin the player's turn: count it, tick poison, refill ember, draw up,
 * and let the enemy commit to its next play, shown as its intent. */
export function beginPlayerTurn(state) {
  state.turn += 1;
  state.stats.turns = state.turn;
  state.phase = 'player';
  const events = poisonTick(state, state.player, PLAYER_NAME);
  if (checkEnd(state)) {
    state.lastEvents = events;
    return events;
  }
  state.player.maxEmber = Math.min(BASE_EMBER + state.turn - 1, MAX_EMBER);
  state.player.ember = state.player.maxEmber;
  drawUpTo(state.player, state.random);
  state.enemy.maxEmber = Math.min(BASE_EMBER + state.turn - 1, MAX_EMBER);
  state.enemy.ember = state.enemy.maxEmber;
  drawUpTo(state.enemy, state.random);
  state.intent = chooseIntent(state);
  if (state.intent) {
    events.push({ type: 'intent', card: state.intent });
    pushLog(state, `${ENEMY_NAME} intends ${cardDef(state.intent).name}.`);
  }
  pushLog(state, `Turn ${state.turn} — your move.`);
  state.lastEvents = events;
  return events;
}

/** Ward soaks damage first; the rest lands on health. */
function dealDamage(state, target, amount, sourceName) {
  const blocked = Math.min(target.ward, amount);
  target.ward -= blocked;
  const landed = amount - blocked;
  target.hp = Math.max(0, target.hp - landed);
  return { blocked, landed, hp: target.hp };
}

/** Apply one card's effects. `side` plays it, `foe` receives it. Returns the
 * events the play produced, for the renderer and the sounds. */
export function applyCard(state, side, foe, cardId, sideName, foeName) {
  const card = cardDef(cardId);
  const events = [{ type: 'play', name: sideName, card: cardId }];
  pushLog(state, `${sideName} plays ${card.name}.`);

  if (card.damage) {
    let amount = card.damage;
    // A chilled attacker hits 3 softer.
    if (side.chilled) {
      amount = Math.max(0, amount - CHILL_WEAKEN);
      side.chilled = false;
      events.push({ type: 'chillbreak', name: sideName });
      pushLog(state, `${sideName} shakes off the chill.`);
    }
    // Melt: a Flame card WITH a melt bonus, against a chilled foe, hits
    // harder, and the chill burns away. (A plain Flame card does not melt.)
    if (card.element === 'flame' && foe.chilled && card.meltBonus) {
      amount += card.meltBonus ?? 0;
      foe.chilled = false;
      events.push({ type: 'melt', name: foeName, bonus: card.meltBonus ?? 0 });
      pushLog(state, `MELT! The frost bursts into flame (+${card.meltBonus ?? 0}).`);
    }
    const hit = dealDamage(state, foe, amount, sideName);
    events.push({ type: 'damage', name: foeName, amount: hit.landed, blocked: hit.blocked, hp: hit.hp });
    if (side === state.player) state.stats.damageDealt += hit.landed;
  }
  if (card.ward) {
    side.ward += card.ward;
    events.push({ type: 'ward', name: sideName, amount: card.ward, ward: side.ward });
    pushLog(state, `${sideName} gains ${card.ward} ward.`);
  }
  if (card.heal) {
    const healed = Math.min(card.heal, side.maxHp - side.hp);
    side.hp += healed;
    events.push({ type: 'heal', name: sideName, amount: healed, hp: side.hp });
    pushLog(state, `${sideName} restores ${healed} health.`);
  }
  if (card.chill) {
    foe.chilled = true;
    events.push({ type: 'chill', name: foeName });
    pushLog(state, `${foeName} is chilled.`);
  }
  if (card.poison) {
    foe.poison += card.poison;
    events.push({ type: 'poisoned', name: foeName, amount: card.poison, total: foe.poison });
    pushLog(state, `${foeName} is poisoned (${foe.poison}).`);
  }
  if (card.draw) {
    const drawn = drawCards(side, card.draw, state.random);
    events.push({ type: 'draw', name: sideName, amount: drawn });
    pushLog(state, `${sideName} draws ${drawn}.`);
  }
  if (card.emberGain) {
    side.ember = Math.min(side.maxEmber, side.ember + card.emberGain);
    events.push({ type: 'ember', name: sideName, amount: card.emberGain, ember: side.ember });
  }
  return events;
}

/** The player plays the card at `handIndex`. Returns its events, or null
 * when the card cannot be played (wrong phase, not enough ember). */
export function playCard(state, handIndex) {
  if (state.screen !== SCREEN_PLAY || state.phase !== 'player') return null;
  const cardId = state.player.hand[handIndex];
  if (!cardId) return null;
  const card = cardDef(cardId);
  if (state.player.ember < card.cost) return null;
  state.player.ember -= card.cost;
  state.player.hand.splice(handIndex, 1);
  state.player.discard.push(cardId);
  state.player.played.push(cardId);
  state.stats.cardsPlayed += 1;
  const events = applyCard(state, state.player, state.enemy, cardId, PLAYER_NAME, ENEMY_NAME);
  state.lastEvents = events;
  checkEnd(state);
  return events;
}

/** The enemy's turn, one atomic step at a time so the table can show each
 * play: poison, then its telegraphed card, then one extra card if it can
 * afford one, then it draws and the player's next turn begins. Returns the
 * step's events; the step that ends the turn has type 'done'. */
export function enemyStep(state) {
  if (state.enemyPhase === 'idle') {
    state.phase = 'enemy';
    state.enemyPhase = 'poison';
  }
  if (state.enemyPhase === 'poison') {
    state.enemyPhase = 'play';
    const events = poisonTick(state, state.enemy, ENEMY_NAME);
    if (checkEnd(state)) return [...events, { type: 'done' }];
    return events;
  }
  if (state.enemyPhase === 'play') {
    const cardId = state.intent;
    state.enemyPhase = 'extra';
    if (!cardId) return [];
    const index = state.enemy.hand.indexOf(cardId);
    if (index === -1) return [];
    const card = cardDef(cardId);
    if (state.enemy.ember < card.cost) return [];
    state.enemy.ember -= card.cost;
    state.enemy.hand.splice(index, 1);
    state.enemy.discard.push(cardId);
    state.enemy.played.push(cardId);
    const events = applyCard(state, state.enemy, state.player, cardId, ENEMY_NAME, PLAYER_NAME);
    state.intent = null;
    state.lastEvents = events;
    if (checkEnd(state)) return [...events, { type: 'done' }];
    return events;
  }
  if (state.enemyPhase === 'extra' || state.enemyPhase === 'extra2') {
    state.enemyPhase = state.enemyPhase === 'extra' ? 'extra2' : 'end';
    const cardId = pickExtraCard(state);
    if (!cardId) return [];
    const index = state.enemy.hand.indexOf(cardId);
    if (index === -1) return [];
    const card = cardDef(cardId);
    if (state.enemy.ember < card.cost) return [];
    state.enemy.ember -= card.cost;
    state.enemy.hand.splice(index, 1);
    state.enemy.discard.push(cardId);
    state.enemy.played.push(cardId);
    const events = applyCard(state, state.enemy, state.player, cardId, ENEMY_NAME, PLAYER_NAME);
    state.lastEvents = events;
    if (checkEnd(state)) return [...events, { type: 'done' }];
    return events;
  }
  state.enemyPhase = 'idle';
  const events = beginPlayerTurn(state);
  return [...events, { type: 'done' }];
}

/** Win when Vex falls, loss when the player falls. Sets the screen and
 * returns true when the duel is over. */
export function checkEnd(state) {
  if (state.screen !== SCREEN_PLAY) return state.screen !== SCREEN_PLAY;
  if (state.enemy.hp <= 0) {
    state.screen = SCREEN_WIN;
    pushLog(state, `${ENEMY_NAME} falls. Victory!`);
    state.lastEvents = [{ type: 'win' }];
    return true;
  }
  if (state.player.hp <= 0) {
    state.screen = SCREEN_LOSS;
    pushLog(state, `${PLAYER_NAME} falls. Defeat.`);
    state.lastEvents = [{ type: 'loss' }];
    return true;
  }
  return false;
}

/** The player ends the turn; the enemy then plays one step at a time. */
export function endPlayerTurn(state) {
  if (state.screen !== SCREEN_PLAY || state.phase !== 'player') return false;
  state.phase = 'enemy';
  state.enemyPhase = 'idle';
  pushLog(state, `${PLAYER_NAME} ends the turn.`);
  return true;
}

export { HAND_SIZE };
