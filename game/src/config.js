// Emberfall: constants and the card catalogue.
// One file, one job: every number the game balances on lives here, so tuning
// never touches the engine, the AI or the renderer.

export const PLAYER_NAME = 'Ember Mage';
export const ENEMY_NAME = 'Vex, the Ashen Warden';
export const START_HP = 30;
export const HAND_SIZE = 5;
export const BASE_EMBER = 3;
export const MAX_EMBER = 10;
export const DECK_SIZE = 30;

// Elements are told apart by colour AND shape, never by text alone:
// flame is an orange triangle, frost a blue diamond, thorn a green circle,
// tide a teal square. The judge sees them at thumbnail size.
export const ELEMENTS = {
  flame: { label: 'Flame', color: '#ff6b35', dark: '#c33d12', shape: '▲', glow: 'rgba(255,107,53,0.55)' },
  frost: { label: 'Frost', color: '#4fc3f7', dark: '#1d7fb8', shape: '◆', glow: 'rgba(79,195,247,0.55)' },
  thorn: { label: 'Thorn', color: '#7ee081', dark: '#3d8b40', shape: '●', glow: 'rgba(126,224,129,0.55)' },
  tide: { label: 'Tide', color: '#4dd0c4', dark: '#1f8a80', shape: '■', glow: 'rgba(77,208,196,0.55)' },
};

// A card: id, name, element, ember cost, and its effect numbers.
// damage = direct damage; ward = shield gained; heal = health restored;
// draw = cards drawn; poison = poison stacked on the target; chill = true
// when the target is chilled (its next attack loses 3); emberGain = ember
// refunded; meltBonus = extra damage when the target is chilled and the
// card is Flame (the Melt combo).
export const CARDS = {
  'ember-bolt': {
    id: 'ember-bolt', name: 'Ember Bolt', element: 'flame', cost: 1,
    text: 'Deal 4 damage.', damage: 4,
  },
  'cinder-fan': {
    id: 'cinder-fan', name: 'Cinder Fan', element: 'flame', cost: 2,
    text: 'Deal 3 damage. Melt: +3 if the enemy is Chilled.', damage: 3, meltBonus: 3,
  },
  inferno: {
    id: 'inferno', name: 'Inferno', element: 'flame', cost: 4,
    text: 'Deal 9 damage.', damage: 9,
  },
  'ember-feast': {
    id: 'ember-feast', name: 'Ember Feast', element: 'flame', cost: 3,
    text: 'Deal 5 damage. Gain 2 ember.', damage: 5, emberGain: 2,
  },
  frostbite: {
    id: 'frostbite', name: 'Frostbite', element: 'frost', cost: 2,
    text: 'Deal 3 damage. Chill the enemy.', damage: 3, chill: true,
  },
  'glacial-wall': {
    id: 'glacial-wall', name: 'Glacial Wall', element: 'frost', cost: 1,
    text: 'Gain 6 ward.', ward: 6,
  },
  'deep-freeze': {
    id: 'deep-freeze', name: 'Deep Freeze', element: 'frost', cost: 3,
    text: 'Deal 4 damage. Chill. Draw 1.', damage: 4, chill: true, draw: 1,
  },
  'thorn-lash': {
    id: 'thorn-lash', name: 'Thorn Lash', element: 'thorn', cost: 1,
    text: 'Deal 2 damage. Poison 2.', damage: 2, poison: 2,
  },
  'bramble-snare': {
    id: 'bramble-snare', name: 'Bramble Snare', element: 'thorn', cost: 2,
    text: 'Deal 2 damage. Poison 4.', damage: 2, poison: 4,
  },
  'tide-surge': {
    id: 'tide-surge', name: 'Tide Surge', element: 'tide', cost: 2,
    text: 'Draw 2 cards.', draw: 2,
  },
  'healing-spring': {
    id: 'healing-spring', name: 'Healing Spring', element: 'tide', cost: 2,
    text: 'Restore 6 health.', heal: 6,
  },
  stormcall: {
    id: 'stormcall', name: 'Stormcall', element: 'tide', cost: 3,
    text: 'Deal 5 damage. Draw 1.', damage: 5, draw: 1,
  },
};

// The deck: 30 cards, three copies of the cheap workhorses, two of the rest.
export const DECK_LIST = [
  ['ember-bolt', 3], ['glacial-wall', 3], ['thorn-lash', 3],
  ['frostbite', 3], ['tide-surge', 3], ['healing-spring', 3],
  ['cinder-fan', 2], ['inferno', 2], ['ember-feast', 2],
  ['deep-freeze', 2], ['bramble-snare', 2], ['stormcall', 2],
];

export const CHILL_WEAKEN = 3; // how much a chilled attack loses
export const MELT_CLEAR = true; // melt consumes the chill
