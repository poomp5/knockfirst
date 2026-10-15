// Firestore rules tests. Run from firebase/: `bun run test` (starts the emulator, runs bun test, stops it).
// Client writes below copy the A6 recipes from the shared contract.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, test } from "bun:test";
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  arrayRemove, arrayUnion, collection, deleteDoc, doc, Firestore, getDoc, getDocs, serverTimestamp, setDoc,
  Timestamp, updateDoc, writeBatch,
} from "firebase/firestore";

const F = "demo-family";
const KEY = "+66900000101";
const CALL = "sim_test1";
const RING = "web_ring1"; // v3: whitelisted call ringing grandma
let env: RulesTestEnvironment;
let db: Firestore;   // anonymous guardian / web demo
let anon: Firestore; // not signed in

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-knockfirst",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8085 },
  });
});
afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const s = ctx.firestore();
    const now = Timestamp.now();
    await setDoc(doc(s, `families/${F}`), {
      ownerName: "คุณยายสมศรี", ownerLabelForCallers: "เจ้าของเบอร์นี้", ownerPhone: "+66800000009",
      guardianName: "ลูกหลาน", twilioNumber: "+6620000000", pushTokens: [], createdAt: now,
    });
    await setDoc(doc(s, "families/other-family"), { ownerName: "x", pushTokens: [], createdAt: now });
    await setDoc(doc(s, `families/${F}/calls/${CALL}`), {
      id: CALL, familyId: F, callerKey: KEY, from: KEY, to: "", route: "screened", status: "needs_review",
      startedAt: now, analysis: { riskScore: 40, reason: "ส่งของ", callerName: "สมชาย" }, decision: null,
    });
    await setDoc(doc(s, `families/${F}/calls/${RING}`), {
      id: RING, familyId: F, callerKey: "+66811112222", from: "0811112222", to: "", route: "whitelist", status: "forwarded",
      channel: "web", startedAt: now, analysis: null, decision: null, ownerResponse: null,
    });
  });
  db = env.authenticatedContext("anon-guardian", { firebase: { sign_in_provider: "anonymous" } }).firestore() as unknown as Firestore;
  anon = env.unauthenticatedContext().firestore() as unknown as Firestore;
});

const callRef = () => doc(db, `families/${F}/calls/${CALL}`);

function acceptBatch(d: Firestore, key = KEY) {
  const b = writeBatch(d);
  b.set(doc(d, `families/${F}/whitelist/${key}`), {
    callerKey: key, displayName: "สมชาย", note: "ส่งของ", addedBy: "guardian", addedAt: serverTimestamp(), sourceCallId: CALL,
  });
  b.delete(doc(d, `families/${F}/blocked/${key}`));
  b.update(doc(d, `families/${F}/calls/${CALL}`), { decision: "accepted", decidedAt: serverTimestamp(), status: "accepted" });
  return b;
}

function blockBatch(d: Firestore, reportedBy: unknown = arrayUnion(F)) {
  const b = writeBatch(d);
  b.set(doc(d, `families/${F}/blocked/${KEY}`), {
    callerKey: KEY, displayName: "สมชาย", reason: "guardian", addedAt: serverTimestamp(), sourceCallId: CALL,
  });
  b.delete(doc(d, `families/${F}/whitelist/${KEY}`));
  b.update(doc(d, `families/${F}/calls/${CALL}`), { decision: "blocked", decidedAt: serverTimestamp(), status: "blocked" });
  b.set(doc(d, `blocklist/${KEY}`), { callerKey: KEY, reportedBy, lastReason: "ส่งของ", updatedAt: serverTimestamp() }, { merge: true });
  return b;
}

describe("auth", () => {
  test("signed-out clients can't read anything", async () => {
    await assertFails(getDoc(doc(anon, `families/${F}`)));
    await assertFails(getDocs(collection(anon, `families/${F}/calls`)));
    await assertFails(getDoc(doc(anon, `blocklist/${KEY}`)));
  });
  test("signed-in clients can read the family, calls, lists and blocklist", async () => {
    await assertSucceeds(getDoc(doc(db, `families/${F}`)));
    await assertSucceeds(getDocs(collection(db, `families/${F}/calls`)));
    await assertSucceeds(getDocs(collection(db, `families/${F}/whitelist`)));
    await assertSucceeds(getDoc(doc(db, `blocklist/${KEY}`)));
  });
  test("debug/ is closed to everyone", async () => {
    await assertFails(getDoc(doc(db, "debug/x")));
    await assertFails(setDoc(doc(db, "debug/x"), { a: 1 }));
  });
});

describe("families/{f}", () => {
  test("register push token, edit settings, toggle notifyOnIncoming (v2)", async () => {
    await assertSucceeds(updateDoc(doc(db, `families/${F}`), { pushTokens: arrayUnion("fcm-token-1") }));
    await assertSucceeds(updateDoc(doc(db, `families/${F}`), { ownerName: "คุณยายสมใจ", guardianName: "ต้น", ownerPhone: "+66812345678" }));
    await assertSucceeds(updateDoc(doc(db, `families/${F}`), { notifyOnIncoming: false }));
  });
  test("can't change twilioNumber, create or delete families, or set junk values", async () => {
    await assertFails(updateDoc(doc(db, `families/${F}`), { twilioNumber: "+15550000000" }));
    await assertFails(setDoc(doc(db, "families/new-family"), { ownerName: "x" }));
    await assertFails(deleteDoc(doc(db, `families/${F}`)));
    await assertFails(updateDoc(doc(db, `families/${F}`), { ownerPhone: "call me maybe" }));
    await assertFails(updateDoc(doc(db, `families/${F}`), { notifyOnIncoming: "no" }));
  });
});

describe("v3: grandma mode", () => {
  const ringRef = () => doc(db, `families/${F}/calls/${RING}`);
  test("move a push token between guardian and grandma lists in one update", async () => {
    await assertSucceeds(updateDoc(doc(db, `families/${F}`), { ownerPushTokens: arrayUnion("fcm-1"), pushTokens: arrayRemove("fcm-1") }));
    await assertSucceeds(updateDoc(doc(db, `families/${F}`), { pushTokens: arrayUnion("fcm-1"), ownerPushTokens: arrayRemove("fcm-1") }));
  });
  test("ownerPushTokens must be a list", async () => {
    await assertFails(updateDoc(doc(db, `families/${F}`), { ownerPushTokens: "fcm-1" }));
  });
  test("grandma answers or declines a forwarded call", async () => {
    await assertSucceeds(updateDoc(ringRef(), { ownerResponse: "answered" }));
    await assertSucceeds(updateDoc(ringRef(), { ownerResponse: "declined" }));
  });
  test("ownerResponse: only on forwarded calls, only answered/declined, nothing else changed", async () => {
    await assertFails(updateDoc(callRef(), { ownerResponse: "answered" }));            // needs_review call
    await assertFails(updateDoc(ringRef(), { ownerResponse: "maybe" }));
    await assertFails(updateDoc(ringRef(), { ownerResponse: "answered", status: "accepted" }));
    await assertFails(updateDoc(ringRef(), { ownerResponse: "answered", endedAt: serverTimestamp() }));
  });
  test("conversations/ is server-only", async () => {
    await assertFails(getDoc(doc(db, "conversations/conv_1")));
    await assertFails(setDoc(doc(db, "conversations/conv_1"), { familyId: F, callId: RING }));
  });
});

describe("calls", () => {
  test("ACCEPT recipe succeeds", async () => { await assertSucceeds(acceptBatch(db).commit()); });
  test("BLOCK recipe succeeds (incl. global report)", async () => { await assertSucceeds(blockBatch(db).commit()); });
  test("clients can't create calls", async () => {
    await assertFails(setDoc(doc(db, `families/${F}/calls/fake`), { status: "needs_review", callerKey: KEY }));
  });
  test("clients can't edit analysis, transcript or set other statuses", async () => {
    await assertFails(updateDoc(callRef(), { "analysis.riskScore": 0 }));
    await assertFails(updateDoc(callRef(), { transcript: [] }));
    await assertFails(updateDoc(callRef(), { decision: "accepted", decidedAt: serverTimestamp(), status: "needs_review" }));
    await assertFails(updateDoc(callRef(), { decision: "accepted", decidedAt: Timestamp.fromMillis(0), status: "accepted" }));
  });
  test("clients can't delete calls", async () => { await assertFails(deleteDoc(callRef())); });
});

describe("whitelist / blocked", () => {
  test("ADD to whitelist manually + REMOVE", async () => {
    const ref = doc(db, `families/${F}/whitelist/+66812345678`);
    await assertSucceeds(setDoc(ref, {
      callerKey: "+66812345678", displayName: "หลานชาย", note: null, addedBy: "guardian", addedAt: serverTimestamp(), sourceCallId: null,
    }));
    await assertSucceeds(deleteDoc(ref));
  });
  test("web-demo browser identity is a valid key", async () => {
    await assertSucceeds(acceptBatch(db, "client:judge-ab12cd").commit());
  });
  test("whitelist: mismatched key, extra fields, addedBy seed, bad key are denied", async () => {
    const base = { displayName: "x", note: null, addedBy: "guardian", addedAt: serverTimestamp(), sourceCallId: null };
    await assertFails(setDoc(doc(db, `families/${F}/whitelist/+66812345678`), { ...base, callerKey: "+66999999999" }));
    await assertFails(setDoc(doc(db, `families/${F}/whitelist/+66812345678`), { ...base, callerKey: "+66812345678", isAdmin: true }));
    await assertFails(setDoc(doc(db, `families/${F}/whitelist/+66812345678`), { ...base, callerKey: "+66812345678", addedBy: "seed" }));
    await assertFails(setDoc(doc(db, `families/${F}/whitelist/abc`), { ...base, callerKey: "abc" }));
  });
  test("blocked: clients can't fake an auto-block", async () => {
    await assertFails(setDoc(doc(db, `families/${F}/blocked/${KEY}`), {
      callerKey: KEY, displayName: null, reason: "auto", addedAt: serverTimestamp(), sourceCallId: null,
    }));
  });
});

describe("global blocklist", () => {
  test("UNBLOCK recipe succeeds after a block", async () => {
    await assertSucceeds(blockBatch(db).commit());
    const b = writeBatch(db);
    b.delete(doc(db, `families/${F}/blocked/${KEY}`));
    b.set(doc(db, `blocklist/${KEY}`), { callerKey: KEY, reportedBy: arrayRemove(F), updatedAt: serverTimestamp() }, { merge: true });
    await assertSucceeds(b.commit());
  });
  test("UNBLOCK on a number nobody reported creates an empty entry (allowed)", async () => {
    await assertSucceeds(setDoc(doc(db, `blocklist/${KEY}`), { callerKey: KEY, reportedBy: arrayRemove(F), updatedAt: serverTimestamp() }, { merge: true }));
  });
  test("a second real family can add its report", async () => {
    await assertSucceeds(blockBatch(db).commit());
    await assertSucceeds(setDoc(doc(db, `blocklist/${KEY}`), {
      callerKey: KEY, reportedBy: arrayUnion("other-family"), updatedAt: serverTimestamp(),
    }, { merge: true }));
  });
  test("can't stuff reportedBy to force a global block", async () => {
    await assertFails(setDoc(doc(db, `blocklist/${KEY}`), {
      callerKey: KEY, reportedBy: [F, "other-family", "fake-3"], updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(blockBatch(db).commit());
    await assertFails(setDoc(doc(db, `blocklist/${KEY}`), {
      callerKey: KEY, reportedBy: arrayUnion("fake-2", "fake-3"), updatedAt: serverTimestamp(),
    }, { merge: true }));
  });
  test("can't report on behalf of a family that doesn't exist", async () => {
    await assertFails(setDoc(doc(db, `blocklist/${KEY}`), {
      callerKey: KEY, reportedBy: ["no-such-family"], updatedAt: serverTimestamp(),
    }));
  });
  test("can't remove another family's report and add a fake one in one write", async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), `blocklist/${KEY}`), { callerKey: KEY, reportedBy: ["other-family"], updatedAt: Timestamp.now() });
    });
    await assertFails(setDoc(doc(db, `blocklist/${KEY}`), { callerKey: KEY, reportedBy: [F], updatedAt: serverTimestamp() }));
  });
  test("can't add unknown fields or delete entries", async () => {
    await assertFails(setDoc(doc(db, `blocklist/${KEY}`), { callerKey: KEY, reportedBy: [], updatedAt: serverTimestamp(), score: 100 }));
    await assertSucceeds(blockBatch(db).commit());
    await assertFails(deleteDoc(doc(db, `blocklist/${KEY}`)));
  });
});
