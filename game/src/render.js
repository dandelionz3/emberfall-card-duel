// The table: everything the player sees. One file, one job: turn the engine's
// state into DOM — fighters, hands, intent, log, overlays and the ember
// particles — and animate the moments that matter (a played card, a hit).

import { ELEMENTS, ENEMY_NAME, PLAYER_NAME } from './config.js';
import { cardDef } from './deck.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './state.js';

let app = null;
let fx = null;
let fxCtx = null;
let particles = [];
let lastHp = { player: 30, enemy: 30 };

/** Build the table's skeleton once, inside #app. */
export function createRenderer(root) {
  app = root;
  root.innerHTML = `
    <canvas id="fx"></canvas>
    <div id="table">
      <header id="topbar">
        <div class="game-title">EMBERFALL</div>
        <div id="turn-banner">Duel of the Ember Mages</div>
        <div class="top-actions">
          <button id="mute-btn" class="small-btn" title="Sound on/off">♪</button>
          <button id="restart-btn" class="small-btn" title="Restart duel">↻</button>
        </div>
      </header>
      <section id="enemy-area">
        <div class="fighter" id="enemy-fighter">
          <div class="portrait enemy-portrait">V</div>
          <div class="fighter-info">
            <div class="fighter-name">${ENEMY_NAME}</div>
            <div class="hpbar"><div class="hpfill enemy-fill" id="enemy-hpfill"></div><span class="hptext" id="enemy-hptext"></span></div>
            <div class="status-line" id="enemy-status"></div>
          </div>
        </div>
        <div id="enemy-hand" class="hand enemy-hand"></div>
        <div id="intent" class="intent"></div>
      </section>
      <section id="mid-area">
        <div id="log"></div>
        <div id="played-slot"></div>
      </section>
      <section id="player-area">
        <div id="player-hand" class="hand player-hand"></div>
        <div class="fighter-row">
          <div class="fighter" id="player-fighter">
            <div class="portrait player-portrait">E</div>
            <div class="fighter-info">
              <div class="fighter-name">${PLAYER_NAME} — you</div>
              <div class="hpbar"><div class="hpfill player-fill" id="player-hpfill"></div><span class="hptext" id="player-hptext"></span></div>
              <div class="status-line" id="player-status"></div>
            </div>
          </div>
          <div id="ember-box">
            <div class="ember-label">EMBER</div>
            <div id="ember-pips" class="ember-pips"></div>
          </div>
          <button id="end-turn-btn" class="end-turn">END TURN ⏎</button>
        </div>
      </section>
    </div>
    <div id="overlay"></div>
    <div id="floaters"></div>`;
  fx = root.querySelector('#fx');
  fx.width = 1280;
  fx.height = 800;
  fxCtx = fx.getContext('2d');
  return { root };
}

function statusBadges(fighter) {
  const parts = [];
  if (fighter.ward > 0) parts.push(`<span class="badge ward-badge">🛡 ${fighter.ward} ward</span>`);
  if (fighter.chilled) parts.push(`<span class="badge chill-badge">❄ Chilled</span>`);
  if (fighter.poison > 0) parts.push(`<span class="badge poison-badge">☠ Poison ${fighter.poison}</span>`);
  return parts.join(' ');
}

/** One card face: cost, element shape+colour, name, art glyph, rules text and
 * the big damage number. Legible at thumbnail size. */
export function cardElement(cardId, opts = {}) {
  const card = cardDef(cardId);
  const el = ELEMENTS[card.element];
  const div = document.createElement('div');
  div.className = `card el-${card.element}${opts.back ? ' card-back' : ''}${opts.small ? ' small' : ''}`;
  if (opts.back) {
    div.innerHTML = `<div class="card-back-glyph">🔥</div>`;
    return div;
  }
  const big = card.damage ? `<div class="card-damage">${card.damage}${card.meltBonus ? '<span class="melt-note">+3 melt</span>' : ''}</div>` : '';
  div.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <div class="card-element" style="color:${el.color}">${el.shape}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-art" style="color:${el.color}; text-shadow: 0 0 18px ${el.glow}">${el.shape}</div>
    <div class="card-text">${card.text}</div>
    ${big}`;
  if (opts.index !== undefined) div.dataset.index = String(opts.index);
  if (opts.playable === false) div.classList.add('unplayable');
  return div;
}

/** Paint the whole table from the state. Cheap and complete: hands rebuild,
 * bars animate by CSS, the log keeps its last lines. */
export function render(state) {
  const player = state.player;
  const enemy = state.enemy;
  const setHp = (fillId, textId, fighter, key) => {
    const fill = app.querySelector(fillId);
    const text = app.querySelector(textId);
    const pct = Math.max(0, (fighter.hp / fighter.maxHp) * 100);
    fill.style.width = `${pct}%`;
    text.textContent = `${fighter.hp} / ${fighter.maxHp}`;
    if (fighter.hp < lastHp[key]) {
      fill.parentElement.classList.remove('hp-shake');
      void fill.parentElement.offsetWidth;
      fill.parentElement.classList.add('hp-shake');
    }
    lastHp[key] = fighter.hp;
  };
  setHp('#player-hpfill', '#player-hptext', player, 'player');
  setHp('#enemy-hpfill', '#enemy-hptext', enemy, 'enemy');
  app.querySelector('#player-status').innerHTML = statusBadges(player);
  app.querySelector('#enemy-status').innerHTML = statusBadges(enemy);

  const turnBanner = app.querySelector('#turn-banner');
  turnBanner.textContent = state.screen === SCREEN_PLAY
    ? (state.phase === 'player' ? `Turn ${state.turn} — your move` : `Turn ${state.turn} — ${ENEMY_NAME} plays…`)
    : 'Duel of the Ember Mages';

  const intent = app.querySelector('#intent');
  if (state.intent && state.screen === SCREEN_PLAY && state.phase === 'player') {
    const card = cardDef(state.intent);
    const el = ELEMENTS[card.element];
    intent.innerHTML = `<span class="intent-label">VEX INTENDS</span> <span style="color:${el.color}">${el.shape}</span> <b>${card.name}</b> — ${card.text}`;
    intent.classList.add('show');
  } else {
    intent.classList.remove('show');
    intent.innerHTML = '';
  }

  const enemyHand = app.querySelector('#enemy-hand');
  enemyHand.innerHTML = '';
  enemy.hand.forEach(() => enemyHand.appendChild(cardElement('ember-bolt', { back: true, small: true })));

  const playerHand = app.querySelector('#player-hand');
  playerHand.innerHTML = '';
  player.hand.forEach((cardId, index) => {
    const card = cardDef(cardId);
    const playable = state.screen === SCREEN_PLAY && state.phase === 'player' && player.ember >= card.cost;
    playerHand.appendChild(cardElement(cardId, { index, playable }));
  });

  const pips = app.querySelector('#ember-pips');
  pips.innerHTML = '';
  for (let i = 0; i < player.maxEmber; i += 1) {
    const pip = document.createElement('span');
    pip.className = `ember-pip${i < player.ember ? ' lit' : ''}`;
    pip.textContent = '●';
    pips.appendChild(pip);
  }

  const endBtn = app.querySelector('#end-turn-btn');
  endBtn.disabled = !(state.screen === SCREEN_PLAY && state.phase === 'player');

  const log = app.querySelector('#log');
  log.innerHTML = state.log.slice(-4).map((line) => `<div>${line}</div>`).join('');

  renderOverlay(state);
}

/** The title, victory and defeat screens over the table. */
function renderOverlay(state) {
  const overlay = app.querySelector('#overlay');
  if (state.screen === SCREEN_TITLE) {
    overlay.className = 'overlay show';
    overlay.innerHTML = `
      <div class="panel title-panel">
        <div class="logo">EMBERFALL</div>
        <div class="tagline">A duel of ember mages — outwit Vex, the Ashen Warden.</div>
        <div class="rules">
          <div>🔥 Play cards with ember. Ember refills and grows each turn.</div>
          <div>❄ Chill Vex, then strike with Flame to <b>Melt</b> for +3.</div>
          <div>☠ Thorn cards poison. Ward blocks damage. Read Vex's intent and counter it.</div>
          <div>First mage to 0 health loses. Click a card to play it, END TURN when done.</div>
        </div>
        <button id="start-btn" class="big-btn">BEGIN THE DUEL</button>
        ${state.best > 0 ? `<div class="best-line">Best: won in ${state.best} turns</div>` : ''}
      </div>`;
    return;
  }
  if (state.screen === SCREEN_WIN) {
    overlay.className = 'overlay show';
    overlay.innerHTML = `
      <div class="panel win-panel">
        <div class="end-title win">VICTORY</div>
        <div class="end-sub">Vex, the Ashen Warden, falls. The embers are yours.</div>
        <div class="end-stats">Won in ${state.stats.turns} turns · ${state.stats.cardsPlayed} cards played · ${state.stats.damageDealt} damage dealt</div>
        <button id="again-btn" class="big-btn">DUEL AGAIN</button>
      </div>`;
    burst();
    return;
  }
  if (state.screen === SCREEN_LOSS) {
    overlay.className = 'overlay show';
    overlay.innerHTML = `
      <div class="panel loss-panel">
        <div class="end-title loss">DEFEAT</div>
        <div class="end-sub">Vex stands over the cold ashes. The embers demand a rematch.</div>
        <div class="end-stats">Survived ${state.stats.turns} turns · ${state.stats.cardsPlayed} cards played · ${state.stats.damageDealt} damage dealt</div>
        <button id="again-btn" class="big-btn">TRY AGAIN</button>
      </div>`;
    return;
  }
  overlay.className = 'overlay';
  overlay.innerHTML = '';
}

/** Show a played card in the middle of the table, briefly. */
export function flashPlayed(cardId, name) {
  const slot = app.querySelector('#played-slot');
  slot.innerHTML = '';
  const el = cardElement(cardId, { small: true });
  el.classList.add('played-flash');
  slot.appendChild(el);
  const label = document.createElement('div');
  label.className = 'played-label';
  label.textContent = `${name} plays ${cardDef(cardId).name}`;
  slot.appendChild(label);
  window.setTimeout(() => { slot.innerHTML = ''; }, 1100);
}

/** A floating damage (or heal) number over a fighter. */
export function floater(target, text, kind) {
  const box = app.querySelector('#floaters');
  const anchor = target === 'enemy' ? '#enemy-fighter' : '#player-fighter';
  const rect = app.querySelector(anchor).getBoundingClientRect();
  const appRect = app.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = `floater ${kind}`;
  div.textContent = text;
  div.style.left = `${rect.left - appRect.left + rect.width / 2}px`;
  div.style.top = `${rect.top - appRect.top + 10}px`;
  box.appendChild(div);
  window.setTimeout(() => div.remove(), 1300);
}

/** Ember particles: ambient drift, and a burst on victory. */
export function spawnEmber(x, y, n, spread) {
  for (let i = 0; i < n; i += 1) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: -(0.4 + Math.random() * 1.2),
      life: 1, decay: 0.008 + Math.random() * 0.012,
      size: 2 + Math.random() * 4,
      color: Math.random() < 0.5 ? '#ff9a3c' : '#ff6b35',
    });
  }
}

export function burst() {
  spawnEmber(640, 420, 90, 6);
}

export function tickParticles() {
  if (!fxCtx) return;
  fxCtx.clearRect(0, 0, 1280, 800);
  if (particles.length < 24 && Math.random() < 0.3) {
    spawnEmber(60 + Math.random() * 1160, 800, 1, 0.2);
  }
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= 0.01;
    p.life -= p.decay;
    fxCtx.globalAlpha = Math.max(0, p.life);
    fxCtx.fillStyle = p.color;
    fxCtx.beginPath();
    fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    fxCtx.fill();
  }
  fxCtx.globalAlpha = 1;
}

export function getApp() {
  return app;
}
