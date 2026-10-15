import type { CSSProperties } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { expoIn, expoOut, mix, p, rand, shake, sp } from "../anim";
import { Chars, Eyebrow } from "../components/Kinetic";
import { DrawPath, KnockWaves } from "../components/Shapes";
import { C, DISPLAY } from "../theme";

/**
 * 7–15 s. The scam script piles up (lines translated from the app's demo police-scam transcript),
 * tangles, collapses to a point, and resolves into one clean question.
 */
type Phrase = {
  text: string;
  at: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rot: number;
  weight?: number;
  outline?: boolean;
  band?: string;
  enter: "left" | "right" | "drop" | "slam" | "chars";
};

const PHRASES: Phrase[] = [
  { text: "“This is the police.”", at: 4, x: 560, y: 210, size: 110, color: C.cream, rot: -4, enter: "left" },
  { text: "“Money laundering.”", at: 16, x: 1350, y: 380, size: 128, color: C.ink, rot: 3, enter: "slam", weight: 800 },
  { text: "“Arrest warrant. Today.”", at: 28, x: 600, y: 560, size: 100, color: "transparent", outline: true, rot: -2, enter: "right" },
  { text: "“Add us on LINE.”", at: 40, x: 1380, y: 720, size: 112, color: C.yellow, rot: -7, enter: "drop", weight: 800 },
  { text: "“Transfer everything.”", at: 52, x: 820, y: 860, size: 140, color: C.ink, rot: 2, enter: "chars", weight: 900 },
  { text: "“Read me the OTP.”", at: 64, x: 1420, y: 150, size: 96, color: C.cream, rot: 5, enter: "left", weight: 600 },
  { text: "“Don’t tell your family.”", at: 78, x: 960, y: 540, size: 150, color: C.white, rot: -3, enter: "slam", weight: 900, band: C.ink },
];

const TANGLE = [
  "M -50 300 C 300 100, 500 900, 900 500 S 1500 100, 1980 640",
  "M -50 820 C 400 1000, 700 200, 1100 640 S 1600 1050, 1980 260",
  "M 200 -40 C 260 400, 1500 300, 1300 700 S 500 1000, 860 1120",
];

export function S2Problem() {
  const f = useCurrentFrame();
  const collapse = p(f, 116, 26, expoIn);
  const cleanIn = p(f, 134, 20, expoOut);
  const stamp = f >= 78 ? shake(f, 78, 14, 0.18, 2.6) : 0;
  const pressure = 1 + p(f, 0, 116, (t) => t) * 0.12;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #FF7A3A 0%, ${C.orange} 55%, #E2481A 100%)`, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${stamp}px, ${stamp * 0.4}px) scale(${pressure * (1 - collapse)}) rotate(${collapse * 30}deg)`,
          opacity: 1 - p(f, 132, 8, expoOut),
        }}
      >
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {TANGLE.map((d, i) => (
            <DrawPath key={i} d={d} progress={p(f, 20 + i * 14, 50, expoOut)} color={i === 1 ? C.ink : C.cream} width={i === 1 ? 10 : 6} style={{ opacity: 0.55 }} />
          ))}
        </svg>
        {PHRASES.map((ph, i) => (
          <PhraseView key={i} ph={ph} f={f} />
        ))}
        <div style={{ position: "absolute", left: 80, top: 60, opacity: p(f, 2, 10) }}>
          <Eyebrow color={C.ink}>A typical call-centre scam script</Eyebrow>
        </div>
      </AbsoluteFill>

      {/* clean resolution on warm white, opening as a circle from the collapse point */}
      <AbsoluteFill
        style={{
          background: C.cream,
          clipPath: `circle(${cleanIn * 1200}px at 50% 50%)`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Question f={f - 140} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function PhraseView({ ph, f }: { ph: Phrase; f: number }) {
  const t = f - ph.at;
  if (t < -2) return null;
  const s = sp(f, ph.at, { damping: 13, stiffness: 200 });
  const jitter = f > 90 ? Math.sin(f * 1.7 + ph.at) * 3 : 0;
  let transform = "";
  switch (ph.enter) {
    case "left":
      transform = `translateX(${(1 - s) * -1200}px) skewX(${(1 - s) * 25}deg)`;
      break;
    case "right":
      transform = `translateX(${(1 - s) * 1200}px) skewX(${(1 - s) * -25}deg)`;
      break;
    case "drop":
      transform = `translateY(${(1 - s) * -700}px) rotate(${(1 - s) * 30}deg)`;
      break;
    case "slam":
      transform = `scale(${mix(s, 2.8, 1)})`;
      break;
    default:
      transform = "";
  }
  const base: CSSProperties = {
    fontFamily: DISPLAY,
    fontSize: ph.size,
    fontWeight: ph.weight ?? 700,
    color: ph.color,
    letterSpacing: -ph.size * 0.035,
    WebkitTextStroke: ph.outline ? `3px ${C.cream}` : undefined,
    whiteSpace: "nowrap",
    lineHeight: 1.05,
  };
  return (
    <div
      style={{
        position: "absolute",
        left: ph.x,
        top: ph.y,
        transform: `translate(-50%, -50%) rotate(${ph.rot + jitter * 0.3}deg) ${transform} translateX(${jitter}px)`,
        opacity: ph.enter === "chars" ? 1 : Math.min(1, (t + 2) / 3),
        zIndex: ph.band ? 5 : 1,
      }}
    >
      {ph.band ? (
        <div
          style={{
            position: "absolute",
            inset: "-6px -40px",
            background: ph.band,
            transform: `scaleX(${p(f, ph.at, 10, expoOut)})`,
            transformOrigin: "0 50%",
            borderRadius: 14,
          }}
        />
      ) : null}
      <div style={{ position: "relative" }}>
        {ph.enter === "chars" ? (
          <Chars
            text={ph.text}
            style={base}
            charStyle={(i) => {
              const k = sp(f, ph.at + i * 0.8, { damping: 12, stiffness: 260 });
              return { transform: `translateY(${(1 - k) * 220}px) rotate(${(1 - k) * (rand(i + 3) - 0.5) * 70}deg)`, opacity: k > 0.02 ? 1 : 0 };
            }}
          />
        ) : (
          <div style={base}>{ph.text}</div>
        )}
      </div>
    </div>
  );
}

/** "What if strangers had to knock first?": the two key words knock, like knuckles on a door. */
function Question({ f }: { f: number }) {
  const knock = (at: number) => {
    const t = f - at;
    if (t < 0 || t > 12) return 1;
    return 1 - Math.sin((t / 12) * Math.PI) * 0.14;
  };
  const line1 = p(f, 0, 20, expoOut);
  const line2 = sp(f, 12, { damping: 12 });
  return (
    <div style={{ textAlign: "center", fontFamily: DISPLAY }}>
      <div
        style={{
          fontSize: 120,
          fontWeight: 400,
          color: C.ink,
          letterSpacing: -4,
          transform: `translateY(${(1 - line1) * 60}px)`,
          opacity: line1,
        }}
      >
        What if strangers
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 30, marginTop: -10 }}>
        <span style={{ fontSize: 150, fontWeight: 400, color: C.ink, letterSpacing: -5, opacity: line2 }}>had to</span>
        <span
          style={{
            display: "inline-block",
            fontSize: 170,
            fontWeight: 900,
            color: C.orange,
            letterSpacing: -7,
            transform: `scale(${line2 * knock(28)}) rotate(${(1 - knock(28)) * -40}deg)`,
          }}
        >
          knock
        </span>
        <span
          style={{
            display: "inline-block",
            fontSize: 170,
            fontWeight: 900,
            color: C.orange,
            letterSpacing: -7,
            transform: `scale(${sp(f, 18, { damping: 12 }) * knock(33)}) rotate(${(1 - knock(33)) * 40}deg)`,
          }}
        >
          first?
        </span>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
        <KnockWaves x={1745} y={600} t={f - 28} color={C.orange} size={1.3} />
        <KnockWaves x={1770} y={600} t={f - 33} color={C.ink} size={1.8} />
      </svg>
    </div>
  );
}
