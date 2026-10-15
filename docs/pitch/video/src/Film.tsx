import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion";
import { S1Hook } from "./scenes/S1Hook";
import { S2Problem } from "./scenes/S2Problem";
import { S3Meet } from "./scenes/S3Meet";
import { S4App } from "./scenes/S4App";
import { S5Features } from "./scenes/S5Features";
import { S6Payoff } from "./scenes/S6Payoff";
import { S7Final } from "./scenes/S7Final";
import { T } from "./theme";

const len = (s: readonly [number, number]) => s[1] - s[0];

type Sfx = { at: number; name: string; vol?: number; dur?: number };

/** Sound effects, frame-accurate to the motion (global frames). Kept under the music. */
const SFX: Sfx[] = [
  // hook
  { at: 0, name: "ring.mp3", vol: 0.55, dur: 44 },
  { at: 0, name: "impact", vol: 0.5 },
  { at: 7, name: "pop", vol: 0.35 },
  { at: 14, name: "pop", vol: 0.35 },
  { at: 46, name: "whoosh", vol: 0.45 },
  { at: 60, name: "impact", vol: 0.45 },
  { at: 104, name: "swipe", vol: 0.4 },
  { at: 108, name: "pop", vol: 0.35 },
  { at: 186, name: "whoosh", vol: 0.5 },
  // problem: one tick per phrase, a hit on "Don't tell your family"
  ...[214, 226, 238, 250, 262, 274].map((at) => ({ at, name: "tick", vol: 0.3 })),
  { at: 288, name: "impact", vol: 0.55 },
  { at: 326, name: "whoosh", vol: 0.45 },
  { at: 378, name: "knock", vol: 0.9 },
  // meet
  { at: 452, name: "pop", vol: 0.4 },
  { at: 462, name: "chime", vol: 0.5 },
  { at: 494, name: "whoosh", vol: 0.4 },
  { at: 574, name: "whoosh", vol: 0.4 },
  { at: 626, name: "tap", vol: 0.5 },
  // app in action
  { at: 674, name: "pop", vol: 0.4 },
  { at: 720, name: "swipe", vol: 0.35 },
  { at: 778, name: "whoosh", vol: 0.45 },
  { at: 798, name: "pop", vol: 0.35 },
  { at: 848, name: "pop", vol: 0.35 },
  { at: 900, name: "whoosh", vol: 0.4 },
  { at: 940, name: "impact", vol: 0.35 },
  { at: 962, name: "swipe", vol: 0.35 },
  { at: 1044, name: "tap", vol: 0.55 },
  { at: 1050, name: "impact", vol: 0.45 },
  { at: 1080, name: "whoosh", vol: 0.4 },
  { at: 1102, name: "tap", vol: 0.55 },
  { at: 1108, name: "chime", vol: 0.35 },
  // features
  { at: 1140, name: "whoosh", vol: 0.4 },
  ...[1158, 1172, 1186].map((at) => ({ at, name: "pop", vol: 0.4 })),
  { at: 1252, name: "whoosh", vol: 0.45 },
  ...[1260, 1264, 1268].map((at) => ({ at, name: "pop", vol: 0.3 })),
  { at: 1290, name: "tick", vol: 0.35 },
  { at: 1320, name: "tick", vol: 0.35 },
  { at: 1372, name: "whoosh", vol: 0.45 },
  { at: 1404, name: "tick", vol: 0.3 },
  { at: 1438, name: "ring.mp3", vol: 0.45, dur: 58 },
  // final
  { at: 1650, name: "impact", vol: 0.5 },
  { at: 1656, name: "pop", vol: 0.4 },
  { at: 1740, name: "knock", vol: 0.8 },
  { at: 1742, name: "chime", vol: 0.45 },
];

export function Film() {
  return (
    <AbsoluteFill style={{ background: "#FFF7EE" }}>
      <Series>
        <Series.Sequence durationInFrames={len(T.hook)}>
          <S1Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={len(T.problem)}>
          <S2Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={len(T.meet)}>
          <S3Meet />
        </Series.Sequence>
        <Series.Sequence durationInFrames={len(T.app)}>
          <S4App />
        </Series.Sequence>
        <Series.Sequence durationInFrames={len(T.features)}>
          <S5Features />
        </Series.Sequence>
        <Series.Sequence durationInFrames={len(T.payoff)}>
          <S6Payoff />
        </Series.Sequence>
        <Series.Sequence durationInFrames={len(T.final)}>
          <S7Final />
        </Series.Sequence>
      </Series>

      <Audio src={staticFile("audio/music.wav")} volume={0.8} />
      {SFX.map((s, i) => (
        <Sequence key={i} from={s.at} durationInFrames={s.dur ?? 75} layout="none">
          <Audio src={staticFile(`audio/${s.name.includes(".") ? s.name : `${s.name}.wav`}`)} volume={s.vol ?? 0.4} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
