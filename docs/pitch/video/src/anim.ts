import { Easing, interpolate, spring } from "remotion";

export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const expoIn = Easing.bezier(0.7, 0, 0.84, 0);
export const expoInOut = Easing.bezier(0.87, 0, 0.13, 1);
export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);
export const smooth = Easing.bezier(0.45, 0, 0.55, 1);

/** 0→1 over [start, start+dur], clamped, eased. */
export function p(frame: number, start: number, dur: number, easing: (t: number) => number = expoOut) {
  return interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Map a 0..1 progress onto [a, b]. */
export const mix = (t: number, a: number, b: number) => a + (b - a) * t;

/** Spring that starts at `delay` frames. */
export function sp(frame: number, delay = 0, config: Partial<{ damping: number; stiffness: number; mass: number }> = {}, fps = 30) {
  return spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 170, mass: 1, ...config } });
}

/** Decaying vibration (phone buzz / impact shake). */
export function shake(frame: number, start: number, amp = 10, decay = 0.12, speed = 2.3) {
  const t = frame - start;
  if (t < 0) return 0;
  return Math.sin(t * speed) * amp * Math.exp(-t * decay);
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
