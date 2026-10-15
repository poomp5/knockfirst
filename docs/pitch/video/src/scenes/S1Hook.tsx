import { AbsoluteFill, useCurrentFrame } from "remotion";
import { expoIn, expoOut, mix, p, rand, shake, sp } from "../anim";
import { Chars, Slam } from "../components/Kinetic";
import { C, DISPLAY, SWIFT } from "../theme";

/** 0–7 s. RING RING RING → "Who's calling Grandma?" → an unknown number → "?" that swallows the frame. */
export function S1Hook() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.cream, overflow: "hidden" }}>
      {f < 46 ? <Ring f={f} /> : null}
      {f >= 46 && f < 104 ? <WhoIsCalling f={f - 46} /> : null}
      {f >= 104 ? <Unknown f={f - 104} /> : null}
    </AbsoluteFill>
  );
}

/** Three stacked RINGs, each glyph buzzing independently like a phone on a table. */
function Ring({ f }: { f: number }) {
  const lines = [
    { at: 0, color: C.ink, x: -150, stroke: false },
    { at: 7, color: C.orange, x: 170, stroke: false },
    { at: 14, color: "transparent", x: -40, stroke: true },
  ];
  const buzz = (seed: number) => shake(f, 0, 9, 0.02, 2.9 + seed * 0.3) * (f % 15 < 9 ? 1 : 0.25);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `rotate(-7deg) scale(${1 + f * 0.003})` }}>
      {lines.map((l, li) => {
        const s = sp(f, l.at, { damping: 10, stiffness: 240 });
        const fromX = li === 1 ? 900 : li === 2 ? -900 : 0;
        return (
          <div
            key={li}
            style={{
              transform: `translateX(${l.x + fromX * (1 - s)}px) scale(${li === 0 ? mix(s, 3.2, 1) : 1}) skewX(${(1 - s) * (li === 1 ? -18 : 18)}deg)`,
              opacity: f >= l.at ? 1 : 0,
              lineHeight: 0.84,
            }}
          >
            <Chars
              text="RING"
              style={{
                fontSize: 330,
                fontWeight: 900,
                letterSpacing: -12,
                color: l.color,
                WebkitTextStroke: l.stroke ? `7px ${C.ink}` : undefined,
              }}
              charStyle={(i) => ({
                transform: `translate(${buzz(i + li * 4)}px, ${buzz(i * 2 + li) * 0.5}px) rotate(${buzz(i + 7) * 0.5}deg)`,
              })}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Hard cut to Swift orange. Letters drop in, then "Grandma?" slams. */
function WhoIsCalling({ f }: { f: number }) {
  const q = sp(f, 22, { damping: 8, stiffness: 160 });
  return (
    <AbsoluteFill style={{ background: SWIFT, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${1 + f * 0.0025})` }}>
        <Chars
          text="Who’s calling"
          style={{ fontSize: 150, fontWeight: 600, color: C.white, letterSpacing: -4 }}
          charStyle={(i) => {
            const t = sp(f, i * 1.3, { damping: 12, stiffness: 260 });
            return { transform: `translateY(${(1 - t) * -260}px) rotate(${(1 - t) * (rand(i) - 0.5) * 90}deg)`, opacity: t > 0.02 ? 1 : 0 };
          }}
        />
        <div style={{ marginTop: -30, display: "flex", alignItems: "baseline" }}>
          <Slam start={14} fromScale={0.2} style={{ fontSize: 300, fontWeight: 900, color: C.cream, letterSpacing: -14, lineHeight: 1 }}>
            Grandma
          </Slam>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 300,
              fontWeight: 900,
              color: C.ink,
              lineHeight: 1,
              transform: `rotate(${(1 - q) * -70 + Math.sin(f * 0.4) * 6 * Math.exp(-(f - 22) * 0.05)}deg) scale(${q})`,
              transformOrigin: "50% 80%",
            }}
          >
            ?
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** The police-scam number from the app's demo data, marching across the frame, then a giant "?" zooms through. */
function Unknown({ f }: { f: number }) {
  const number = "092-345-6781";
  const pill = sp(f, 4, { damping: 12 });
  const collapse = p(f, 52, 22, expoIn);
  const q = sp(f, 60, { damping: 13, stiffness: 120 });
  const through = p(f, 88, 18, expoIn);
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      {/* row 1: solid digits marching left */}
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          whiteSpace: "nowrap",
          transform: `translateX(${1950 - f * 34}px) scale(${1 - collapse * 0.6})`,
          opacity: 1 - collapse,
        }}
      >
        <Chars
          text={number}
          style={{ fontSize: 330, fontWeight: 800, color: C.ink, letterSpacing: -10 }}
          charStyle={(i) => ({ transform: `translateY(${Math.sin(f * 0.35 + i * 0.7) * 10}px)` })}
        />
      </div>
      {/* row 2: outlined digits marching right */}
      <div
        style={{
          position: "absolute",
          top: 640,
          left: 0,
          whiteSpace: "nowrap",
          transform: `translateX(${-2300 + f * 26}px)`,
          opacity: 1 - collapse,
        }}
      >
        <Chars
          text={`${number}   ${number}`}
          style={{ fontSize: 220, fontWeight: 800, color: "transparent", WebkitTextStroke: `4px ${C.orange}`, letterSpacing: -6 }}
          charStyle={() => ({})}
        />
      </div>
      {/* label */}
      <div
        style={{
          position: "absolute",
          top: 160,
          left: 150,
          transform: `scale(${pill * (1 - collapse)}) rotate(${(1 - pill) * -12}deg)`,
          transformOrigin: "0 50%",
          background: C.ink,
          color: C.white,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 54,
          padding: "14px 40px",
          borderRadius: 60,
        }}
      >
        Unknown number
      </div>
      {/* the question mark that swallows everything */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 900,
            lineHeight: 1,
            color: C.orange,
            opacity: f >= 58 ? 1 : 0,
            transform: `translateY(${-40 + through * 600}px) scale(${q * (1 + through * 26)}) rotate(${(1 - q) * 40}deg)`,
            transformOrigin: "50% 86%",
          }}
        >
          ?
        </div>
      </AbsoluteFill>
      {/* the dot fills the frame orange, handing over to the problem scene */}
      <AbsoluteFill style={{ background: C.orange, opacity: p(f, 100, 4, expoOut) }} />
    </AbsoluteFill>
  );
}
