// Line icons in the SF Symbols spirit (1.75 stroke, round caps). Replaces every emoji in the UI.
import type { SVGProps } from "react";

const PATHS = {
  truck: "M3 6.5h10.5v9H3zM13.5 9.5h4l3 3.2v2.8h-7M7 18.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5ZM17.5 18.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z",
  badge: "M12 3 5 6v5.5c0 4.3 3 7.9 7 9.5 4-1.6 7-5.2 7-9.5V6l-7-3ZM12 8.5l1.1 2.3 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3L12 8.5Z",
  cross: "M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9ZM12 8.5v6M9 11.5h6",
  bell: "M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 20.5a2 2 0 0 0 4 0",
  refresh: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4",
  undo: "M9 7.5 4.5 12 9 16.5M4.5 12h10a5 5 0 0 1 0 10h-2",
  headphones: "M4 15v-3a8 8 0 1 1 16 0v3M4 15.5A1.5 1.5 0 0 1 5.5 14H7v6H5.5A1.5 1.5 0 0 1 4 18.5v-3ZM20 15.5a1.5 1.5 0 0 0-1.5-1.5H17v6h1.5a1.5 1.5 0 0 0 1.5-1.5v-3Z",
  check: "M5 12.5 10 17.5 19 7",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.3l2.7 2.7L16 9.5",
  block: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  plus: "M12 5v14M5 12h14",
  home: "M4 11 12 4.5 20 11M6 9.5V19.5h4.5v-5h3v5H18V9.5",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 10.5v6M14 10.5v6",
  phoneOff: "M3 3l18 18M16.6 16.6A16 16 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1l-1.5 1.5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="icon" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}
