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
}

export async function createCall(c: NewCall, extra: Record<string, unknown> = {}) {
  await db.doc(paths.call(c.familyId, c.id)).set({
    ...c,
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
