import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { expoOut, p, sp } from "../anim";
import { DISPLAY } from "../theme";

/** Renders text as independently animated characters. `charStyle(i, n)` returns each glyph's transform/opacity. */
export function Chars({
  text,
  style,
  charStyle,
}: {
  text: string;
  style?: CSSProperties;
  charStyle: (i: number, n: number, ch: string) => CSSProperties;
}) {
  const chars = [...text];
  return (
    <div style={{ fontFamily: DISPLAY, whiteSpace: "pre", display: "inline-block", ...style }}>
      {chars.map((ch, i) => (
        <span key={i} style={{ display: "inline-block", ...charStyle(i, chars.length, ch) }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </div>
  );
}

/** Characters rise out of a mask line, staggered, with a slight overshoot. */
export function RiseText({
  text,
  start,
  stagger = 1.6,
  style,
  from = 1.05,
  dur = 22,
}: {
  text: string;
  start: number;
  stagger?: number;
  style?: CSSProperties;
  from?: number;
  dur?: number;
}) {
  const f = useCurrentFrame();
  return (
    <div style={{ overflow: "hidden", display: "inline-block", paddingBottom: "0.08em", lineHeight: 1.02, ...style }}>
      <Chars
        text={text}
        style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit", letterSpacing: "inherit" }}
        charStyle={(i) => {
          const t = p(f, start + i * stagger, dur, expoOut);
          return { transform: `translateY(${(1 - t) * from * 100}%) rotate(${(1 - t) * 8}deg)` };
        }}
      />
    </div>
  );
}

/** Rolls from one word to the next inside a mask (vertical slot-machine swap), per character. */
export function RollSwap({
  words,
  at,
  style,
  stagger = 1.2,
}: {
  words: string[];
  /** frame at which words[i] (i ≥ 1) replaces the previous one */
  at: number[];
  style?: CSSProperties;
  stagger?: number;
}) {
  const f = useCurrentFrame();
  let idx = 0;
  for (let i = 0; i < at.length; i++) if (f >= at[i] - 2) idx = i + 1;
  const cur = words[Math.min(idx, words.length - 1)];
  const prev = idx > 0 ? words[idx - 1] : null;
  const swapAt = idx > 0 ? at[idx - 1] : -999;
  return (
    <div style={{ position: "relative", overflow: "hidden", display: "inline-block", lineHeight: 1.04, paddingBottom: "0.06em", ...style }}>
      {prev ? (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Chars
            text={prev}
            style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit", letterSpacing: "inherit" }}
            charStyle={(i) => {
              const t = p(f, swapAt - 2 + i * stagger, 12, expoOut);
              return { transform: `translateY(${-t * 110}%)`, opacity: 1 - t * 0.6 };
            }}
          />
        </div>
      ) : null}
      <Chars
        text={cur}
        style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit", letterSpacing: "inherit" }}
        charStyle={(i) => {
          if (!prev) return {};
          const t = p(f, swapAt + i * stagger, 16, expoOut);
          return { transform: `translateY(${(1 - t) * 110}%)` };
        }}
      />
    </div>
  );
}

/** A word that slams in from a large scale with a springy settle. */
export function Slam({ children, start, style, fromScale = 2.6, rotate = 0 }: { children: ReactNode; start: number; style?: CSSProperties; fromScale?: number; rotate?: number }) {
  const f = useCurrentFrame();
  const s = sp(f, start, { damping: 11, stiffness: 220 });
  const scale = fromScale + (1 - fromScale) * s;
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        display: "inline-block",
        transform: `scale(${scale}) rotate(${rotate * (1 - s)}deg)`,
        opacity: f < start ? 0 : Math.min(1, (f - start) / 3),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small uppercase label used for honest context lines ("Translated from Thai"). */
export function Eyebrow({ children, color, style }: { children: ReactNode; color: string; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color, ...style }}>{children}</div>
  );
}
