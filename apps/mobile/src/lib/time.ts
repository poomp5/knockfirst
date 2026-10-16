import { format, isSameDay, isYesterday } from "date-fns";
import type { Ts } from "./contract";
import { dateLocale, getLang, t } from "./i18n";

type MaybeTs = Ts | null | undefined;

/** Ts → Date. null/undefined/invalid (e.g. pending server timestamp) → now. Never throws. */
export function tsToDate(ts: MaybeTs): Date {
  if (!ts) return new Date();
  try {
    const d = typeof ts.toDate === "function" ? ts.toDate() : null;
    return d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
  } catch {
    return new Date();
  }
}

/** Relative time in the current language (Thai default): "เมื่อสักครู่", "5 นาทีที่แล้ว", "3 ชั่วโมงที่แล้ว", "เมื่อวาน 14:05", "12 ต.ค.". */
export function timeAgo(ts: MaybeTs): string {
  const d = tsToDate(ts);
  const now = new Date();
  const diffSec = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (diffSec < 60) return t("time.justNow");
  const min = Math.floor(diffSec / 60);
  if (min < 60) return t("time.minAgo", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24 && isSameDay(d, now)) return t("time.hrAgo", { n: hr });
  if (isYesterday(d)) return t("time.yesterday", { time: format(d, "HH:mm") });
  if (hr < 24) return t("time.hrAgo", { n: hr });
  return format(d, "d MMM", { locale: dateLocale(getLang()) });
}

/** "14:05" */
export function formatClock(ts: MaybeTs): string {
  return format(tsToDate(ts), "HH:mm");
}

/** True when the timestamp falls on today's local date (null → now → true). */
export function isToday(ts: MaybeTs): boolean {
  return isSameDay(tsToDate(ts), new Date());
}
