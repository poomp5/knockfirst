import { db } from "../firebase";
import { env } from "../env";
import { paths, FamilyDoc, GlobalBlockEntry } from "../contract";

export async function findFamilyIdByTwilioNumber(to: string): Promise<string> {
  if (to) {
    const q = await db.collection("families").where("twilioNumber", "==", to).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }
  return env.DEFAULT_FAMILY_ID;
}

export async function getFamily(familyId: string): Promise<FamilyDoc | null> {
  const s = await db.doc(paths.family(familyId)).get();
  return s.exists ? (s.data() as FamilyDoc) : null;
}

export async function isWhitelisted(f: string, key: string) {
  return (await db.doc(paths.whitelistEntry(f, key)).get()).exists;
}

export async function isBlocked(f: string, key: string) {
  const [own, g] = await Promise.all([db.doc(paths.blockedEntry(f, key)).get(), db.doc(paths.globalBlock(key)).get()]);
  if (own.exists) return true;
  return g.exists && ((g.data() as GlobalBlockEntry).reportedBy?.length ?? 0) >= env.GLOBAL_BLOCK_THRESHOLD;
}
