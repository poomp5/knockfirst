// KnockFirst shared contract — identical copy in server, mobile, web-demo.
// Owner: Tete. Do not edit locally; ask Tete to bump the version.
export const CONTRACT_VERSION = 3;

export const DEFAULT_FAMILY_ID = "demo-family";
export const AUTO_BLOCK_SCORE = 85;          // server env AUTO_BLOCK_SCORE overrides
export const GLOBAL_BLOCK_THRESHOLD = 3;     // server env GLOBAL_BLOCK_THRESHOLD overrides
export const PUSH_CHANNEL_DEFAULT = "screened-calls";
export const PUSH_CHANNEL_URGENT = "urgent-calls";
export const PUSH_CHANNEL_LIVE = "live-calls";              // v2: "someone is calling now" (importance HIGH)
export const PUSH_CHANNEL_UPDATES = "call-updates";         // v2: silent result updates (importance LOW)
export const PUSH_CHANNEL_RING = "grandma-ring";            // v3: grandma's phone ringing (importance MAX, ringtone)
export const APK_ASSET_NAME = "knockfirst.apk";
export const ANDROID_PACKAGE = "com.knockfirst.guardian";

/** Works for both firebase (client) and firebase-admin Timestamps. */
export type Ts = { toDate(): Date };

// ---------- Firestore paths ----------
export const paths = {
  family: (f: string) => `families/${f}`,
  calls: (f: string) => `families/${f}/calls`,
  call: (f: string, callId: string) => `families/${f}/calls/${callId}`,
  whitelist: (f: string) => `families/${f}/whitelist`,
  whitelistEntry: (f: string, key: string) => `families/${f}/whitelist/${key}`,
  blocked: (f: string) => `families/${f}/blocked`,
  blockedEntry: (f: string, key: string) => `families/${f}/blocked/${key}`,
  globalBlocklist: () => `blocklist`,
  globalBlock: (key: string) => `blocklist/${key}`,
};

// ---------- Caller keys (document IDs for numbers) ----------
/** Normalize any caller id into the key used everywhere (whitelist/blocked/blocklist doc IDs). */
export function toCallerKey(raw: string): string {
  const s = (raw ?? "").trim();
  if (s.startsWith("client:")) return s;                 // browser caller from the web demo
  let d = s.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  else if (d.startsWith("0")) d = "+66" + d.slice(1);    // Thai local → E.164
  if (!d.startsWith("+")) d = "+" + d;
  return d;
}

/** +66812345678 → "081-234-5678"; client:judge-1 → "Web demo (judge-1)". */
export function formatCallerKey(key: string): string {
  if (key.startsWith("client:")) return `Web demo (${key.slice(7)})`;
  if (key.startsWith("+66") && key.length === 12) {
    const n = "0" + key.slice(3);
    return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return key;
}

// ---------- Documents ----------
export interface FamilyDoc {
  ownerName: string;             // shown in the guardian app only, e.g. "คุณยายสมศรี"
  ownerLabelForCallers: string;  // how the AI refers to her on the phone. Default "เจ้าของเบอร์นี้" (don't tell strangers her name)
  ownerPhone: string;            // E.164 real phone that rings for whitelisted callers
  guardianName: string;
  twilioNumber: string;          // E.164 number callers dial
  pushTokens: string[];          // FCM device tokens of guardian phones
  notifyOnIncoming?: boolean;    // v2: guardian setting; treat missing as true
  ownerPushTokens?: string[];    // v3: FCM tokens of phones in "grandma mode"
  createdAt: Ts;
}

export type WhitelistSource = "seed" | "guardian" | "contacts";
export interface WhitelistEntry {
  callerKey: string;
  displayName: string;
  note?: string | null;
  addedBy: WhitelistSource;
  addedAt: Ts;
  sourceCallId?: string | null;
}

export interface BlockedEntry {
  callerKey: string;
  displayName?: string | null;
  reason: "guardian" | "auto";
  addedAt: Ts;
  sourceCallId?: string | null;
}

export interface GlobalBlockEntry {
  callerKey: string;
  reportedBy: string[];          // familyIds. Blocked for everyone when length >= GLOBAL_BLOCK_THRESHOLD
  lastReason?: string | null;
  updatedAt: Ts;
}

export type CallRoute = "whitelist" | "blocked" | "screened";
export type CallStatus =
  | "forwarded"     // whitelisted → rang the owner
  | "rejected"      // on a blocklist → server rejected it
  | "screening"     // AI assistant is talking to the caller right now
  | "analyzing"     // call ended, analysis running
  | "needs_review"  // waiting for the guardian (push sent)
  | "auto_blocked"  // risk >= AUTO_BLOCK_SCORE, blocked automatically, no push
  | "no_message"    // caller hung up without saying anything useful
  | "accepted"      // guardian accepted → whitelisted
  | "blocked";      // guardian blocked

export interface TranscriptTurn {
  role: "assistant" | "caller";
  text: string;
  t: number;                     // seconds since call start
}

export type RedFlag =
  | "authority_claim"            // claims police/DSI/AMLO/bank/government/courier authority
  | "accusation_threat"          // accuses of a crime, threatens arrest/legal action/account freeze
  | "money_request"              // asks to transfer/pay/deposit/"verify" money
  | "personal_info_request"      // asks for ID number, OTP, PIN, bank/account info, address
  | "secrecy_isolation"          // tells her not to tell family, to stay alone, not to hang up
  | "channel_switch"             // asks to add LINE/Telegram/WhatsApp, video call, install an app
  | "urgency_pressure"           // pressure to act right now
  | "story_pivot"                // changes story when challenged (case → scholarship, etc.)
  | "unknown_target"             // doesn't know who they are calling
  | "refused_identity";          // won't give a name or organisation

export type RiskLevel = "low" | "medium" | "high";

export interface CallAnalysis {
  callerName: string | null;
  organization: string | null;
  targetPerson: string | null;   // who they asked for
  knewOwner: boolean | null;     // did they know who they were calling
  reason: string;                // Thai, one short sentence
  reasonEn: string | null;       // English, one short sentence (for the web demo)
  summary: string;               // Thai, 2–3 sentences written for the guardian
  summaryEn: string | null;      // English version (web demo / judges)
  callbackNumber: string | null; // E.164 if given
  urgency: "normal" | "urgent";  // "urgent" only for legit time-critical calls (never when riskScore >= 70)
  riskScore: number;             // 0–100
  riskLevel: RiskLevel;          // riskLevelFromScore(riskScore)
  redFlags: RedFlag[];
  evidence: { flag: RedFlag; quote: string }[]; // quotes copied from caller turns
  recommendedAction: "accept" | "review" | "block";
  source: "llm" | "rules" | "llm+rules";
  analyzedAt: string;            // ISO timestamp
}

export interface CallDoc {
  id: string;                    // = Twilio CallSid (or "sim_..." for simulated calls)
  familyId: string;
  callerKey: string;
  from: string;                  // raw From
  to: string;                    // raw To
  route: CallRoute;
  status: CallStatus;
  startedAt: Ts;
  endedAt?: Ts | null;
  durationSec?: number | null;
  conversationId?: string | null;    // ElevenLabs conversation id
  transcript?: TranscriptTurn[];
  analysis?: CallAnalysis | null;
  decision?: "accepted" | "blocked" | null;
  decidedAt?: Ts | null;
  notified?: boolean;            // push sent
  incomingNotified?: boolean;    // v2: true once the "calling now" push was sent
  channel?: "web" | "phone";                       // v3: which phone-line adapter the call came from (demo = "web")
  callerLabel?: string | null;                     // v3: optional name typed on the caller page (demo only)
  ownerResponse?: "answered" | "declined" | null;  // v3: grandma's tap on a whitelisted call
  simulated?: boolean;           // created by /dev/simulate-call
}

export function riskLevelFromScore(score: number): RiskLevel {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

// ---------- Push (FCM data payload; all values are strings) ----------
export interface PushData {
  type: "incoming_call" | "screened_call" | "call_update" | "owner_ring";
  familyId: string;
  callId: string;
  urgent: "0" | "1";
}

// ---------- UI copy (same words in app and web) ----------
export const STATUS_LABEL_TH: Record<CallStatus, string> = {
  forwarded: "คนรู้จัก · ต่อสายแล้ว",
  rejected: "อยู่ในบัญชีบล็อก · ตัดสายแล้ว",
  screening: "AI กำลังรับสาย…",
  analyzing: "กำลังสรุปบทสนทนา…",
  needs_review: "รอคุณตัดสินใจ",
  auto_blocked: "บล็อกอัตโนมัติ (เสี่ยงสูง)",
  no_message: "วางสายโดยไม่ฝากข้อความ",
  accepted: "อนุญาตแล้ว",
  blocked: "บล็อกแล้ว",
};
export const STATUS_LABEL_EN: Record<CallStatus, string> = {
  forwarded: "Known caller · connected",
  rejected: "On blocklist · rejected",
  screening: "AI is answering…",
  analyzing: "Summarizing…",
  needs_review: "Waiting for your decision",
  auto_blocked: "Auto-blocked (high risk)",
  no_message: "Hung up without a message",
  accepted: "Accepted",
  blocked: "Blocked",
};
export const RED_FLAG_LABEL_TH: Record<RedFlag, string> = {
  authority_claim: "อ้างเป็นเจ้าหน้าที่/หน่วยงาน",
  accusation_threat: "กล่าวหาหรือข่มขู่",
  money_request: "ขอให้โอน/ชำระเงิน",
  personal_info_request: "ขอข้อมูลส่วนตัว/OTP",
  secrecy_isolation: "ห้ามบอกคนอื่น",
  channel_switch: "ให้ย้ายไปคุยทางแอปอื่น",
  urgency_pressure: "เร่งรัด กดดัน",
  story_pivot: "เปลี่ยนเรื่องไปมา",
  unknown_target: "ไม่รู้ว่าโทรหาใคร",
  refused_identity: "ไม่ยอมบอกชื่อ",
};
export const RED_FLAG_LABEL_EN: Record<RedFlag, string> = {
  authority_claim: "Claims authority",
  accusation_threat: "Accusation / threat",
  money_request: "Asks for money",
  personal_info_request: "Asks for personal info / OTP",
  secrecy_isolation: "Asks for secrecy",
  channel_switch: "Moves to another app",
  urgency_pressure: "Pressure / urgency",
  story_pivot: "Story keeps changing",
  unknown_target: "Didn't know who they called",
  refused_identity: "Refused to give name",
};
export const RISK_LABEL_TH: Record<RiskLevel, string> = { low: "เสี่ยงต่ำ", medium: "ควรตรวจสอบ", high: "เสี่ยงสูง" };
export const RISK_LABEL_EN: Record<RiskLevel, string> = { low: "Low risk", medium: "Check first", high: "High risk" };
export const RISK_COLOR: Record<RiskLevel, string> = { low: "#1E8E5A", medium: "#D98E04", high: "#D93025" };
