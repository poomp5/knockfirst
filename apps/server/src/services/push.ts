import { messaging, db, FieldValue } from "../firebase";
import {
  paths, PUSH_CHANNEL_DEFAULT, PUSH_CHANNEL_URGENT, PUSH_CHANNEL_LIVE, PUSH_CHANNEL_UPDATES, PUSH_CHANNEL_RING,
  formatCallerKey, CallAnalysis, FamilyDoc, GlobalBlockEntry, PushData,
} from "../contract";
import { getFamily } from "./families";

export interface GuardianPush {
  title: string;
  body: string;
  data: PushData;
  channelId: string;
  tag: string;                 // = callId, so a later push for the same call replaces the earlier one
  priority: "high" | "normal";
}

type TokenField = "pushTokens" | "ownerPushTokens";

/** Sends to every phone in one token list of the family and removes dead tokens from that list. */
async function sendPush(familyId: string, field: TokenField, p: GuardianPush, fam?: FamilyDoc | null): Promise<boolean> {
  const family = fam === undefined ? await getFamily(familyId) : fam;
  const tokens = family?.[field] ?? [];
  if (!tokens.length) return false;
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: p.title, body: p.body.slice(0, 100) },
    data: p.data as unknown as Record<string, string>,
    android: { priority: p.priority, notification: { channelId: p.channelId, tag: p.tag } },
  });
  const dead = res.responses
    .map((r, i) => (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code ?? "") ? tokens[i] : null))
    .filter(Boolean) as string[];
  if (dead.length) await db.doc(paths.family(familyId)).update({ [field]: FieldValue.arrayRemove(...dead) });
  return res.successCount > 0;
}

/** Guardian phones (`pushTokens`). Pass `fam` if it was already read. */
export function sendToGuardians(familyId: string, p: GuardianPush, fam?: FamilyDoc | null): Promise<boolean> {
  return sendPush(familyId, "pushTokens", p, fam);
}

/** v3: a whitelisted caller rings grandma's phone (app in grandma mode, `ownerPushTokens`). */
export function notifyOwnerRing(familyId: string, callId: string, displayName: string): Promise<boolean> {
  return sendPush(familyId, "ownerPushTokens", {
    title: `📞 ${displayName} กำลังโทรหาคุณ`,
    body: "แตะเพื่อรับสาย",
    data: { type: "owner_ring", familyId, callId, urgent: "0" },
    channelId: PUSH_CHANNEL_RING,
    tag: callId,
    priority: "high",
  });
}

/** "Someone is calling grandma right now" — sent the moment an unknown call reaches /call/start. */
export async function notifyIncoming(familyId: string, callId: string, callerKey: string): Promise<boolean> {
  const [fam, g] = await Promise.all([getFamily(familyId), db.doc(paths.globalBlock(callerKey)).get()]);
  if (!fam || fam.notifyOnIncoming === false) return false;
  const reports = ((g.data() as GlobalBlockEntry | undefined)?.reportedBy ?? []).filter(f => f !== familyId).length;
  const sent = await sendToGuardians(familyId, {
    title: `📞 สายแปลกกำลังโทรหา${fam.ownerName || "คุณยาย"}`,
    body: `${formatCallerKey(callerKey)} · AI กำลังรับสายแทน` + (reports > 0 ? ` · ⚠️ ถูกรายงานแล้ว ${reports} ครั้ง` : ""),
    data: { type: "incoming_call", familyId, callId, urgent: "0" },
    channelId: PUSH_CHANNEL_LIVE,
    tag: callId,
    priority: "high",
  }, fam);
  if (sent) await db.doc(paths.call(familyId, callId)).set({ incomingNotified: true }, { merge: true });
  return sent;
}

/** needs_review: the guardian has to decide (replaces the "calling now" notification). */
export async function notifyGuardians(familyId: string, callId: string, callerKey: string, a: CallAnalysis): Promise<boolean> {
  const urgent = a.urgency === "urgent";
  return sendToGuardians(familyId, {
    title: urgent ? "ด่วน: มีสายแปลกรอตรวจสอบ" : "มีสายแปลกรอตรวจสอบ",
    body: `${a.callerName ?? formatCallerKey(callerKey)} · ${a.reason}`,
    data: { type: "screened_call", familyId, callId, urgent: urgent ? "1" : "0" },
    channelId: urgent ? PUSH_CHANNEL_URGENT : PUSH_CHANNEL_DEFAULT,
    tag: callId,
    priority: "high",
  });
}

/** Silent result that replaces the "calling now" notification; only if that one was sent. */
export async function notifyUpdate(
  familyId: string, callId: string, kind: "auto_blocked" | "no_message", callerKey: string, a: CallAnalysis | null,
): Promise<boolean> {
  const call = await db.doc(paths.call(familyId, callId)).get();
  if (call.get("incomingNotified") !== true) return false;
  const blocked = kind === "auto_blocked";
  return sendToGuardians(familyId, {
    title: blocked ? "AI บล็อกสายนี้แล้ว (เสี่ยงสูง)" : "ผู้โทรวางสายโดยไม่ฝากข้อความ",
    body: blocked ? `${a?.callerName ?? formatCallerKey(callerKey)} · ${a?.reason ?? ""}` : formatCallerKey(callerKey),
    data: { type: "call_update", familyId, callId, urgent: "0" },
    channelId: PUSH_CHANNEL_UPDATES,
    tag: callId,
    priority: "normal",
  });
}
