// Voice-over for the slowed cut (KnockFirstFilmVO). Local neural TTS (Kokoro-82M, Apache-2.0): no API key, no credits.
// `at` is the global frame where the line starts (the film runs the same 1800 frames at 25 fps, so 1 frame = 40 ms).
// Writes public/audio/vo/NN.wav + src/vo.json ({ at, frames }) that Film.tsx reads.
import { KokoroTTS } from "kokoro-js";
import { mkdirSync, writeFileSync } from "node:fs";

const VOICE = process.env.VOICE || "af_heart";
const SPEED = Number(process.env.SPEED || 0.95);
const FPS = 25;

const LINES = [
  // hook
  { at: 50, text: "Who's calling Grandma?" },
  { at: 112, text: "A number she doesn't know." },
  // problem
  { at: 216, text: "Scammers follow a script." },
  { at: 289, text: "And it always ends the same way: don't tell your family." },
  { at: 384, text: "What if strangers had to knock first?" },
  // meet
  { at: 466, text: "Meet KnockFirst. An AI call screener for elderly parents." },
  // app in action
  { at: 672, text: "When a stranger calls, the AI answers first." },
  { at: 790, text: "It asks who's calling, and why." },
  { at: 905, text: "It scores the risk, and quotes every red flag from the call." },
  { at: 1022, text: "One tap from the family: block the scammer, let the nurse through." },
  // features
  { at: 1146, text: "You know the moment a stranger calls." },
  { at: 1258, text: "Allow. Block. You decide." },
  { at: 1374, text: "Grandma mode keeps it simple: big text, calm screen, and family rings straight through." },
  // payoff + final
  { at: 1521, text: "Strangers talk to the AI. Grandma talks to family." },
  { at: 1656, text: "KnockFirst." },
  { at: 1704, text: "Strangers knock first. Family opens the door." },
];

const OUT = new URL("../public/audio/vo/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });

const cues = [];
for (const [i, line] of LINES.entries()) {
  const audio = await tts.generate(line.text, { voice: VOICE, speed: SPEED });
  // peak-normalize to -1 dBFS so every line sits at the same level, well above the ducked music
  const peak = audio.audio.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  for (let k = 0; k < audio.audio.length; k++) audio.audio[k] *= 0.89 / peak;
  const name = `${String(i).padStart(2, "0")}.wav`;
  await audio.save(OUT + name);
  const frames = Math.ceil((audio.audio.length / audio.sampling_rate) * FPS);
  cues.push({ at: line.at, frames, file: `audio/vo/${name}`, text: line.text });
  const next = LINES[i + 1]?.at ?? 1800;
  const warn = line.at + frames > next ? `  ⚠ overlaps next cue by ${line.at + frames - next} frames` : "";
  console.log(`${name} @${line.at} ${frames}f  ${line.text}${warn}`);
}
writeFileSync(new URL("../src/vo.json", import.meta.url), JSON.stringify(cues, null, 2) + "\n");
