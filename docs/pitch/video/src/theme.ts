import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadThai } from "@remotion/google-fonts/NotoSansThai";

// Brand display face (brand/colors.md: Poppins for the wordmark and Latin display).
export const DISPLAY = loadPoppins("normal", { weights: ["300", "400", "500", "600", "700", "800", "900"], subsets: ["latin"] }).fontFamily;
// The app's UI face, used when the film re-sets Thai notification copy.
export const THAI = loadThai("normal", { weights: ["400", "500", "600", "700"], subsets: ["thai", "latin"] }).fontFamily;

export const FPS = 30;
/** 120 BPM: one beat = 15 frames. The soundtrack (scripts/make-audio.mjs) uses the same grid. */
export const BEAT = 15;
export const TOTAL = 60 * FPS;

/** Scene boundaries in frames [start, end). */
export const T = {
  hook: [0, 210],
  problem: [210, 450],
  meet: [450, 660],
  app: [660, 1140],
  features: [1140, 1500],
  payoff: [1500, 1650],
  final: [1650, 1800],
} as const;

export const C = {
  cream: "#FFF7EE",
  paper: "#FFFCF8",
  ink: "#111111",
  inkSoft: "#4A4A4A",
  orange: "#F2611C", // brand primary
  orangeDeep: "#D9500F",
  coral: "#FF6F4E",
  hot: "#FF3D3D",
  peach: "#FFD9C2",
  apricot: "#FFB37A",
  yellow: "#FFC94A",
  butter: "#FFE8A3",
  sky: "#7CC8FF",
  skySoft: "#D6EEFF",
  pink: "#FF8FB8",
  lavender: "#B7A4FF",
  lilac: "#E7DEFF",
  // app + contract colors
  iosBg: "#F2F2F7",
  danger: "#D93025",
  success: "#1E8E5A",
  iosGreen: "#34C759",
  white: "#FFFFFF",
} as const;

/** Swift-style warm gradient (brand orange at its heart). */
export const SWIFT = `linear-gradient(135deg, #FFB547 0%, #F2611C 42%, #FF4D3D 78%, #FF5C8A 100%)`;
