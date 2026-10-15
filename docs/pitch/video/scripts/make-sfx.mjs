// Sound-effect palette for the voice-over cut (KnockFirstFilmVO). The original cut keeps make-audio.mjs's effects.
// The old set was nine dry sines/noises reused everywhere; this one gives every cue its own variant, tunes the UI
// sounds to the C-major soundtrack, uses modal (wood/marimba/bell) synthesis instead of bare sines, and puts it all
// in a small room reverb so nothing sounds bone-dry. Still fully synthesized: no samples, no licences.
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 48000;
const OUT = new URL("../public/audio/sfx/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const TAU = 2 * Math.PI;

function svf() {
  let low = 0;
  let band = 0;
  return (x, cutoff, q = 0.7, mode = "low") => {
    const f = 2 * Math.sin((Math.PI * clamp(cutoff, 20, SR / 6)) / SR);
    low += f * band;
    const high = x - low - (1 / q) * band;
    band += f * high;
    return mode === "low" ? low : mode === "band" ? band : high;
  };
}

/** Freeverb-style room: 8 damped combs + 4 allpasses per side, L/R spread for width. */
function room(l, r, { wet = 0.22, size = 0.78, damp = 0.35 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const fb = size * 0.28 + 0.7;
  const side = (x, spread) => {
    const y = new Float32Array(x.length);
    for (const d0 of combs) {
      const d = Math.round(((d0 + spread) * SR) / 44100);
      const buf = new Float32Array(d);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < x.length; i++) {
        const out = buf[idx];
        store = out * (1 - damp) + store * damp;
        buf[idx] = x[i] * 0.015 + store * fb;
        idx = (idx + 1) % d;
        y[i] += out;
      }
    }
    for (const d0 of aps) {
      const d = Math.round(((d0 + spread) * SR) / 44100);
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < y.length; i++) {
        const b = buf[idx];
        const v = -y[i] + b;
        buf[idx] = y[i] + b * 0.5;
        idx = (idx + 1) % d;
        y[i] = v;
      }
    }
    return y;
  };
  const wl = side(l, 0);
  const wr = side(r, 23);
  for (let i = 0; i < l.length; i++) {
    l[i] = l[i] * (1 - wet * 0.5) + wl[i] * wet * 3;
    r[i] = r[i] * (1 - wet * 0.5) + wr[i] * wet * 3;
  }
}

function writeWav(path, l, r) {
  let peak = 0;
  for (let i = 0; i < l.length; i++) {
    l[i] = Math.tanh(l[i] * 1.1);
    r[i] = Math.tanh(r[i] * 1.1);
    peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  }
  const g = peak > 0 ? 0.89 / peak : 1;
  const n = l.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(clamp(l[i] * g, -1, 1) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(clamp(r[i] * g, -1, 1) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}

/** Render one effect: fn(put) adds samples, then optional room, a 4 ms fade-out, write. */
function make(name, seconds, fn, verb) {
  const n = Math.floor(seconds * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  const put = (i, v, pan = 0) => {
    if (i < 0 || i >= n) return;
    l[i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
    r[i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
  };
  fn(put, n);
  if (verb) room(l, r, verb);
  const fade = Math.floor(0.004 * SR);
  for (let i = 0; i < fade; i++) {
    l[n - 1 - i] *= i / fade;
    r[n - 1 - i] *= i / fade;
  }
  writeWav(OUT + name + ".wav", l, r);
  console.log("sfx", name);
}

// ---------- voices ----------
/** Struck wood: a few inharmonic modes with their own decays + a band-passed contact click. */
function wood(put, t0, { f0 = 180, gain = 1, pan = 0, bright = 1 } = {}) {
  const s = Math.floor(t0 * SR);
  const modes = [
    [1, 1, 38],
    [2.32, 0.55, 55],
    [3.86, 0.3 * bright, 80],
    [6.1, 0.16 * bright, 120],
  ];
  const f = svf();
  const ph = modes.map(() => rnd() * Math.PI);
  for (let i = 0; i < 0.35 * SR; i++) {
    const t = i / SR;
    let v = 0;
    modes.forEach(([ratio, amp, dec], k) => (v += Math.sin(TAU * f0 * ratio * t + ph[k]) * amp * Math.exp(-t * dec)));
    v += f(rnd(), 1800 * bright, 1.6, "band") * Math.exp(-t * 260) * 1.8;
    put(s + i, v * gain, pan);
  }
}

/** Marimba-like mallet: partials 1 / 3.93 / 9.2, soft felt attack. */
function mallet(put, t0, midi, { gain = 1, pan = 0, decay = 7 } = {}) {
  const s = Math.floor(t0 * SR);
  const fr = mtof(midi);
  for (let i = 0; i < 1.2 * SR; i++) {
    const t = i / SR;
    const att = Math.min(1, t / 0.002);
    const v =
      Math.sin(TAU * fr * t) * Math.exp(-t * decay) +
      0.32 * Math.sin(TAU * fr * 3.93 * t) * Math.exp(-t * decay * 3) +
      0.08 * Math.sin(TAU * fr * 9.2 * t) * Math.exp(-t * decay * 7);
    put(s + i, v * att * gain * 0.6, pan);
  }
}

/** FM bell: inharmonic modulator, index decays so it starts metallic and settles pure. */
function bell(put, t0, midi, { gain = 1, pan = 0, len = 2.6, ratio = 1.41 } = {}) {
  const s = Math.floor(t0 * SR);
  const fr = mtof(midi);
  for (let i = 0; i < len * SR; i++) {
    const t = i / SR;
    const idx = 2.4 * Math.exp(-t * 3);
    const v = Math.sin(TAU * fr * t + idx * Math.sin(TAU * fr * ratio * t)) * Math.exp(-t * (3 / len)) * Math.min(1, t / 0.003);
    put(s + i, v * gain * 0.5, pan);
  }
}

/** Filtered-noise pass-by: cutoff and pan follow the same curve, asymmetric (swells in, cuts off). */
function air(put, t0, dur, { lo = 300, hi = 5000, panFrom = -0.8, panTo = 0.8, q = 1.2, gain = 1, body = 0.4, peak = 0.62 } = {}) {
  const s = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  const fa = svf();
  const fb = svf();
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const env = k < peak ? (k / peak) ** 2 : ((1 - k) / (1 - peak)) ** 1.4;
    const cut = lo + (hi - lo) * env;
    const x = rnd();
    const v = fa(x, cut, q, "band") + fb(x, 140 + 260 * env, 0.8, "low") * body;
    put(s + i, v * env * gain, panFrom + (panTo - panFrom) * k);
  }
}

/** Sub drop + cracked transient: the "hit" family. */
function boom(put, t0, { f0 = 42, sweep = 95, len = 1.4, crack = 0.6, gain = 1 } = {}) {
  const s = Math.floor(t0 * SR);
  const f = svf();
  let ph = 0;
  for (let i = 0; i < len * SR; i++) {
    const t = i / SR;
    ph += (TAU * (f0 + sweep * Math.exp(-t * 11))) / SR;
    const v = Math.sin(ph) * Math.exp(-t * (3.2 / len)) + f(rnd(), 3200, 0.6, "low") * Math.exp(-t * 18) * crack;
    put(s + i, v * gain);
  }
}

/** Glass-screen tap: tiny high click + soft finger thump. */
function tapAt(put, t0, { bright = 5200, gain = 1, pan = 0 } = {}) {
  const s = Math.floor(t0 * SR);
  const f = svf();
  for (let i = 0; i < 0.06 * SR; i++) {
    const t = i / SR;
    const v = f(rnd(), bright, 2.2, "band") * Math.exp(-t * 520) * 1.6 + Math.sin(TAU * 170 * t) * Math.exp(-t * 90) * 0.5;
    put(s + i, v * gain, pan);
  }
}

/** Bubble pop tuned to a note: fast upward blip that settles on pitch. */
function popAt(put, t0, midi, { gain = 1, pan = 0, decay = 22 } = {}) {
  const s = Math.floor(t0 * SR);
  const fr = mtof(midi);
  let ph = 0;
  for (let i = 0; i < 0.3 * SR; i++) {
    const t = i / SR;
    ph += (TAU * fr * (0.55 + 0.45 * (1 - Math.exp(-t * 90)))) / SR;
    const v = (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * Math.exp(-t * decay) * Math.min(1, t / 0.0015);
    put(s + i, v * gain, pan);
  }
}

// ---------- the palette ----------
const ROOM = { wet: 0.2, size: 0.72, damp: 0.4 };
const HALL = { wet: 0.32, size: 0.86, damp: 0.3 };

// hits
make("boom-open", 2.2, (put) => boom(put, 0, { f0: 38, sweep: 110, len: 1.8, crack: 0.7 }), HALL);
make("boom-who", 1.6, (put) => boom(put, 0, { f0: 48, sweep: 80, len: 1.2, crack: 0.45 }), ROOM);
make("slam", 2.0, (put) => {
  boom(put, 0, { f0: 45, sweep: 120, len: 1.3, crack: 1 });
  wood(put, 0, { f0: 120, gain: 0.9, bright: 0.7 });
}, HALL);
make("boom-end", 2.6, (put) => boom(put, 0, { f0: 36, sweep: 70, len: 2.2, crack: 0.35 }), HALL);

// scam phrases: six dull "stamp" hits, a semitone higher each time → pressure builds
[0, 1, 2, 3, 4, 5].forEach((k) =>
  make(`phrase-${k + 1}`, 0.6, (put) => {
    wood(put, 0, { f0: 140 * 2 ** (k / 12), gain: 0.9, bright: 0.6 + k * 0.08, pan: k % 2 ? 0.35 : -0.35 });
    boom(put, 0, { f0: 70 + k * 4, sweep: 40, len: 0.25, crack: 0.25, gain: 0.5 });
  }, ROOM),
);

// door knocks (hallway): two knocks, and three softer ones for the ending
make("knock-two", 1.4, (put) => {
  wood(put, 0, { f0: 172, gain: 1 });
  wood(put, 0.17, { f0: 168, gain: 0.85, bright: 0.9 });
}, HALL);
make("knock-three", 1.6, (put) => {
  wood(put, 0, { f0: 176, gain: 0.8 });
  wood(put, 0.15, { f0: 170, gain: 0.7, bright: 0.9 });
  wood(put, 0.31, { f0: 174, gain: 0.9 });
}, HALL);

// pass-bys: each one a different length, direction and colour
make("whoosh-hook", 0.8, (put) => air(put, 0, 0.75, { lo: 250, hi: 6000, panFrom: -0.9, panTo: 0.9 }), ROOM);
make("whoosh-big", 1.2, (put) => air(put, 0, 1.1, { lo: 120, hi: 4200, panFrom: 0.6, panTo: -0.6, q: 0.9, body: 0.9, peak: 0.8 }), HALL);
make("whoosh-up", 0.7, (put) => air(put, 0, 0.6, { lo: 500, hi: 7000, panFrom: -0.4, panTo: 0.6, q: 1.6, body: 0.2 }), ROOM);
make("whoosh-down", 0.8, (put) => air(put, 0, 0.7, { lo: 200, hi: 3800, panFrom: 0.8, panTo: -0.5, q: 1.1, body: 0.6, peak: 0.4 }), ROOM);
make("whoosh-soft", 0.6, (put) => air(put, 0, 0.5, { lo: 400, hi: 3000, panFrom: -0.3, panTo: 0.3, q: 0.8, gain: 0.8, body: 0.3 }), ROOM);
make("whoosh-wipe", 0.7, (put) => air(put, 0, 0.6, { lo: 300, hi: 5200, panFrom: 0.9, panTo: -0.9, q: 1.3, body: 0.5, peak: 0.7 }), ROOM);
make("swish-1", 0.45, (put) => air(put, 0, 0.32, { lo: 1200, hi: 7500, panFrom: -0.5, panTo: 0.5, q: 1.8, body: 0, peak: 0.75 }), ROOM);
make("swish-2", 0.45, (put) => air(put, 0, 0.28, { lo: 900, hi: 6000, panFrom: 0.5, panTo: -0.3, q: 1.4, body: 0.1, peak: 0.65 }), ROOM);

// pops tuned to the soundtrack (C major pentatonic), so a run of them plays a little rising figure
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];
PENTA.forEach((m, k) => make(`pop-${k + 1}`, 0.5, (put) => popAt(put, 0, m, { decay: 18 + k * 2, pan: [-0.3, 0.3, 0][k % 3] }), ROOM));

// screen taps
make("tap-1", 0.35, (put) => tapAt(put, 0, { bright: 5200 }), ROOM);
make("tap-2", 0.35, (put) => tapAt(put, 0, { bright: 4300, pan: 0.2 }), ROOM);
make("tap-3", 0.35, (put) => tapAt(put, 0, { bright: 6200, pan: -0.2 }), ROOM);

// notifications: three different two-note mallet figures
make("notify-1", 1.3, (put) => { mallet(put, 0, 88); mallet(put, 0.09, 93, { gain: 0.8 }); }, ROOM);
make("notify-2", 1.3, (put) => { mallet(put, 0, 84, { pan: -0.3 }); mallet(put, 0.08, 91, { gain: 0.8, pan: -0.3 }); }, ROOM);
make("notify-3", 1.3, (put) => { mallet(put, 0, 86, { pan: 0.3 }); mallet(put, 0.08, 93, { gain: 0.8, pan: 0.3 }); }, ROOM);

// brand reveal + ending bells
make("bell-brand", 3.0, (put) => { bell(put, 0, 79, { gain: 0.8, pan: -0.2 }); bell(put, 0.12, 84, { pan: 0.2 }); }, HALL);
make("bell-end", 3.6, (put) => [72, 76, 79, 84].forEach((m, j) => bell(put, j * 0.05, m, { gain: 0.6, pan: j % 2 ? 0.35 : -0.35, len: 3.2 })), HALL);

// the AI types its question: soft, irregular key clicks
make("typing", 1.8, (put) => {
  let t = 0;
  while (t < 1.5) {
    tapAt(put, t, { bright: 2600 + rnd() * 1600, gain: 0.4 + rnd() * 0.15, pan: rnd() * 0.3 });
    t += 0.055 + Math.abs(rnd()) * 0.07;
  }
}, ROOM);

// risk score counting up: accelerating ticks climbing in pitch, landing on a warning dyad
make("score-rise", 1.5, (put) => {
  let t = 0;
  let k = 0;
  while (t < 1.32) {
    popAt(put, t, 72 + k * 0.9, { gain: 0.45, decay: 60, pan: k % 2 ? 0.2 : -0.2 });
    t += Math.max(0.035, 0.12 * Math.exp(-k * 0.09));
    k++;
  }
}, ROOM);
make("alert", 1.4, (put) => {
  [0, 0.16].forEach((o) => {
    mallet(put, o, 69, { gain: 0.9, decay: 9 });
    mallet(put, o, 70, { gain: 0.7, decay: 9 });
  });
  boom(put, 0, { f0: 55, sweep: 50, len: 0.6, crack: 0.2, gain: 0.6 });
}, ROOM);

// six red flags landing: quick minor-key wood blocks
[81, 84, 86, 88, 91, 93].forEach((m, k) =>
  make(`flag-${k + 1}`, 0.5, (put) => mallet(put, 0, m - 12, { gain: 0.9, decay: 14, pan: k % 2 ? 0.4 : -0.4 }), ROOM),
);

// Blocked: rubber stamp on paper. Allowed: a warm rising major arpeggio.
make("stamp", 1.4, (put) => {
  boom(put, 0, { f0: 62, sweep: 60, len: 0.45, crack: 1.2 });
  wood(put, 0.004, { f0: 95, gain: 0.8, bright: 0.5 });
}, ROOM);
make("success", 1.8, (put) => [72, 76, 79, 84].forEach((m, j) => mallet(put, j * 0.06, m + 12, { gain: 0.8 - j * 0.08, pan: -0.3 + j * 0.2 })), ROOM);

// phones landing on a table, three weights
[0, 1, 2].forEach((k) => make(`land-${k + 1}`, 0.6, (put) => wood(put, 0, { f0: 85 + k * 18, gain: 0.8, bright: 0.45, pan: [-0.5, 0.5, 0][k] }), ROOM));

// word swaps on the beat
make("word-1", 0.6, (put) => { wood(put, 0, { f0: 330, bright: 1.2 }); popAt(put, 0, 79, { gain: 0.3 }); }, ROOM);
make("word-2", 0.6, (put) => { wood(put, 0, { f0: 262, bright: 1.1 }); popAt(put, 0, 76, { gain: 0.3 }); }, ROOM);
make("word-3", 0.6, (put) => { wood(put, 0, { f0: 294, bright: 1 }); popAt(put, 0, 84, { gain: 0.3 }); }, ROOM);
