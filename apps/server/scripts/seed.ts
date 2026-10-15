// npm run seed: creates/updates the demo family and seed whitelist. Safe to re-run; never wipes pushTokens.
import { db, FieldValue } from "../src/firebase";
import { env } from "../src/env";
import { paths, toCallerKey } from "../src/contract";

const EMERGENCY = ["191", "1669", "199", "1155"];

async function main() {
  const familyId = env.DEFAULT_FAMILY_ID;
  const ref = db.doc(paths.family(familyId));
  const isNew = !(await ref.get()).exists;
  await ref.set({
    ownerName: env.DEMO_OWNER_NAME,
    ownerLabelForCallers: "เจ้าของเบอร์นี้",
    guardianName: "ลูกหลาน",
    // Empty env values don't overwrite what's already stored.
    ...(env.DEMO_OWNER_PHONE || isNew ? { ownerPhone: env.DEMO_OWNER_PHONE ? toCallerKey(env.DEMO_OWNER_PHONE) : "" } : {}),
    ...(isNew ? { twilioNumber: "" } : {}), // no Twilio since update 05; field kept for the contract
    ...(isNew ? { pushTokens: [], createdAt: FieldValue.serverTimestamp() } : {}),
  }, { merge: true });

  const seeds = env.SEED_WHITELIST.split(";").map(s => s.trim()).filter(Boolean).map(pair => {
    const [name, num] = pair.split("|").map(s => s.trim());
    return { displayName: name, number: num };
  }).filter(s => s.displayName && s.number);
  const all = [...seeds, ...EMERGENCY.map(n => ({ displayName: `เบอร์ฉุกเฉิน ${n}`, number: n }))];

  const batch = db.batch();
  for (const s of all) {
    const callerKey = toCallerKey(s.number); // every doc id goes through toCallerKey()
    batch.set(db.doc(paths.whitelistEntry(familyId, callerKey)), {
      callerKey, displayName: s.displayName, note: null,
      addedBy: "seed", addedAt: FieldValue.serverTimestamp(), sourceCallId: null,
    });
  }
  await batch.commit();
  console.log(`seeded families/${familyId} (${isNew ? "new" : "updated"}) + ${all.length} whitelist entries`);
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
