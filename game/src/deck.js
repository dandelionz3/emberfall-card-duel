// The deck: build it from the catalogue, shuffle it, draw from it, and
// reshuffle the discard pile when it runs out. One file, one job: cards in
// piles, nothing about turns or the table.

import { CARDS, DECK_LIST, HAND_SIZE } from './config.js';
import { shuffle } from './random.js';

/** A fresh 30-card deck, shuffled with the given random function. */
export function buildDeck(random) {
  const ids = [];
  for (const [id, count] of DECK_LIST) {
    for (let i = 0; i < count; i += 1) ids.push(id);
  }
  return shuffle(ids, random);
}

/** A fresh side of the table: a shuffled deck, an empty hand and discard. */
export function createSide(random) {
  return { deck: buildDeck(random), hand: [], discard: [], played: [] };
}

/** Draw cards into a side's hand until it holds HAND_SIZE, reshuffling the
 * discard pile when the deck runs out. Returns how many cards were drawn. */
export function drawUpTo(side, random) {
  let drawn = 0;
  while (side.hand.length < HAND_SIZE) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard.splice(0), random);
    }
    side.hand.push(side.deck.pop());
    drawn += 1;
  }
  return drawn;
}

/** Draw exactly n cards (or fewer if the piles run dry). */
export function drawCards(side, n, random) {
  let drawn = 0;
  for (let i = 0; i < n; i += 1) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard.splice(0), random);
    }
    side.hand.push(side.deck.pop());
    drawn += 1;
  }
  return drawn;
}

/** The card definition for an id. */
export function cardDef(id) {
  return CARDS[id];
}
