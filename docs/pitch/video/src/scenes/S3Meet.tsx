import { AbsoluteFill, useCurrentFrame } from "remotion";
import { expoInOut, expoOut, mix, p, sp } from "../anim";
import { IconTile } from "../components/Mark";
import { Phone, Tap } from "../components/Phone";
import { Blobs } from "../components/Shapes";
import layout from "../../public/shots/layout.json";
import { C, DISPLAY } from "../theme";

/** 15–22 s. The mark assembles (door bar + ringing handset), the wordmark slides out from behind the door, the phone rises. */
export function S3Meet() {
  const f = useCurrentFrame();

  const blobsIn = sp(f, 0, { damping: 16, stiffness: 90 });
  const icon = sp(f, 2, { damping: 11, stiffness: 180 });
  const barIn = p(f, 4, 16, expoOut);
  const handIn = sp(f, 10, { damping: 9, stiffness: 160 });
  const ringWiggle = f > 26 && f < 50 ? Math.sin((f - 26) * 1.6) * 14 * Math.exp(-(f - 26) * 0.08) : 0;

  // lockup → split
  const toLockup = p(f, 40, 26, expoInOut);
  const wordOut = p(f, 60, 26, expoOut);
  const split = p(f, 124, 30, expoInOut);
  const phoneUp = sp(f, 132, { damping: 15, stiffness: 110 });
  const sub = p(f, 86, 18, expoOut) * (1 - p(f, 118, 10));

  // lockup geometry (px): icon 220, gap 40, wordmark 200px Poppins 800
  const iconX = mix(toLockup, 960, 405) + split * -40;
  const iconScale = mix(toLockup, 1.25, 1) * icon * (1 - split);

  // welcome → tap guardian → push to inbox
  const g = layout.welcome.guardian;
  const tapAt = 176;
  const push = p(f, tapAt + 4, 16, expoInOut);

  return (
    <AbsoluteFill style={{ background: C.cream, overflow: "hidden" }}>
      <Blobs
        blobs={[
          { x: 140, y: 120, r: 260, color: C.yellow, seed: 1, scale: blobsIn },
          { x: 1800, y: 180, r: 230, color: C.pink, seed: 2, scale: blobsIn, opacity: 0.85 },
          { x: 1760, y: 980, r: 300, color: C.orange, seed: 3, scale: blobsIn },
          { x: 230, y: 960, r: 210, color: C.lavender, seed: 4, scale: blobsIn, opacity: 0.9 },
          { x: 1000, y: 1180, r: 180, color: C.sky, seed: 5, scale: blobsIn * 0.9, opacity: 0.8 },
        ]}
      />

      {/* wordmark */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }}>
        <div
          style={{
            position: "absolute",
            left: 535,
            top: mix(split, 540, 470),
            transform: "translateY(-50%)",
            overflow: split > 0 ? "visible" : "hidden",
            width: 1250,
            height: 300,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", transform: `translateX(${(1 - wordOut) * -1250}px)`, fontFamily: DISPLAY, fontWeight: 800, fontSize: 200, letterSpacing: -8, lineHeight: 1 }}>
            <span style={{ display: "inline-block", color: C.ink, transform: `translate(${split * -450}px, ${split * -60}px) scale(${1 + split * 0.15}) rotate(${split * -6}deg)` }}>Knock</span>
            <span style={{ display: "inline-block", color: C.orange, transform: `translate(${split * 110}px, ${split * 160}px) scale(${1 + split * 0.15}) rotate(${split * 6}deg)` }}>First</span>
          </div>
        </div>
      </div>

      {/* phone rising between the split wordmark */}
      <div
        style={{
          position: "absolute",
          left: 960 - 200,
          top: mix(phoneUp, 1150, 130),
          transform: `rotate(${(1 - phoneUp) * 8}deg)`,
        }}
      >
        <Phone
          width={400}
          layers={[
            { src: "welcome", x: push * -120, opacity: 1 - push * 0.3 },
            { src: "inbox", x: (1 - push) * 393, opacity: f >= tapAt + 4 ? 1 : 0 },
          ]}
        >
          <Tap x={g.x + g.w / 2} y={g.y + g.h / 2} t={f - tapAt} />
        </Phone>
      </div>

      {/* the icon: the door the name slides out from */}
      <div
        style={{
          position: "absolute",
          left: iconX - 110,
          top: 540 - 110,
          transform: `scale(${iconScale}) rotate(${(1 - icon) * -20}deg)`,
        }}
      >
        <IconTile size={220} barY={(1 - barIn) * 900} barOpacity={barIn} handsetRotate={(1 - handIn) * -70 + ringWiggle} handsetScale={handIn} />
      </div>

      {/* positioning line, from the team brief */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 720,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 500,
          fontSize: 50,
          color: C.inkSoft,
          letterSpacing: -1,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 30}px)`,
        }}
      >
        An AI call screener for elderly parents.
      </div>
    </AbsoluteFill>
  );
}
