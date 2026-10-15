import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion";
import { S1Hook } from "./scenes/S1Hook";
import { S2Problem } from "./scenes/S2Problem";
import { S3Meet } from "./scenes/S3Meet";
import { S4App } from "./scenes/S4App";
import { S5Features } from "./scenes/S5Features";
import { S6Payoff } from "./scenes/S6Payoff";
import { S7Final } from "./scenes/S7Final";
import { T } from "./theme";
import VO from "./vo.json";

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

/** Voice-over cut: its own effect palette (scripts/make-sfx.mjs), one variant per cue, same frame grid as SFX. */
const SFX_VO: Sfx[] = [
  // hook
  { at: 0, name: "ring.mp3", vol: 0.5, dur: 44 },
  { at: 0, name: "sfx/boom-open", vol: 0.4 },
  { at: 7, name: "sfx/pop-1", vol: 0.3 },
  { at: 14, name: "sfx/pop-3", vol: 0.3 },
  { at: 46, name: "sfx/whoosh-hook", vol: 0.45 },
  { at: 60, name: "sfx/boom-who", vol: 0.45 },
  { at: 104, name: "sfx/swish-1", vol: 0.4 },
  { at: 108, name: "sfx/pop-5", vol: 0.32 },
  { at: 186, name: "sfx/whoosh-big", vol: 0.5 },
  // problem: six stamps climbing a semitone each, a slam on "Don't tell your family"
  ...[214, 226, 238, 250, 262, 274].map((at, i) => ({ at, name: `sfx/phrase-${i + 1}`, vol: 0.3 + i * 0.03 })),
  { at: 288, name: "sfx/slam", vol: 0.55 },
  { at: 326, name: "sfx/whoosh-down", vol: 0.45 },
  { at: 378, name: "sfx/knock-two", vol: 0.9 },
  // meet
  { at: 452, name: "sfx/pop-4", vol: 0.35 },
  { at: 462, name: "sfx/bell-brand", vol: 0.45, dur: 90 },
  { at: 494, name: "sfx/whoosh-up", vol: 0.4 },
  { at: 574, name: "sfx/whoosh-soft", vol: 0.4 },
  { at: 626, name: "sfx/tap-1", vol: 0.5 },
  // app in action
  { at: 674, name: "sfx/notify-1", vol: 0.45 },
  { at: 720, name: "sfx/swish-2", vol: 0.35 },
  { at: 778, name: "sfx/whoosh-wipe", vol: 0.4 },
  { at: 798, name: "sfx/pop-2", vol: 0.3 },
  { at: 802, name: "sfx/typing", vol: 0.3 },
  { at: 848, name: "sfx/pop-6", vol: 0.3 },
  { at: 900, name: "sfx/whoosh-down", vol: 0.4 },
  { at: 906, name: "sfx/score-rise", vol: 0.25 },
  { at: 940, name: "sfx/alert", vol: 0.35 },
  { at: 962, name: "sfx/swish-1", vol: 0.35 },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 976 + i * 3, name: `sfx/flag-${i + 1}`, vol: 0.28 })),
  { at: 1044, name: "sfx/tap-2", vol: 0.55 },
  { at: 1050, name: "sfx/stamp", vol: 0.5 },
  { at: 1080, name: "sfx/whoosh-up", vol: 0.4 },
  { at: 1102, name: "sfx/tap-3", vol: 0.55 },
  { at: 1108, name: "sfx/success", vol: 0.4 },
  // features
  { at: 1140, name: "sfx/whoosh-wipe", vol: 0.45 },
  ...[1158, 1172, 1186].map((at, i) => ({ at, name: `sfx/notify-${i + 1}`, vol: 0.38 })),
  { at: 1252, name: "sfx/whoosh-big", vol: 0.4 },
  ...[1260, 1264, 1268].map((at, i) => ({ at, name: `sfx/land-${i + 1}`, vol: 0.35 })),
  { at: 1290, name: "sfx/word-1", vol: 0.4 },
  { at: 1320, name: "sfx/word-2", vol: 0.4 },
  { at: 1372, name: "sfx/whoosh-wipe", vol: 0.45 },
  { at: 1404, name: "sfx/word-3", vol: 0.4 },
  { at: 1438, name: "ring.mp3", vol: 0.45, dur: 58 },
  // final
  { at: 1650, name: "sfx/boom-end", vol: 0.45, dur: 90 },
  { at: 1656, name: "sfx/pop-8", vol: 0.35 },
  { at: 1740, name: "sfx/knock-three", vol: 0.8 },
  { at: 1742, name: "sfx/bell-end", vol: 0.45, dur: 58 },
];

/** Music level under the narration: dips while a line plays, eased over 6 frames on each side. */
function ducked(f: number) {
  const near = Math.min(...VO.map((c) => (f < c.at ? c.at - f : f > c.at + c.frames ? f - c.at - c.frames : 0)));
  return 0.15 + 0.37 * Math.min(1, near / 6);
}

/** KnockFirstFilm: the original 60 s cut. KnockFirstFilmVO: same frames at 25 fps (1.2× slower) + narration. */
export function Film({ voiceover = false }: { voiceover?: boolean }) {
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

      {voiceover ? <Audio src={staticFile("audio/music-slow.wav")} volume={ducked} /> : <Audio src={staticFile("audio/music.wav")} volume={0.8} />}
      {(voiceover ? SFX_VO : SFX).map((s, i) => (
        <Sequence key={i} from={s.at} durationInFrames={s.dur ?? 75} layout="none">
          <Audio src={staticFile(`audio/${s.name.includes(".") ? s.name : `${s.name}.wav`}`)} volume={s.vol ?? 0.4} />
        </Sequence>
      ))}
      {voiceover
        ? VO.map((c) => (
            <Sequence key={c.file} from={c.at} durationInFrames={c.frames + 10} layout="none">
              <Audio src={staticFile(c.file)} volume={1} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
}
