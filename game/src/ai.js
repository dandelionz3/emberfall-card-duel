// Vex, the Ashen Warden: a readable opponent. One file, one job: decide
// what the enemy plays, and telegraph it so the player can counter it.
// The intent is chosen at the start of the player's turn and shown on the
// table; the extra card is whatever the policy likes best after the intent.

import { cardDef } from './deck.js';

/** Score a card for the enemy's hand: damage is worth its number, healing
 * matters when hurt, ward matters when the player threatens, draw is cheap. */
function scoreCard(state, cardId) {
  const card = cardDef(cardId);
  const me = state.enemy;
  const foe = state.player;
  let score = 0;
  if (card.damage) score += card.damage * 2;
  if (card.meltBonus && foe.chilled) score += card.meltBonus * 2;
  if (card.chill) score += 2;
  if (card.poison) score += card.poison * 2;
  if (card.ward) score += me.hp <= 12 ? card.ward * 1.5 : card.ward * 0.5;
  if (card.heal) score += me.hp <= 12 ? card.heal * 2 : card.heal * 0.3;
  if (card.draw) score += 2;
  if (card.emberGain) score += 2;
  score -= card.cost * 0.5;
  return score;
}

/** The card the enemy will play on its turn: the best it can afford, picked
 * now so the table can show its intent while the player decides. */
export function chooseIntent(state) {
  const me = state.enemy;
  let best = null;
  let bestScore = -Infinity;
  for (const cardId of me.hand) {
    const card = cardDef(cardId);
    if (card.cost > me.ember) continue;
    const score = scoreCard(state, cardId);
    if (score > bestScore) {
      bestScore = score;
      best = cardId;
    }
  }
  return best;
}

/** After the intent, one more card if the enemy can afford a good one. */
export function pickExtraCard(state) {
  const me = state.enemy;
  let best = null;
  let bestScore = 3; // only a card worth playing gets a slot
  for (const cardId of me.hand) {
    const card = cardDef(cardId);
    if (card.cost > me.ember) continue;
    const score = scoreCard(state, cardId);
    if (score > bestScore) {
      bestScore = score;
      best = cardId;
    }
  }
  return best;
}
