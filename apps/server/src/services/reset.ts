import { db, FieldValue } from "../firebase";
import { paths } from "../contract";
import type { DocumentReference } from "firebase-admin/firestore";

async function deleteAll(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
}

/** Clean demo state: calls, blocked, non-seed whitelist, and this family's global reports. Seeds and pushTokens stay. */
export async function resetFamily(familyId: string) {
  const [calls, blocked, whitelist, reports] = await Promise.all([
    db.collection(paths.calls(familyId)).get(),
    db.collection(paths.blocked(familyId)).get(),
    db.collection(paths.whitelist(familyId)).get(),
    db.collection(paths.globalBlocklist()).where("reportedBy", "array-contains", familyId).get(),
  ]);
  const nonSeed = whitelist.docs.filter(d => d.get("addedBy") !== "seed");
  await deleteAll([...calls.docs, ...blocked.docs, ...nonSeed].map(d => d.ref));
  for (let i = 0; i < reports.docs.length; i += 400) {
    const batch = db.batch();
    reports.docs.slice(i, i + 400).forEach(d => batch.update(d.ref, { reportedBy: FieldValue.arrayRemove(familyId), updatedAt: FieldValue.serverTimestamp() }));
    await batch.commit();
  }
  return { calls: calls.size, blocked: blocked.size, whitelist: nonSeed.length, globalReports: reports.size };
}
