// Emberfall's own sounds: tiny WebAudio bleeps, no audio files. One file,
// one job: every sound the game makes, each a few lines of oscillator.

let ctx = null;
let muted = false;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, when = 0) {
  const ac = audio();
  if (!ac || muted) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, gain, when = 0) {
  const ac = audio();
  if (!ac || muted) return;
  const t = ac.currentTime + when;
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.connect(filter);
  filter.connect(amp);
  amp.connect(ac.destination);
  src.start(t);
}

export const sound = {
  click() { tone(660, 0.06, 'square', 0.05); },
  play() { tone(392, 0.1, 'triangle', 0.12); tone(523, 0.12, 'triangle', 0.1, 0.06); },
  hit() { noise(0.18, 0.22); tone(140, 0.16, 'sawtooth', 0.1); },
  melt() { tone(880, 0.1, 'sine', 0.12); tone(1174, 0.14, 'sine', 0.12, 0.07); tone(1568, 0.18, 'sine', 0.1, 0.14); },
  heal() { tone(523, 0.12, 'sine', 0.1); tone(659, 0.16, 'sine', 0.1, 0.08); },
  ward() { tone(330, 0.14, 'triangle', 0.1); tone(440, 0.14, 'triangle', 0.08, 0.08); },
  draw() { tone(587, 0.05, 'square', 0.05); tone(740, 0.05, 'square', 0.05, 0.05); },
  turn() { tone(494, 0.08, 'triangle', 0.08); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11)); },
  loss() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, 'sawtooth', 0.07, i * 0.13)); },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() { return muted; },
};
