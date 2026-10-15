import { db, FieldValue } from "../firebase";
import { paths, CallRoute, CallStatus } from "../contract";

export interface NewCall {
  id: string;
  familyId: string;
  callerKey: string;
  from: string;
  to: string;
  route: CallRoute;
  status: CallStatus;
  simulated?: boolean;
  channel?: "web" | "phone";
  callerLabel?: string | null;
}

export async function createCall(c: NewCall, extra: Record<string, unknown> = {}) {
  const defined = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined));
  await db.doc(paths.call(c.familyId, c.id)).set({
    ...defined,
    simulated: c.simulated ?? false,
    startedAt: FieldValue.serverTimestamp(),
    transcript: [],
    analysis: null,
    decision: null,
    notified: false,
    ...extra,
  });
}

/** Merge so a webhook that arrives before the call doc exists doesn't fail. */
export async function updateCall(familyId: string, id: string, patch: Record<string, unknown>) {
  await db.doc(paths.call(familyId, id)).set(patch, { merge: true });
}
