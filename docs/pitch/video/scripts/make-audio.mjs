// Synthesizes the film's soundtrack + sound effects (no samples, no licences).
// 120 BPM: 1 beat = 0.5 s = 15 frames at 30 fps. Section starts line up with the scene cuts in src/timing.ts.
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 48000;
const OUT = new URL("../public/audio/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// SLOW=1.2 node scripts/make-audio.mjs → music-slow.wav only (100 BPM, 72 s) for the slowed voice-over cut.
const SLOW = Number(process.env.SLOW || 1);
const BEAT = 0.5 * SLOW;
const DUR = 60 * SLOW;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

// ---------- helpers ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function add(buf, i, v) {
  if (i >= 0 && i < buf.length) buf[i] += v;
}
function addStereo(i, v, pan = 0) {
  add(L, i, v * Math.cos(((pan + 1) * Math.PI) / 4));
  add(R, i, v * Math.sin(((pan + 1) * Math.PI) / 4));
}

/** Chamberlin state-variable filter; returns a stepping function. */
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

// Sidechain envelope from the kicks (filled as kicks are placed).
const duck = new Float32Array(N).fill(1);
function sidechain(t0, depth = 0.55, len = 0.32) {
  const s = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR; i++) {
    const k = i / (len * SR);
    const g = 1 - depth * (1 - k) ** 2;
    if (s + i < N) duck[s + i] = Math.min(duck[s + i], g);
  }
}

// ---------- instruments ----------
function kick(t0, gain = 0.9) {
  const s = Math.floor(t0 * SR);
  let ph = 0;
  for (let i = 0; i < 0.45 * SR; i++) {
    const t = i / SR;
    const f = 45 + 110 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-t * 7.5);
    const click = i < 200 ? rnd() * (1 - i / 200) * 0.25 : 0;
    addStereo(s + i, (Math.sin(ph) * env + click) * gain, 0);
  }
  sidechain(t0);
}

function clap(t0, gain = 0.35) {
  const s = Math.floor(t0 * SR);
  const f = svf();
  for (let i = 0; i < 0.3 * SR; i++) {
    const t = i / SR;
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 180) : 0), 0);
    const env = bursts * 0.6 + Math.exp(-t * 16) * 0.5;
    const v = f(rnd(), 1400, 1.6, "band") * env * gain * 2.2;
    addStereo(s + i, v, 0.05);
  }
}

function hat(t0, gain = 0.09, decay = 45, pan = 0.25) {
  const s = Math.floor(t0 * SR);
  const f = svf();
  for (let i = 0; i < (6 / decay) * SR; i++) {
    const t = i / SR;
    const v = f(rnd(), 9000, 0.8, "high") * Math.exp(-t * decay) * gain;
    addStereo(s + i, v, pan);
  }
}

function shaker(t0, gain = 0.05) {
  hat(t0, gain, 70, -0.35);
}

function bass(t0, dur, midi, gain = 0.32) {
  const s = Math.floor(t0 * SR);
  const f = svf();
  const fr = mtof(midi);
  let ph = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    ph = (ph + fr / SR) % 1;
    const saw = 2 * ph - 1;
    const sq = ph < 0.5 ? 1 : -1;
    const env = Math.min(1, t * 400) * Math.exp(-t * 2.2) * Math.min(1, (dur - t) * 60);
    const cut = 180 + 900 * Math.exp(-t * 14);
    const v = f(saw * 0.6 + sq * 0.4, cut, 1.2) * env * gain;
    add(L, s + i, v * duck[s + i]);
    add(R, s + i, v * duck[s + i]);
  }
}

function pad(t0, dur, notes, gain = 0.05, cutoff = 1500) {
  const s = Math.floor(t0 * SR);
  const voices = notes.flatMap((m) => [
    { fr: mtof(m) * 1.004, ph: Math.random(), pan: -0.5, f: svf() },
    { fr: mtof(m) * 0.996, ph: Math.random(), pan: 0.5, f: svf() },
  ]);
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.25) * Math.min(1, (dur - t) / 0.3);
    for (const v of voices) {
      v.ph = (v.ph + v.fr / SR) % 1;
      const x = v.f(2 * v.ph - 1, cutoff * (0.8 + 0.2 * Math.sin(t * 1.3)), 0.8) * env * gain;
      addStereo(s + i, x * duck[s + i], v.pan);
    }
  }
}

/** Marimba-like pluck (sine + inharmonic partial), playful and clean. */
function pluck(t0, midi, gain = 0.16, pan = 0, decay = 9) {
  const s = Math.floor(t0 * SR);
  const fr = mtof(midi);
  for (let i = 0; i < 0.9 * SR; i++) {
    const t = i / SR;
    const v =
      (Math.sin(2 * Math.PI * fr * t) * Math.exp(-t * decay) +
        0.35 * Math.sin(2 * Math.PI * fr * 3.99 * t) * Math.exp(-t * decay * 3.5) +
        0.15 * Math.sin(2 * Math.PI * fr * 2 * t) * Math.exp(-t * decay * 1.5)) *
      Math.min(1, t * 2000) *
      gain;
    addStereo(s + i, v, pan);
    // simple dotted-eighth echo
    addStereo(s + i + Math.floor(0.375 * SR), v * 0.28, -pan);
    addStereo(s + i + Math.floor(0.75 * SR), v * 0.1, pan);
  }
}

function riser(t0, dur, gain = 0.12) {
  const s = Math.floor(t0 * SR);
  const f = svf();
  for (let i = 0; i < dur * SR; i++) {
    const k = i / (dur * SR);
    const v = f(rnd(), 300 + 7000 * k * k, 2.5, "band") * k * k * gain * 2;
    addStereo(s + i, v, Math.sin(k * 12) * 0.3);
  }
}

function crash(t0, gain = 0.12, len = 2.5) {
  const s = Math.floor(t0 * SR);
  const f = svf();
  for (let i = 0; i < len * SR; i++) {
    const t = i / SR;
    addStereo(s + i, f(rnd(), 5000, 0.6, "high") * Math.exp(-t * 2.2) * gain, rnd() * 0.3);
  }
}

function sub(t0, gain = 0.6) {
  const s = Math.floor(t0 * SR);
  let ph = 0;
  for (let i = 0; i < 1.6 * SR; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (38 + 60 * Math.exp(-t * 6))) / SR;
    addStereo(s + i, Math.sin(ph) * Math.exp(-t * 2.4) * gain, 0);
  }
}

// ---------- arrangement ----------
// chords as MIDI notes (root for bass = first note - 24)
const C = [60, 64, 67];
const G = [59, 62, 67];
const Am = [57, 60, 64];
const F = [57, 60, 65];
const Dm = [57, 62, 65];
const E = [56, 59, 64];
const Fmaj7 = [57, 60, 64, 65];
const BRIGHT = [C, G, Am, F];
const TENSE = [Am, F, Dm, E];
const ROOT = new Map([[C, 36], [G, 31], [Am, 33], [F, 29], [Dm, 38 - 12], [E, 28], [Fmaj7, 29]]);

const sections = [
  { from: 0, to: 14, prog: BRIGHT, kick: "four", clap: true, hats: "8", arp: "hook", bass: true, pad: 0.035 },
  { from: 14, to: 30, prog: TENSE, kick: "half", clap: false, hats: "16", arp: "tense", bass: true, pad: 0.04, riser: [26, 4] },
  { from: 30, to: 44, prog: BRIGHT, kick: "four", clap: true, hats: "8", arp: "hook", bass: true, pad: 0.05, crash: true },
  { from: 44, to: 76, prog: BRIGHT, kick: "four", clap: true, hats: "16", arp: "light", bass: true, pad: 0.04, crashEvery: 16 },
  { from: 76, to: 100, prog: BRIGHT, kick: "four", clap: true, hats: "16open", arp: "hook", bass: true, pad: 0.05, crashEvery: 8, riser: [96, 4] },
  { from: 100, to: 110, prog: [Fmaj7, C, Fmaj7], kick: "none", clap: false, hats: "none", arp: "soft", bass: false, pad: 0.06, riser: [106, 4], crash: true },
  { from: 110, to: 116, prog: BRIGHT, kick: "four", clap: true, hats: "16open", arp: "hook", bass: true, pad: 0.05, crash: true },
];

const t = (b) => b * BEAT;

for (const sec of sections) {
  const len = sec.to - sec.from;
  // kicks first (they write the sidechain used by bass/pads)
  for (let b = 0; b < len; b++) {
    const at = sec.from + b;
    if (sec.kick === "four") kick(t(at));
    if (sec.kick === "half" && b % 4 === 0) kick(t(at), 0.8);
    if (sec.kick === "half" && b % 4 === 2) kick(t(at + 0.5), 0.55);
  }
}

for (const sec of sections) {
  const len = sec.to - sec.from;
  if (sec.crash) crash(t(sec.from));
  if (sec.riser) riser(t(sec.riser[0]), t(sec.riser[1]));
  for (let b = 0; b < len; b++) {
    const at = sec.from + b;
    const chord = sec.prog[Math.floor(b / 4) % sec.prog.length];
    if (sec.crashEvery && b > 0 && b % sec.crashEvery === 0) crash(t(at), 0.07, 1.5);
    if (b % 4 === 0) pad(t(at), Math.min(4, len - b) * BEAT, chord.map((m) => m - 12).concat(chord), sec.pad);
    if (sec.clap && b % 2 === 1) clap(t(at));
    if (sec.hats === "8") hat(t(at + 0.5));
    if (sec.hats === "16" || sec.hats === "16open") {
      for (let k = 0; k < 4; k++) (k === 2 ? hat : shaker)(t(at + k / 4), k === 2 ? 0.1 : 0.05);
    }
    if (sec.hats === "16open") hat(t(at + 0.5), 0.06, 9, -0.2);
    if (sec.bass) {
      const root = ROOT.get(chord) ?? 36;
      bass(t(at + 0.5), BEAT * 0.45, root, 0.3);
      if (b % 2 === 0) bass(t(at), BEAT * 0.3, root, 0.22);
    }
    const tones = chord.concat(chord.map((m) => m + 12));
    if (sec.arp === "hook") {
      [0, 2, 1, 3].forEach((k, j) => pluck(t(at + j / 4), tones[(k + b) % tones.length] + 12, j === 0 ? 0.15 : 0.1, j % 2 ? 0.4 : -0.4));
    }
    if (sec.arp === "tense") {
      pluck(t(at), tones[b % 3] + 12, 0.12, -0.3, 14);
      pluck(t(at + 0.5), tones[(b + 1) % 3] + 24, 0.07, 0.3, 14);
    }
    if (sec.arp === "light" && b % 2 === 0) {
      pluck(t(at), tones[b % tones.length] + 12, 0.12, -0.3);
      pluck(t(at + 0.75), tones[(b + 2) % tones.length] + 12, 0.08, 0.3);
    }
    if (sec.arp === "soft") pluck(t(at), tones[b % tones.length] + 12, 0.1, b % 2 ? 0.3 : -0.3, 4);
  }
}

// final stinger on beat 116 (58 s): big chord, sub, crash, long tail
kick(t(116), 1);
sub(t(116), 0.5);
crash(t(116), 0.16, 3.5);
pad(t(116), 2, [48, 55, 60, 64, 67, 72], 0.06, 2400);
[72, 76, 79, 84].forEach((m, j) => pluck(t(116) + j * 0.06, m, 0.12, j % 2 ? 0.4 : -0.4, 3));

// ---------- master ----------
function writeWav(path, l, r) {
  // soft clip + normalize to -1 dBFS
  let peak = 0;
  for (let i = 0; i < l.length; i++) {
    l[i] = Math.tanh(l[i] * 1.2);
    r[i] = Math.tanh(r[i] * 1.2);
    peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  }
  const g = 0.89 / (peak || 1);
  const n = l.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
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
  console.log("wrote", path);
}

// fade the last 0.6 s
for (let i = 0; i < 0.6 * SR; i++) {
  const k = 1 - i / (0.6 * SR);
  L[N - 1 - i] *= 1 - k;
  R[N - 1 - i] *= 1 - k;
}
writeWav(OUT + (SLOW === 1 ? "music.wav" : "music-slow.wav"), L, R);
if (SLOW !== 1) process.exit(0); // the sound effects are not tempo-bound, keep the originals

// ---------- sound effects (short, separate files; mixed in Remotion) ----------
function fx(name, seconds, fn) {
  const n = Math.floor(seconds * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  fn(n, l, r);
  writeWav(OUT + name + ".wav", l, r);
}

// door knock: two woody thumps
fx("knock", 0.6, (n, l, r) => {
  for (const o of [0, 0.16]) {
    const s = Math.floor(o * SR);
    const f = svf();
    for (let i = 0; i < 0.25 * SR && s + i < n; i++) {
      const t = i / SR;
      const body = Math.sin(2 * Math.PI * (190 + 80 * Math.exp(-t * 60)) * t) * Math.exp(-t * 32);
      const wood = f(rnd(), 900, 3, "band") * Math.exp(-t * 70) * 1.4;
      l[s + i] += (body + wood) * 0.8;
      r[s + i] += (body + wood) * 0.8;
    }
  }
});

fx("whoosh", 0.7, (n, l, r) => {
  const f = svf();
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const env = Math.sin(Math.PI * k) ** 2;
    const v = f(rnd(), 400 + 5000 * Math.sin(Math.PI * k), 1.5, "band") * env;
    l[i] = v * (1 - k);
    r[i] = v * k + v * 0.3;
  }
});

fx("pop", 0.25, (n, l, r) => {
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (300 + 900 * Math.exp(-t * 40))) / SR;
    const v = Math.sin(ph) * Math.exp(-t * 26);
    l[i] = v;
    r[i] = v;
  }
});

fx("tick", 0.08, (n, l, r) => {
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 120);
    l[i] = v;
    r[i] = v;
  }
});

fx("tap", 0.12, (n, l, r) => {
  const f = svf();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = (Math.sin(2 * Math.PI * 1200 * t) * 0.6 + f(rnd(), 3000, 2, "band")) * Math.exp(-t * 60);
    l[i] = v;
    r[i] = v;
  }
});

fx("impact", 1.6, (n, l, r) => {
  let ph = 0;
  const f = svf();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (40 + 90 * Math.exp(-t * 9))) / SR;
    const v = Math.sin(ph) * Math.exp(-t * 2.6) + f(rnd(), 2500, 0.7, "low") * Math.exp(-t * 9) * 0.5;
    l[i] = v;
    r[i] = v;
  }
});

fx("chime", 2.2, (n, l, r) => {
  const notes = [76, 79, 84, 88];
  notes.forEach((m, j) => {
    const s = Math.floor(j * 0.07 * SR);
    const fr = mtof(m);
    for (let i = 0; s + i < n; i++) {
      const t = i / SR;
      const v = (Math.sin(2 * Math.PI * fr * t) + 0.3 * Math.sin(2 * Math.PI * fr * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * 2.4) * 0.3;
      l[s + i] += v * (j % 2 ? 0.7 : 1);
      r[s + i] += v * (j % 2 ? 1 : 0.7);
    }
  });
});

fx("swipe", 0.35, (n, l, r) => {
  const f = svf();
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const v = f(rnd(), 1200 + 6000 * k, 1.2, "band") * Math.sin(Math.PI * k);
    l[i] = v;
    r[i] = v;
  }
});
