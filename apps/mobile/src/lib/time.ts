import { format, isSameDay, isYesterday } from "date-fns";
import { th } from "date-fns/locale";
import type { Ts } from "./contract";

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

/** Thai relative time: "เมื่อสักครู่", "5 นาทีที่แล้ว", "3 ชั่วโมงที่แล้ว", "เมื่อวาน 14:05", "12 ต.ค.". */
export function timeAgo(ts: MaybeTs): string {
  const d = tsToDate(ts);
  const now = new Date();
  const diffSec = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (diffSec < 60) return "เมื่อสักครู่";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24 && isSameDay(d, now)) return `${hr} ชั่วโมงที่แล้ว`;
  if (isYesterday(d)) return `เมื่อวาน ${format(d, "HH:mm")}`;
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  return format(d, "d MMM", { locale: th });
}

/** "14:05" */
export function formatClock(ts: MaybeTs): string {
  return format(tsToDate(ts), "HH:mm");
}

/** True when the timestamp falls on today's local date (null → now → true). */
export function isToday(ts: MaybeTs): boolean {
  return isSameDay(tsToDate(ts), new Date());
}
