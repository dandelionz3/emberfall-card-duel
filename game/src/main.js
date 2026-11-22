// Boot and the one loop: the game moves between title, play, win and loss;
// input is read on click or key, the enemy plays one step at a time so the
// table shows each of its cards, and ember particles drift behind it.
//
// ?seed=N fixes the shuffle. ?shot=title|play|win|loss (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { createRandom } from './random.js';
import {
  createGame, startGame, playCard, endPlayerTurn, enemyStep,
  SCREEN_TITLE, SCREEN_WIN, SCREEN_LOSS,
} from './state.js';
import { createRenderer, render, flashPlayed, floater, tickParticles } from './render.js';
import { createInput } from './input.js';
import { sound } from './sound.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'emberfall-best-turns';
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const app = document.getElementById('app');
const renderer = createRenderer(app);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best then lasts this visit only.
  }
}

/** Play the sounds and floaters for a batch of engine events. */
function handleEvents(state, events) {
  if (!events) return;
  for (const event of events) {
    if (event.type === 'play') {
      flashPlayed(event.card, event.name);
      sound.play();
    } else if (event.type === 'damage') {
      floater(event.name === 'Vex, the Ashen Warden' ? 'enemy' : 'player',
        event.blocked > 0 ? `-${event.amount} (${event.blocked} blocked)` : `-${event.amount}`, 'damage');
      sound.hit();
    } else if (event.type === 'melt') {
      sound.melt();
    } else if (event.type === 'heal') {
      floater(event.name === 'Vex, the Ashen Warden' ? 'enemy' : 'player', `+${event.amount}`, 'heal');
      sound.heal();
    } else if (event.type === 'ward') {
      sound.ward();
    } else if (event.type === 'draw') {
      sound.draw();
    } else if (event.type === 'poison') {
      floater(event.name === 'Vex, the Ashen Warden' ? 'enemy' : 'player', `-${event.amount} ☠`, 'damage');
      sound.hit();
    } else if (event.type === 'win') {
      sound.win();
    } else if (event.type === 'loss') {
      sound.loss();
    }
  }
}

if (shot) {
  // A staged scene for a screenshot: paint it twice, then signal ready.
  const state = stageShot(shot, seed);
  state.best = readBest();
  let painted = 0;
  function paint() {
    render(state);
    tickParticles();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  const state = createGame(createRandom(seed));
  state.best = readBest();
  let enemyTimer = null;

  function stopEnemy() {
    if (enemyTimer !== null) {
      window.clearInterval(enemyTimer);
      enemyTimer = null;
    }
  }

  function runEnemySteps() {
    enemyTimer = window.setInterval(() => {
      const events = enemyStep(state);
      handleEvents(state, events);
      render(state);
      if (events.some((e) => e.type === 'done') || state.screen !== 'play') {
        stopEnemy();
        if (state.screen === SCREEN_WIN) {
          if (state.best === 0 || state.stats.turns < state.best) {
            state.best = state.stats.turns;
            saveBest(state.best);
          }
          render(state);
        }
      }
    }, 750);
  }

  function startDuel() {
    stopEnemy();
    startGame(state);
    state.best = readBest();
    sound.turn();
    render(state);
  }

  createInput(app, {
    onPlayCard(index) {
      if (state.screen !== 'play' || state.phase !== 'player') return;
      const events = playCard(state, index);
      if (!events) {
        sound.click();
        return;
      }
      handleEvents(state, events);
      render(state);
      if (state.screen === SCREEN_WIN) {
        if (state.best === 0 || state.stats.turns < state.best) {
          state.best = state.stats.turns;
          saveBest(state.best);
        }
        render(state);
      }
    },
    onEndTurn() {
      if (state.screen !== 'play' || state.phase !== 'player') return;
      if (!endPlayerTurn(state)) return;
      sound.turn();
      render(state);
      runEnemySteps();
    },
    onStart() {
      startDuel();
    },
    onRestart() {
      startDuel();
    },
    onMute() {
      const muted = sound.toggleMute();
      const btn = app.querySelector('#mute-btn');
      if (btn) btn.textContent = muted ? '✕' : '♪';
    },
  });

  render(state);
  (function loop() {
    tickParticles();
    requestAnimationFrame(loop);
  })();
}
