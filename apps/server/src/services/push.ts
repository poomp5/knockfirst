import { messaging, db, FieldValue } from "../firebase";
import { paths, PUSH_CHANNEL_DEFAULT, PUSH_CHANNEL_URGENT, formatCallerKey, CallAnalysis, PushData } from "../contract";
import { getFamily } from "./families";

export async function notifyGuardians(familyId: string, callId: string, callerKey: string, a: CallAnalysis): Promise<boolean> {
  const fam = await getFamily(familyId);
  const tokens = fam?.pushTokens ?? [];
  if (!tokens.length) return false;
  const urgent = a.urgency === "urgent";
  const title = urgent ? "ด่วน: มีสายแปลกรอตรวจสอบ" : "มีสายแปลกรอตรวจสอบ";
  const body = `${a.callerName ?? formatCallerKey(callerKey)} · ${a.reason}`.slice(0, 100);
  const data: PushData = { type: "screened_call", familyId, callId, urgent: urgent ? "1" : "0" };
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: data as unknown as Record<string, string>,
    android: { priority: "high", notification: { channelId: urgent ? PUSH_CHANNEL_URGENT : PUSH_CHANNEL_DEFAULT } },
  });
  const dead = res.responses
    .map((r, i) => (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code ?? "") ? tokens[i] : null))
    .filter(Boolean) as string[];
  if (dead.length) await db.doc(paths.family(familyId)).update({ pushTokens: FieldValue.arrayRemove(...dead) });
  return res.successCount > 0;
}
