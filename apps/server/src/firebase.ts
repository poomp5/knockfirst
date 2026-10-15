// firebase-admin v14 removed the namespaced API (admin.firestore() etc.) from task file B2; same exports via the modular API.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { env } from "./env";
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
export const db = getFirestore();
export const messaging = getMessaging();
export { FieldValue, Timestamp };
