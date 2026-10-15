// Client write recipes (A6), each in one writeBatch. In mock mode the same actions mutate the mock store.
// Every action resolves to `true` on success (with a success haptic) and `false` on failure (Thai Alert + console.error).
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { formatCallerKey, paths, toCallerKey, type CallDoc, type FamilyDoc } from "./contract";
import { db, ensureSignedIn, FAMILY_ID, USE_MOCKS } from "./firebase";
import {
  mockAcceptCall,
  mockAddPushToken,
  mockAddWhitelist,
  mockBlockCall,
  mockRemoveWhitelist,
  mockUnblock,
  mockUpdateFamily,
} from "./mocks";

export type FamilyPatch = Partial<Pick<FamilyDoc, "ownerName" | "ownerLabelForCallers" | "ownerPhone" | "guardianName">>;

const ERROR_TITLE = "ทำรายการไม่สำเร็จ";
const ERROR_HINT = "กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง";

function successHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

async function run(label: string, errorMessage: string, work: () => Promise<void> | void): Promise<boolean> {
  try {
    if (!USE_MOCKS) await ensureSignedIn();
    await work();
    successHaptic();
    return true;
  } catch (e) {
    console.error(`[actions] ${label} failed`, e);
    Alert.alert(ERROR_TITLE, `${errorMessage}\n${ERROR_HINT}`);
    return false;
  }
}

function keyOf(call: CallDoc): string {
  return call.callerKey || toCallerKey(call.from);
}

/** ACCEPT a screened call → whitelist the caller, remove any block, mark the call accepted. */
export function acceptCall(call: CallDoc): Promise<boolean> {
  return run("acceptCall", "อนุญาตเบอร์นี้ไม่สำเร็จ", async () => {
    if (USE_MOCKS) return mockAcceptCall(call);
    const f = FAMILY_ID;
    const key = keyOf(call);
    const batch = writeBatch(db);
    batch.set(doc(db, paths.whitelistEntry(f, key)), {
      callerKey: key,
      displayName: call.analysis?.callerName ?? formatCallerKey(key),
      note: call.analysis?.reason ?? null,
      addedBy: "guardian",
      addedAt: serverTimestamp(),
      sourceCallId: call.id,
    });
    batch.delete(doc(db, paths.blockedEntry(f, key)));
    batch.update(doc(db, paths.call(f, call.id)), { decision: "accepted", decidedAt: serverTimestamp(), status: "accepted" });
    await batch.commit();
  });
}

/** BLOCK a screened call → block the caller, un-whitelist, mark the call blocked, report to the global blocklist. */
export function blockCall(call: CallDoc): Promise<boolean> {
  return run("blockCall", "บล็อกเบอร์นี้ไม่สำเร็จ", async () => {
    if (USE_MOCKS) return mockBlockCall(call);
    const f = FAMILY_ID;
    const key = keyOf(call);
    const batch = writeBatch(db);
    batch.set(doc(db, paths.blockedEntry(f, key)), {
      callerKey: key,
      displayName: call.analysis?.callerName ?? null,
      reason: "guardian",
      addedAt: serverTimestamp(),
      sourceCallId: call.id,
    });
    batch.delete(doc(db, paths.whitelistEntry(f, key)));
    batch.update(doc(db, paths.call(f, call.id)), { decision: "blocked", decidedAt: serverTimestamp(), status: "blocked" });
    batch.set(
      doc(db, paths.globalBlock(key)),
      { callerKey: key, reportedBy: arrayUnion(f), lastReason: call.analysis?.reason ?? null, updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
  });
}

/** UNBLOCK a number → remove family block + withdraw this family's global report. */
export function unblockNumber(callerKey: string): Promise<boolean> {
  return run("unblockNumber", "ปลดบล็อกไม่สำเร็จ", async () => {
    if (USE_MOCKS) return mockUnblock(callerKey);
    const f = FAMILY_ID;
    const key = callerKey;
    const batch = writeBatch(db);
    batch.delete(doc(db, paths.blockedEntry(f, key)));
    batch.set(
      doc(db, paths.globalBlock(key)),
      { callerKey: key, reportedBy: arrayRemove(f), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
  });
}

/** ADD to whitelist manually. Validates ≥9 digits (Thai Alert + false when invalid) and normalizes with toCallerKey. */
export async function addToWhitelist(displayName: string, rawPhone: string): Promise<boolean> {
  const name = displayName.trim();
  const digits = (rawPhone ?? "").replace(/\D/g, "");
  if (digits.length < 9) {
    Alert.alert("เบอร์โทรไม่ถูกต้อง", "กรุณากรอกเบอร์โทรอย่างน้อย 9 หลัก เช่น 081-234-5678");
    return false;
  }
  const key = toCallerKey(rawPhone);
  const label = name || formatCallerKey(key);
  return run("addToWhitelist", "เพิ่มเบอร์ไม่สำเร็จ", async () => {
    if (USE_MOCKS) return mockAddWhitelist(key, label);
    await setDoc(doc(db, paths.whitelistEntry(FAMILY_ID, key)), {
      callerKey: key,
      displayName: label,
      note: null,
      addedBy: "guardian",
      addedAt: serverTimestamp(),
      sourceCallId: null,
    });
  });
}

/** REMOVE from whitelist. */
export function removeFromWhitelist(callerKey: string): Promise<boolean> {
  return run("removeFromWhitelist", "ลบเบอร์ไม่สำเร็จ", async () => {
    if (USE_MOCKS) return mockRemoveWhitelist(callerKey);
    await deleteDoc(doc(db, paths.whitelistEntry(FAMILY_ID, callerKey)));
  });
}

/** EDIT family info. Empty/undefined fields are skipped; ownerPhone is normalized to E.164. */
export function updateFamily(patch: FamilyPatch): Promise<boolean> {
  const clean: FamilyPatch = {};
  (Object.keys(patch) as (keyof FamilyPatch)[]).forEach((k) => {
    const v = patch[k];
    if (typeof v !== "string") return;
    const t = v.trim();
    if (k === "ownerPhone") {
      if (t && /\d/.test(t)) clean.ownerPhone = toCallerKey(t);
      return;
    }
    if (t) clean[k] = t;
  });
  if (Object.keys(clean).length === 0) return Promise.resolve(true);
  return run("updateFamily", "บันทึกข้อมูลไม่สำเร็จ", async () => {
    if (USE_MOCKS) return mockUpdateFamily(clean);
    await updateDoc(doc(db, paths.family(FAMILY_ID)), clean);
  });
}

/** REGISTER push token (silent: no haptic, no Alert; used by push.ts). */
export async function registerPushToken(token: string): Promise<boolean> {
  try {
    if (USE_MOCKS) {
      mockAddPushToken(token);
      return true;
    }
    await ensureSignedIn();
    await updateDoc(doc(db, paths.family(FAMILY_ID)), { pushTokens: arrayUnion(token) });
    return true;
  } catch (e) {
    console.warn("[actions] registerPushToken failed", e);
    return false;
  }
}
