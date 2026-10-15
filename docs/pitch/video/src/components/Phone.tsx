import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { C, DISPLAY, THAI } from "../theme";

/** iPhone-class device in points: 393×852 screen, 13pt titanium bezel. Screens are real captures of the app. */
export const SCREEN_W = 393;
export const SCREEN_H = 852;
export const STATUS_H = 54;
const BEZEL = 13;
const OUT_W = SCREEN_W + BEZEL * 2;
const OUT_H = SCREEN_H + BEZEL * 2;

export type Layer = {
  /** file in public/shots without extension */
  src: string;
  /** scroll offset in points */
  y?: number;
  /** horizontal offset in points (iOS push transitions) */
  x?: number;
  opacity?: number;
  /** pin the bottom action bar of this (non-tall) capture over a scrolled tall capture */
  bar?: { src: string; top: number };
};

export function shot(src: string) {
  return staticFile(`shots/${src}.png`);
}

export function Phone({
  width,
  layers,
  dark = false,
  children,
  style,
  shadow = true,
}: {
  width: number;
  layers: Layer[];
  dark?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  shadow?: boolean;
}) {
  const s = width / OUT_W;
  return (
    <div style={{ width, height: OUT_H * s, position: "relative", ...style }}>
      <div
        style={{
          position: "absolute",
          width: OUT_W,
          height: OUT_H,
          transform: `scale(${s})`,
          transformOrigin: "0 0",
        }}
      >
        {/* body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 68,
            background: "linear-gradient(145deg, #3a3a3c 0%, #1d1d1f 35%, #0c0c0d 70%, #2c2c2e 100%)",
            boxShadow: shadow
              ? "0 50px 90px rgba(120,50,10,0.28), 0 18px 30px rgba(60,20,0,0.18), inset 0 0 0 1.5px rgba(255,255,255,0.18)"
              : "inset 0 0 0 1.5px rgba(255,255,255,0.18)",
          }}
        />
        {/* side buttons */}
        {[
          { left: -3, top: 150, h: 30 },
          { left: -3, top: 205, h: 58 },
          { left: -3, top: 275, h: 58 },
          { left: OUT_W - 1, top: 230, h: 90 },
        ].map((b, i) => (
          <div key={i} style={{ position: "absolute", left: b.left, top: b.top, width: 4, height: b.h, borderRadius: 2, background: "#2a2a2c" }} />
        ))}
        {/* screen */}
        <div
          style={{
            position: "absolute",
            left: BEZEL,
            top: BEZEL,
            width: SCREEN_W,
            height: SCREEN_H,
            borderRadius: 55,
            overflow: "hidden",
            background: dark ? "#1C1C1E" : C.iosBg,
          }}
        >
          {layers.map((l, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                opacity: l.opacity ?? 1,
                transform: `translateX(${l.x ?? 0}px)`,
                background: dark ? "#1C1C1E" : C.iosBg,
                overflow: "hidden",
              }}
            >
              <Img src={shot(l.src)} style={{ position: "absolute", left: 0, top: STATUS_H - (l.y ?? 0), width: SCREEN_W }} />
              {l.bar ? (
                <div style={{ position: "absolute", left: 0, right: 0, top: STATUS_H + l.bar.top, bottom: 0, overflow: "hidden" }}>
                  <Img src={shot(l.bar.src)} style={{ position: "absolute", left: 0, top: -l.bar.top, width: SCREEN_W }} />
                </div>
              ) : null}
              {/* status bar backdrop so scrolled content tucks under it */}
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: STATUS_H, background: dark ? "#1C1C1E" : C.iosBg }} />
            </div>
          ))}
          <StatusBar dark={dark} />
          {children}
          {/* home indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: (SCREEN_W - 134) / 2,
              width: 134,
              height: 5,
              borderRadius: 3,
              background: dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
            }}
          />
          {/* glass sheen */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 32%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBar({ dark }: { dark: boolean }) {
  const fg = dark ? "#fff" : "#000";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: STATUS_H }}>
      <div style={{ position: "absolute", left: 50, top: 17, fontFamily: DISPLAY, fontWeight: 600, fontSize: 17, color: fg, letterSpacing: -0.2 }}>
        9:41
      </div>
      {/* Dynamic Island */}
      <div style={{ position: "absolute", left: (SCREEN_W - 124) / 2, top: 11, width: 124, height: 36, borderRadius: 18, background: "#000" }} />
      <svg style={{ position: "absolute", right: 28, top: 21 }} width="78" height="14" viewBox="0 0 78 14">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 5.5} y={10 - i * 3} width={3.6} height={4 + i * 3} rx={1} fill={fg} />
        ))}
        <path d="M34 4.2a10 10 0 0 1 14 0l-1.6 1.7a7.6 7.6 0 0 0-10.8 0zM36.9 7.2a6 6 0 0 1 8.2 0l-1.6 1.6a3.7 3.7 0 0 0-5 0zM39.6 10.1l1.4-1.4 1.4 1.4L41 11.5z" fill={fg} />
        <rect x="53" y="1.5" width="22" height="11" rx="3.4" fill="none" stroke={fg} strokeOpacity={0.4} strokeWidth={1} />
        <rect x="55" y="3.5" width="18" height="7" rx="1.8" fill={fg} />
        <rect x="76" y="5" width="1.6" height="4" rx="0.8" fill={fg} fillOpacity={0.4} />
      </svg>
    </div>
  );
}

/** Touch indicator in screen points. `t` = frames since the touch. */
export function Tap({ x, y, t }: { x: number; y: number; t: number }) {
  if (t < -6 || t > 24) return null;
  const inP = Math.min(1, Math.max(0, (t + 6) / 6));
  const press = t < 0 ? 1 : t < 5 ? 1 - (t / 5) * 0.2 : 0.8 + Math.min(1, (t - 5) / 6) * 0.2;
  const fade = t > 12 ? Math.max(0, 1 - (t - 12) / 12) : 1;
  const ripple = Math.max(0, t) / 18;
  return (
    <div style={{ position: "absolute", left: 0, top: STATUS_H, width: 0, height: 0 }}>
      <div
        style={{
          position: "absolute",
          left: x - 26,
          top: y - 26,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(255,255,255,0.55)",
          border: "2px solid rgba(255,255,255,0.95)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          transform: `scale(${inP * press})`,
          opacity: fade,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 26,
          top: y - 26,
          width: 52,
          height: 52,
          borderRadius: 26,
          border: `3px solid ${C.white}`,
          transform: `scale(${1 + ripple * 1.4})`,
          opacity: t > 0 ? Math.max(0, 0.8 - ripple) : 0,
        }}
      />
    </div>
  );
}

/** iOS-style notification banner with the app's real push copy (server services/push.ts). */
export function Notice({ title, body, width = 377, style }: { title: string; body: string; width?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width,
        borderRadius: 24,
        background: "rgba(250,250,252,0.97)",
        boxShadow: "0 18px 40px rgba(60,20,0,0.22), 0 2px 6px rgba(0,0,0,0.08)",
        padding: "13px 15px",
        display: "flex",
        gap: 11,
        alignItems: "center",
        ...style,
      }}
    >
      <Img src={staticFile("brand/icon.png")} style={{ width: 38, height: 38, borderRadius: 9, boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: THAI, fontWeight: 700, fontSize: 15, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          <div style={{ fontFamily: THAI, fontSize: 13, color: "#8E8E93", marginLeft: 8 }}>ตอนนี้</div>
        </div>
        <div style={{ fontFamily: THAI, fontSize: 15, color: "#1c1c1e", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {body}
        </div>
      </div>
    </div>
  );
}
