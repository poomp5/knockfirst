import type { CSSProperties } from "react";
import { BAR_PATH, HANDSET_PATHS, LOGO_TRANSFORM, LOGO_VIEWBOX } from "./logoPaths";
import { C } from "../theme";

/** The KnockFirst mark built from its two real parts, so each can move: the bar (door) and the handset (knock). */
export function Mark({
  size,
  barY = 0,
  barOpacity = 1,
  handsetRotate = 0,
  handsetScale = 1,
  handsetOpacity = 1,
  barColor = C.ink,
  handsetColor = C.orange,
  style,
}: {
  size: number;
  barY?: number;
  barOpacity?: number;
  handsetRotate?: number;
  handsetScale?: number;
  handsetOpacity?: number;
  barColor?: string;
  handsetColor?: string;
  style?: CSSProperties;
}) {
  return (
    <svg width={size * (1312 / 1224)} height={size} viewBox={LOGO_VIEWBOX} style={{ overflow: "visible", ...style }}>
      <g transform={`translate(0 ${barY})`} opacity={barOpacity}>
        <g transform={LOGO_TRANSFORM} fill={barColor}>
          <path d={BAR_PATH} />
        </g>
      </g>
      <g
        opacity={handsetOpacity}
        transform={`translate(860 612) rotate(${handsetRotate}) scale(${handsetScale}) translate(-860 -612)`}
      >
        <g transform={LOGO_TRANSFORM} fill={handsetColor}>
          {HANDSET_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** App icon tile (white squircle + mark), matching brand/mobile/icon.png. */
export function IconTile({ size, style, ...mark }: { size: number; style?: CSSProperties } & Omit<Parameters<typeof Mark>[0], "size">) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        background: C.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 ${size * 0.12}px ${size * 0.28}px rgba(150,50,0,0.28), 0 ${size * 0.03}px ${size * 0.06}px rgba(0,0,0,0.08)`,
        ...style,
      }}
    >
      <Mark size={size * 0.62} {...mark} />
    </div>
  );
}
