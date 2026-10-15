import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { expoInOut, expoOut, mix, p, shake, sp } from "../anim";
import { Eyebrow, RiseText, RollSwap } from "../components/Kinetic";
import { Notice, Phone, Tap } from "../components/Phone";
import { Blobs } from "../components/Shapes";
import layout from "../../public/shots/layout.json";
import { C, DISPLAY } from "../theme";

/** Top of the sticky action bar in call-detail captures (button label top − button padding − bar padding). */
export const BAR_TOP = layout["call-police"].block.y - 26;

/**
 * 22–38 s. The real journey: stranger calls → the AI answers → the family sees the risk → one tap decides.
 * Four movements of 4 s each; the phone travels between compositions.
 */
export function S4App() {
  return (
    <AbsoluteFill style={{ background: C.cream, overflow: "hidden" }}>
      <Sequence durationInFrames={120}>
        <Calls />
      </Sequence>
      <Sequence from={120} durationInFrames={120}>
        <Asks />
      </Sequence>
      <Sequence from={240} durationInFrames={120}>
        <Risk />
      </Sequence>
      <Sequence from={360}>
        <Decide />
      </Sequence>
    </AbsoluteFill>
  );
}

/* ---------- 1. A stranger calls → the AI answers ---------- */
function Calls() {
  const f = useCurrentFrame();
  const move = sp(f, 0, { damping: 16, stiffness: 120 });
  const notice = sp(f, 14, { damping: 14, stiffness: 160 });
  const swap = 60;
  const sub = p(f, 74, 18);
  const exit = p(f, 108, 14, expoInOut);
  return (
    <AbsoluteFill>
      <Blobs
        blobs={[
          { x: 1350, y: 540, r: 470, color: C.peach, seed: 11 },
          { x: 1700, y: 160, r: 120, color: C.yellow, seed: 12, scale: sp(f, 4) },
          { x: 1000, y: 940, r: 90, color: C.orange, seed: 13, scale: sp(f, 8) },
        ]}
      />
      <div style={{ position: "absolute", left: 140, top: 330, fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, letterSpacing: -6, lineHeight: 1 }}>
        <div style={{ color: f >= swap ? C.orange : C.ink }}>
          {f < swap ? <RiseText text="A stranger" start={4} /> : <RollSwap words={["A stranger", "The AI"]} at={[swap]} />}
        </div>
        <div style={{ color: C.ink }}>
          {f < swap ? <RiseText text="calls." start={12} /> : <RollSwap words={["calls.", "answers."]} at={[swap + 4]} />}
        </div>
        <div style={{ marginTop: 34, fontSize: 40, fontWeight: 500, letterSpacing: -0.5, color: C.inkSoft, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
          You’re alerted the moment it rings.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: mix(move, 760, 1130),
          top: mix(move, 130, 92),
          transform: `translateX(${exit * -780}px) rotateY(${exit * 90}deg)`,
          transformOrigin: "50% 50%",
        }}
      >
        <Phone width={mix(move, 400, 440)} layers={[{ src: "inbox-sim-1" }]}>
          <div style={{ position: "absolute", left: 8, top: mix(notice, -120, 8) }}>
            <Notice title="Stranger calling Grandma Somsri" body="092-345-6781 · AI is answering" />
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 2. It asks who's calling, and why ---------- */
function Asks() {
  const f = useCurrentFrame();
  const flip = p(f, 0, 14, expoOut);
  const tr = layout["call-police-tall"].transcript.y;
  const scroll = interpolate(f, [0, 120], [tr - 40, tr + 230], { extrapolateRight: "clamp", easing: expoInOut });
  const q = "May I have your name and what this is about?";
  const typed = Math.floor(interpolate(f, [22, 60], [0, q.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const b1 = sp(f, 18, { damping: 13 });
  const b2 = sp(f, 68, { damping: 13 });
  const out = p(f, 112, 10, expoInOut);
  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <Blobs blobs={[{ x: 420, y: 560, r: 430, color: C.skySoft, seed: 21 }, { x: 1780, y: 980, r: 160, color: C.lavender, seed: 22, scale: sp(f, 10) }]} />
      <div style={{ position: "absolute", left: 230, top: 92, transform: `rotateY(${(1 - flip) * -90 + 8}deg) translateY(${out * 1100}px)` }}>
        <Phone width={440} layers={[{ src: "call-police-tall", y: scroll, bar: { src: "call-police", top: BAR_TOP } }]} />
      </div>
      <div style={{ position: "absolute", left: 830, top: 150, width: 960 }}>
        <Eyebrow color={C.orange} style={{ opacity: p(f, 4, 10) }}>
          The AI picks up first
        </Eyebrow>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, letterSpacing: -4, lineHeight: 1.02, color: C.ink, marginTop: 18 }}>
          <RiseText text="It asks who’s calling," start={6} stagger={0.8} />
          <br />
          <RiseText text="and why." start={14} stagger={1.2} />
        </div>
        {/* the AI's real greeting, typed into an app-style bubble */}
        <div
          style={{
            marginTop: 46,
            marginLeft: 120,
            background: C.orangeDeep,
            color: C.white,
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 44,
            lineHeight: 1.25,
            padding: "26px 36px",
            borderRadius: "38px 38px 10px 38px",
            transform: `scale(${b1})`,
            transformOrigin: "100% 100%",
            minHeight: 110,
            width: 760,
          }}
        >
          {q.slice(0, typed)}
          <span style={{ opacity: typed < q.length && f % 10 < 5 ? 1 : 0 }}>|</span>
        </div>
        <div
          style={{
            marginTop: 22,
            background: "#E9E9EB",
            color: C.ink,
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 40,
            lineHeight: 1.25,
            padding: "22px 34px",
            borderRadius: "38px 38px 38px 10px",
            transform: `scale(${b2})`,
            transformOrigin: "0% 100%",
            width: 720,
          }}
        >
          “This is Police Sergeant Weeraphon…”
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 3. You see the risk ---------- */
function Risk() {
  const f = useCurrentFrame();
  const inP = sp(f, 0, { damping: 16, stiffness: 120 });
  const score = Math.round(interpolate(f, [6, 40], [0, 92], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: expoOut }));
  const arc = interpolate(f, [6, 40], [0, 0.92], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: expoOut });
  const flagsAt = 62;
  const fl = layout["call-police-tall"].flags.y;
  const scroll = interpolate(f, [flagsAt, flagsAt + 40], [0, fl - 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: expoInOut });
  const shakeX = shake(f, 40, 8, 0.2);
  const R = 300;
  const len = Math.PI * R;
  const flags = ["Claims authority", "Accusation / threat", "Moves to another app", "Asks for secrecy", "Asks for money", "Asks for personal info / OTP"];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Blobs blobs={[{ x: 1400, y: 300, r: 520, color: "#FFE3DE", seed: 31 }]} />
      {/* extreme close-up of the real call detail */}
      <div style={{ position: "absolute", left: mix(inP, 1900, 1010), top: -70, transform: `rotate(${(1 - inP) * 10}deg)` }}>
        <Phone
          width={820}
          layers={[
            { src: "call-police-tall", y: scroll, bar: { src: "call-police", top: BAR_TOP } },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 110, top: 160, width: 820, transform: `translateX(${shakeX}px)` }}>
        {f < flagsAt ? (
          <>
            <svg width={2 * R + 40} height={R + 40} style={{ position: "absolute", left: -10, top: 20 }}>
              <path d={`M 20 ${R + 20} A ${R} ${R} 0 0 1 ${2 * R + 20} ${R + 20}`} fill="none" stroke="#ECECEC" strokeWidth={46} strokeLinecap="round" />
              <path
                d={`M 20 ${R + 20} A ${R} ${R} 0 0 1 ${2 * R + 20} ${R + 20}`}
                fill="none"
                stroke={C.danger}
                strokeWidth={46}
                strokeLinecap="round"
                strokeDasharray={`${len} ${len}`}
                strokeDashoffset={len * (1 - arc)}
              />
            </svg>
            <div style={{ position: "absolute", left: 0, width: 2 * R + 20, top: 120, textAlign: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: 250, letterSpacing: -12, color: C.ink, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ position: "absolute", left: 0, width: 2 * R + 20, top: 390, textAlign: "center", fontFamily: DISPLAY, fontWeight: 600, fontSize: 40, color: C.inkSoft }}>
              risk score
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                width: 2 * R + 20,
                top: 470,
                display: "flex",
                justifyContent: "center",
                transform: `scale(${sp(f, 38, { damping: 10 })})`,
              }}
            >
              <div style={{ background: C.danger, color: C.white, fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, padding: "10px 40px", borderRadius: 50 }}>High risk</div>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: DISPLAY }}>
            <div style={{ fontWeight: 900, fontSize: 150, letterSpacing: -7, lineHeight: 1, color: C.danger }}>
              <RiseText text="6 red flags." start={flagsAt + 2} stagger={1.2} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 52, color: C.ink, marginTop: 10, opacity: p(f, flagsAt + 10, 12) }}>Each one quoted from the call.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 40, width: 780 }}>
              {flags.map((fl, i) => {
                const k = sp(f, flagsAt + 14 + i * 3, { damping: 12, stiffness: 220 });
                return (
                  <div
                    key={fl}
                    style={{
                      background: "rgba(217,48,37,0.10)",
                      color: C.danger,
                      fontWeight: 700,
                      fontSize: 34,
                      padding: "10px 26px",
                      borderRadius: 40,
                      transform: `scale(${k}) translateY(${(1 - k) * 40}px)`,
                    }}
                  >
                    {fl}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 4. One tap: block the scam, let the nurse through ---------- */
function Decide() {
  const f = useCurrentFrame();
  const inP = sp(f, 0, { damping: 15, stiffness: 140 });
  const blk = layout["call-police"].block;
  const acc = layout["call-clinic"].accept;
  const tap1 = 24;
  const blocked = f >= tap1 + 6;
  const two = sp(f, 60, { damping: 16, stiffness: 120 });
  const tap2 = 82;
  const allowed = f >= tap2 + 6;
  const stamp = sp(f, tap1 + 6, { damping: 9, stiffness: 220 });
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <Blobs
        blobs={[
          { x: 300, y: 900, r: 260, color: "#FFE0DC", seed: 41, scale: sp(f, 2) },
          { x: 1660, y: 200, r: 240, color: "#DDF3E6", seed: 42, scale: two },
        ]}
      />
      {/* phone 1: scam call → Block & Report */}
      <div style={{ position: "absolute", left: mix(two, mix(inP, -500, 1100), 170), top: mix(two, 92, 150), transform: `rotate(${mix(two, 0, -4)}deg)` }}>
        <Phone width={mix(two, 440, 380)} layers={[{ src: "call-police" }, { src: "call-police-blocked", opacity: blocked ? 1 : 0 }]}>
          <Tap x={blk.x + blk.w / 2} y={blk.y + blk.h / 2} t={f - tap1} />
        </Phone>
      </div>
      {/* phone 2: the nurse → Allow this number */}
      <div style={{ position: "absolute", left: mix(two, 2000, 1370), top: 150, transform: `rotate(${mix(two, 12, 4)}deg)` }}>
        <Phone width={380} layers={[{ src: "call-clinic" }, { src: "call-clinic-accepted", opacity: allowed ? 1 : 0 }]}>
          <Tap x={acc.x + acc.w / 2} y={acc.y + acc.h / 2} t={f - tap2} />
        </Phone>
      </div>
      {/* typography */}
      <div style={{ position: "absolute", left: two > 0.5 ? 600 : 150, top: mix(two, 330, 290), width: 720, fontFamily: DISPLAY, textAlign: two > 0.5 ? "center" : "left", opacity: two < 0.5 ? 1 - two * 2 : (two - 0.5) * 2 }}>
        {f < tap1 + 6 ? (
          <div style={{ fontWeight: 800, fontSize: 170, letterSpacing: -8, color: C.ink, lineHeight: 1 }}>
            <RiseText text="One tap." start={2} stagger={1.5} />
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 900, fontSize: mix(two, 170, 130), letterSpacing: -7, color: C.danger, lineHeight: 1, transform: `scale(${mix(stamp, 1.8, 1)}) rotate(${(1 - stamp) * -8}deg)`, transformOrigin: "30% 50%" }}>
              Blocked.
            </div>
            <div style={{ fontWeight: 600, fontSize: 44, color: C.inkSoft, marginTop: 10, opacity: p(f, tap1 + 12, 10) }}>
              {two > 0.5 ? "and reported." : "And reported."}
            </div>
            <div style={{ height: 50 }} />
            {f >= tap2 + 6 ? (
              <div style={{ fontWeight: 900, fontSize: 130, letterSpacing: -7, color: C.success, lineHeight: 1, transform: `scale(${mix(sp(f, tap2 + 6, { damping: 9, stiffness: 220 }), 1.8, 1)})` }}>
                Allowed.
              </div>
            ) : null}
            {f >= tap2 + 14 ? (
              <div style={{ fontWeight: 600, fontSize: 38, color: C.inkSoft, marginTop: 14, opacity: p(f, tap2 + 14, 10) }}>
                Next time, she rings Grandma directly.
              </div>
            ) : null}
          </>
        )}
      </div>
    </AbsoluteFill>
  );
}
