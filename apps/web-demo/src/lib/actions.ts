// Guardian decisions: the A6 write recipes, identical to the mobile app.
import { arrayUnion, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { formatCallerKey, paths, type CallDoc } from "./contract";
import { FAMILY_ID } from "./env";
import { db, ensureSignedIn } from "./firebase";

export async function acceptCall(call: CallDoc): Promise<void> {
  if (!db) throw new Error("preview");
  await ensureSignedIn();
  const f = call.familyId || FAMILY_ID;
  const key = call.callerKey;
  const batch = writeBatch(db);
  batch.set(doc(db, paths.whitelistEntry(f, key)), {
    callerKey: key,
    displayName: call.analysis?.callerName ?? formatCallerKey(key),
    note: call.analysis?.reason ?? null,
    addedBy: "guardian", addedAt: serverTimestamp(), sourceCallId: call.id,
  });
  batch.delete(doc(db, paths.blockedEntry(f, key)));
  batch.update(doc(db, paths.call(f, call.id)), { decision: "accepted", decidedAt: serverTimestamp(), status: "accepted" });
  await batch.commit();
}

export async function blockCall(call: CallDoc): Promise<void> {
  if (!db) throw new Error("preview");
  await ensureSignedIn();
  const f = call.familyId || FAMILY_ID;
  const key = call.callerKey;
  const batch = writeBatch(db);
  batch.set(doc(db, paths.blockedEntry(f, key)), {
    callerKey: key, displayName: call.analysis?.callerName ?? null,
    reason: "guardian", addedAt: serverTimestamp(), sourceCallId: call.id,
  });
  batch.delete(doc(db, paths.whitelistEntry(f, key)));
  batch.update(doc(db, paths.call(f, call.id)), { decision: "blocked", decidedAt: serverTimestamp(), status: "blocked" });
  batch.set(doc(db, paths.globalBlock(key)), {
    callerKey: key, reportedBy: arrayUnion(f),
    lastReason: call.analysis?.reason ?? null, updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}
