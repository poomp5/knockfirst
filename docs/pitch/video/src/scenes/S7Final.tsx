import { AbsoluteFill, useCurrentFrame } from "remotion";
import { expoOut, p, sp } from "../anim";
import { Chars } from "../components/Kinetic";
import { IconTile } from "../components/Mark";
import { Blobs } from "../components/Shapes";
import { C, DISPLAY, SWIFT } from "../theme";

/** 55–60 s. Brand lockup on Swift orange; the mark knocks once more on the final beat (local 90 = 58 s). */
export function S7Final() {
  const f = useCurrentFrame();
  const open = p(f, 0, 14, expoOut);
  const icon = sp(f, 3, { damping: 10, stiffness: 170 });
  const knock = f >= 90 ? Math.sin((f - 90) * 1.5) * 16 * Math.exp(-(f - 90) * 0.09) : 0;
  const knockScale = f >= 90 && f < 100 ? 1 - Math.sin(((f - 90) / 10) * Math.PI) * 0.06 : 1;
  const tag = p(f, 40, 18, expoOut);
  const cta = sp(f, 90, { damping: 10, stiffness: 200 });
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <AbsoluteFill style={{ background: SWIFT, clipPath: `circle(${open * 1250}px at 50% 50%)` }}>
        <Blobs
          blur={40}
          blobs={[
            { x: 260, y: 160, r: 300, color: C.yellow, seed: 71, opacity: 0.55 },
            { x: 1700, y: 950, r: 360, color: C.pink, seed: 72, opacity: 0.5 },
            { x: 1650, y: 120, r: 180, color: "#FFD27A", seed: 73, opacity: 0.45 },
          ]}
        />
        <AbsoluteFill style={{ alignItems: "center" }}>
          <div style={{ marginTop: 150, transform: `scale(${icon * knockScale}) rotate(${(1 - icon) * -25}deg)` }}>
            <IconTile size={230} handsetRotate={knock} barY={0} />
          </div>
          <div style={{ marginTop: 40, display: "flex", fontWeight: 800, fontSize: 168, letterSpacing: -8, lineHeight: 1 }}>
            <Chars
              text="Knock"
              style={{ color: C.white }}
              charStyle={(i) => {
                const k = sp(f, 12 + i * 1.5, { damping: 12, stiffness: 200 });
                return { transform: `translateY(${(1 - k) * 160}px) rotate(${(1 - k) * -20}deg)`, opacity: k > 0.02 ? 1 : 0 };
              }}
            />
            <Chars
              text="First"
              style={{ color: C.ink }}
              charStyle={(i) => {
                const k = sp(f, 20 + i * 1.5, { damping: 12, stiffness: 200 });
                return { transform: `translateY(${(1 - k) * 160}px) rotate(${(1 - k) * 20}deg)`, opacity: k > 0.02 ? 1 : 0 };
              }}
            />
          </div>
          <div
            style={{
              marginTop: 26,
              fontFamily: DISPLAY,
              fontWeight: 500,
              fontSize: 50,
              letterSpacing: -1,
              color: C.white,
              opacity: tag,
              transform: `translateY(${(1 - tag) * 24}px)`,
            }}
          >
            Strangers knock first. <span style={{ fontWeight: 700 }}>Family opens the door.</span>
          </div>
          <div
            style={{
              marginTop: 54,
              transform: `scale(${cta})`,
              background: C.white,
              color: C.orangeDeep,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 38,
              padding: "18px 52px",
              borderRadius: 60,
              boxShadow: "0 16px 40px rgba(120,30,0,0.25)",
            }}
          >
            Get the Android app
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
