// "Call as" helpers for the caller page. localStorage is a per-browser convenience only (wrapped in try/catch).
import { toCallerKey } from "./contract";

/** Random Thai mobile in local format, e.g. 081-234-5678. */
export function randomThaiMobile(): string {
  const d = () => Math.floor(Math.random() * 10);
  const prefix = ["06", "08", "09"][Math.floor(Math.random() * 3)];
  const rest = Array.from({ length: 8 }, d).join("");
  return `${prefix}${rest[0]}-${rest.slice(1, 4)}-${rest.slice(4)}`;
}

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep in memory only */ }
}

export const loadLastNumber = (): string | null => read<string | null>("kf-last-number", null);
export const saveLastNumber = (n: string) => write("kf-last-number", n);

/** Caller keys this browser has called as, so their cards show "Your call". */
export const loadMyKeys = (): string[] => read<string[]>("kf-my-keys", []);
export function addMyKey(number: string): string[] {
  const key = toCallerKey(number);
  const keys = [key, ...loadMyKeys().filter(k => k !== key)].slice(0, 20);
  write("kf-my-keys", keys);
  return keys;
}
