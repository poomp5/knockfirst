import { AbsoluteFill, useCurrentFrame } from "remotion";
import { expoOut, mix, p, sp } from "../anim";
import { Phone } from "../components/Phone";
import { Blobs } from "../components/Shapes";
import { C, DISPLAY } from "../theme";

/** 50–55 s. One sentence, room to breathe, the app as a calm hero. */
export function S6Payoff() {
  const f = useCurrentFrame();
  const phone = sp(f, 0, { damping: 18, stiffness: 90 });
  const float = Math.sin(f * 0.05) * 10;
  const words: { w: string; line: number; color?: string; weight?: number }[] = [
    { w: "Strangers", line: 0 },
    { w: "talk", line: 0 },
    { w: "to", line: 0 },
    { w: "the", line: 1 },
    { w: "AI.", line: 1, color: C.orange, weight: 800 },
    { w: "Grandma", line: 2, weight: 800 },
    { w: "talks", line: 2, weight: 800 },
    { w: "to", line: 3, weight: 800 },
    { w: "family.", line: 3, weight: 800 },
  ];
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <Blobs blobs={[{ x: 1340, y: 560, r: 420, color: C.peach, seed: 61, opacity: 0.8, scale: mix(phone, 0.6, 1) }]} />
      <div style={{ position: "absolute", left: 1150, top: mix(phone, 220, 110) + float, opacity: phone, transform: `rotate(${3 + (1 - phone) * 6}deg)` }}>
        <Phone width={400} layers={[{ src: "grandma" }]} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 230, fontFamily: DISPLAY, fontSize: 112, letterSpacing: -5, lineHeight: 1.08, color: C.ink, transform: `scale(${1 + f * 0.0004})`, transformOrigin: "0 50%" }}>
        {[0, 1, 2, 3].map((line) => (
          <div key={line} style={{ marginTop: line === 2 ? 40 : 0 }}>
            {words
              .map((w, i) => ({ ...w, i }))
              .filter((w) => w.line === line)
              .map((w) => {
                const t = p(f, 6 + w.i * 5 + (w.line >= 2 ? 10 : 0), 20, expoOut);
                return (
                  <span
                    key={w.i}
                    style={{
                      display: "inline-block",
                      marginRight: 30,
                      fontWeight: w.weight ?? 300,
                      color: w.color ?? C.ink,
                      opacity: t,
                      filter: `blur(${(1 - t) * 14}px)`,
                      transform: `translateY(${(1 - t) * 30}px)`,
                    }}
                  >
                    {w.w}
                  </span>
                );
              })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
