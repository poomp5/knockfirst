import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { expoInOut, mix, p, shake, sp } from "../anim";
import { RiseText, RollSwap } from "../components/Kinetic";
import { Notice, Phone } from "../components/Phone";
import { Blobs } from "../components/Shapes";
import { C, DISPLAY } from "../theme";

/** 38–50 s. Three verified features, 4 s each, each on its own full-screen color, cut on the downbeat. */
export function S5Features() {
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Alerts />
      <Sequence from={112}>
        <Wipe color="linear-gradient(135deg, #E7DEFF 0%, #FFC7DD 100%)">
          <Sequence from={8}>
            <Decide />
          </Sequence>
        </Wipe>
      </Sequence>
      <Sequence from={232}>
        <Wipe color="linear-gradient(160deg, #FFE8A3 0%, #FFB37A 100%)" angle={-1}>
          <Sequence from={8}>
            <GrandmaMode />
          </Sequence>
        </Wipe>
      </Sequence>
    </AbsoluteFill>
  );
}

/** Diagonal panel wipe that lands on the beat (8 frames before the section). */
function Wipe({ color, children, angle = 1 }: { color: string; children: React.ReactNode; angle?: number }) {
  const f = useCurrentFrame();
  const t = p(f, 0, 10, expoInOut);
  const x = (1 - t) * 130;
  const poly =
    angle > 0
      ? `polygon(${x}% 0, ${x + 140}% 0, ${x + 110}% 100%, ${x - 30}% 100%)`
      : `polygon(${-x - 40}% 0, ${100 - x}% 0, ${130 - x}% 100%, ${-x - 10}% 100%)`;
  return <AbsoluteFill style={{ background: color, clipPath: t >= 1 ? undefined : poly }}>{children}</AbsoluteFill>;
}

/* ---------- 1. Instant alerts (Update 04: notify the moment a stranger calls) ---------- */
function Alerts() {
  const f = useCurrentFrame();
  const phone = sp(f, 0, { damping: 15, stiffness: 120 });
  const notices = [
    { title: "Stranger calling Grandma Somsri", body: "092-345-6781 · AI is answering" },
    { title: "AI blocked this call (high risk)", body: "Sgt. Weeraphon · Claims to be police…" },
    { title: "Urgent: unknown call to review", body: "Nurse Arunee · Abnormal blood test…" },
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(150deg, #E3F3FF 0%, #9ED6FF 100%)" }}>
      <Blobs blobs={[{ x: 380, y: 980, r: 300, color: C.white, seed: 51, opacity: 0.5 }, { x: 1800, y: 120, r: 200, color: C.sky, seed: 52 }]} />
      <div style={{ position: "absolute", left: 170, top: mix(phone, 1100, 110), transform: `rotate(${(1 - phone) * -10 - 3}deg)` }}>
        <Phone width={420} layers={[{ src: "inbox" }]} />
      </div>
      <div style={{ position: "absolute", left: 760, top: 110, fontFamily: DISPLAY, fontWeight: 800, fontSize: 104, letterSpacing: -5, lineHeight: 1.0, color: C.ink }}>
        <RiseText text="Know the moment" start={2} stagger={0.7} />
        <br />
        <RiseText text="a stranger calls." start={8} stagger={0.7} />
      </div>
      {notices.map((n, i) => {
        const k = sp(f, 18 + i * 14, { damping: 13, stiffness: 170 });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 800 + i * 50,
              top: 400 + i * 175,
              transform: `translateX(${(1 - k) * 1300}px) rotate(${(1 - k) * 8 + (i - 1) * 1.2}deg) scale(1.75)`,
              transformOrigin: "0 0",
            }}
          >
            <Notice title={n.title} body={n.body} width={500} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ---------- 2. The family decides (allow list + blocked list) ---------- */
function Decide() {
  const f = useCurrentFrame();
  const phones = [
    { src: "blocked", x: 300, y: 250, rot: -8, w: 340, at: 4 },
    { src: "inbox", x: 1280, y: 250, rot: 8, w: 340, at: 8 },
    { src: "whitelist", x: 760, y: 150, rot: 0, w: 400, at: 0 },
  ];
  return (
    <AbsoluteFill>
      {/* giant word behind the phones, swapping on the beat */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 420, letterSpacing: -22, color: C.white, opacity: 0.95, marginTop: -330 }}>
          <RollSwap words={["Allow.", "Block.", "Decide."]} at={[30, 60]} stagger={1.5} />
        </div>
      </AbsoluteFill>
      {phones.map((ph) => {
        const k = sp(f, ph.at, { damping: 14, stiffness: 120 });
        return (
          <div key={ph.src} style={{ position: "absolute", left: ph.x, top: mix(k, 1150, ph.y), transform: `rotate(${ph.rot * k}deg)` }}>
            <Phone width={ph.w} layers={[{ src: ph.src }]} />
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 56,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 58,
          letterSpacing: -2,
          color: C.ink,
          opacity: p(f, 70, 14),
          transform: `translateY(${(1 - p(f, 70, 14)) * 30}px)`,
          textShadow: "0 2px 20px rgba(255,255,255,0.8)",
        }}
      >
        Your family decides who gets through.
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 3. Grandma mode (update 05): huge clock, calm screen, family rings through ---------- */
function GrandmaMode() {
  const f = useCurrentFrame();
  const phone = sp(f, 0, { damping: 15, stiffness: 120 });
  const ringAt = 58;
  const ring = p(f, ringAt, 12, expoInOut);
  const buzz = f > ringAt + 8 ? shake(f, ringAt + 8, 7, 0.01, 3.1) * (Math.floor((f - ringAt) / 8) % 2 ? 1 : 0.2) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 620,
            letterSpacing: -30,
            color: "transparent",
            WebkitTextStroke: "5px rgba(255,255,255,0.95)",
            transform: `scale(${1.15 - f * 0.0012})`,
          }}
        >
          09:41
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 760, top: mix(phone, 1150, 100), transform: `rotate(${buzz * 0.3}deg) translateX(${buzz}px)` }}>
        <Phone
          width={410}
          dark={ring > 0.5}
          layers={[
            { src: "grandma" },
            { src: "ring", ty: (1 - ring) * 852, dark: true, opacity: f >= ringAt ? 1 : 0 },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 110, top: 330, fontFamily: DISPLAY, fontWeight: 800, fontSize: 130, letterSpacing: -6, lineHeight: 1, color: C.ink }}>
        <RiseText text="Grandma" start={4} />
        <br />
        <RiseText text="mode." start={10} />
      </div>
      <div style={{ position: "absolute", left: 1250, top: 380, width: 600, fontFamily: DISPLAY, fontWeight: 700, fontSize: 70, letterSpacing: -3, lineHeight: 1.05, color: C.ink }}>
        <RollSwap words={["Big text.", "Calm screen.", "Family rings"]} at={[24, ringAt]} />
        <br />
        <div style={{ opacity: f >= ringAt + 4 ? 1 : 0, color: C.orangeDeep }}>
          <RiseText text="straight through." start={ringAt + 4} stagger={0.8} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
