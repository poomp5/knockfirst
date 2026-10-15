import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";

/** Smooth closed blob through N points (Catmull-Rom → cubic Bézier), wobbling with the frame. */
export function blobPath(cx: number, cy: number, r: number, frame: number, seed: number, points = 7, wobble = 0.14) {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + wobble * Math.sin(frame * 0.035 + seed * 1.7 + i * 2.1) + wobble * 0.5 * Math.sin(frame * 0.021 + i * 3.3 + seed);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d + " Z";
}

export type BlobSpec = { x: number; y: number; r: number; color: string; seed: number; scale?: number; opacity?: number };

/** Full-frame layer of soft, slowly morphing color blobs. */
export function Blobs({ blobs, blur = 0, style }: { blobs: BlobSpec[]; blur?: number; style?: CSSProperties }) {
  const f = useCurrentFrame();
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, filter: blur ? `blur(${blur}px)` : undefined, ...style }}>
      {blobs.map((b, i) => (
        <path
          key={i}
          d={blobPath(b.x, b.y, b.r * (b.scale ?? 1), f, b.seed)}
          fill={b.color}
          opacity={b.opacity ?? 1}
        />
      ))}
    </svg>
  );
}

/** A path that draws itself (stroke reveal) between progress 0..1. */
export function DrawPath({ d, progress, color, width, style }: { d: string; progress: number; color: string; width: number; style?: CSSProperties }) {
  if (progress <= 0) return null;
  const ev = evolvePath(Math.min(1, progress), d);
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={ev.strokeDasharray}
      strokeDashoffset={ev.strokeDashoffset}
      style={style}
    />
  );
}

/** Concentric "knock" arcs, like the waves in the KnockFirst mark. */
export function KnockWaves({ x, y, t, color, size = 1, flip = false }: { x: number; y: number; t: number; color: string; size?: number; flip?: boolean }) {
  if (t < 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -size : size} ${size})`}>
      {[0, 1].map((i) => {
        const k = Math.max(0, Math.min(1, (t - i * 3) / 10));
        const fade = Math.max(0, 1 - Math.max(0, t - 16 - i * 3) / 12);
        const r = 30 + i * 26;
        return (
          <path
            key={i}
            d={`M ${r * Math.cos(-0.9)} ${r * Math.sin(-0.9)} A ${r} ${r} 0 0 1 ${r * Math.cos(0.9)} ${r * Math.sin(0.9)}`}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            opacity={k * fade}
            transform={`scale(${0.6 + 0.4 * k})`}
          />
        );
      })}
    </g>
  );
}
