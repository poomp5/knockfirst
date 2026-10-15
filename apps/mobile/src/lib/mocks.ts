// In-memory mock store used when USE_MOCKS (B3). Hooks subscribe to it and actions mutate it,
// so the whole app is clickable offline. Never imports Firebase.
import {
  DEFAULT_FAMILY_ID,
  formatCallerKey,
  riskLevelFromScore,
  type BlockedEntry,
  type CallAnalysis,
  type CallDoc,
  type FamilyDoc,
  type TranscriptTurn,
  type Ts,
  type WhitelistEntry,
} from "./contract";
import { tsToDate } from "./time";

const MOCK_FAMILY_ID = process.env.EXPO_PUBLIC_FAMILY_ID || DEFAULT_FAMILY_ID;
const MIN = 60_000;
const HOUR = 60 * MIN;

/** A fixed point in time, `msAgo` before now. Has toDate() like a Firestore Timestamp. */
export function mockTs(msAgo = 0): Ts {
  const at = Date.now() - msAgo;
  return { toDate: () => new Date(at) };
}
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

// ---------- Rich analyses ----------

const POLICE_TRANSCRIPT: TranscriptTurn[] = [
  { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
  { role: "caller", t: 6, text: "ผมสิบตำรวจโทวีระพล จาก สภ.เมืองนนทบุรีครับ ขอสายเจ้าของเบอร์ด่วนเลยครับ" },
  { role: "assistant", t: 12, text: "เจ้าของเบอร์ไม่สะดวกรับสายตอนนี้ค่ะ รบกวนแจ้งเรื่องที่ติดต่อได้ไหมคะ" },
  { role: "caller", t: 17, text: "บัญชีธนาคารของเจ้าของเบอร์นี้ไปพัวพันกับคดีฟอกเงิน ถ้าไม่ให้ความร่วมมือภายในวันนี้จะถูกออกหมายจับครับ" },
  { role: "assistant", t: 27, text: "รบกวนขอเบอร์ติดต่อกลับของสถานีตำรวจได้ไหมคะ" },
  { role: "caller", t: 31, text: "ไม่ต้องโทรกลับครับ ให้แอดไลน์ไอดี police.nont แล้ววิดีโอคอลกับผมเดี๋ยวนี้เลย" },
  { role: "assistant", t: 39, text: "ดิฉันจะแจ้งครอบครัวให้ทราบนะคะ" },
  { role: "caller", t: 42, text: "เรื่องนี้เป็นความลับทางราชการ ห้ามบอกลูกหลานเด็ดขาด ไม่งั้นจะมีความผิดไปด้วย" },
  { role: "caller", t: 50, text: "ต้องโอนเงินในบัญชีทั้งหมดมาตรวจสอบที่บัญชีกลางของ ปปง. ก่อน แล้วจะคืนให้ภายใน 24 ชั่วโมง" },
  { role: "caller", t: 58, text: "แล้วขอเลขบัตรประชาชนกับเลข OTP ที่ส่งไปทาง SMS ด้วยนะครับ" },
  { role: "assistant", t: 64, text: "ขอบคุณค่ะ ดิฉันจะส่งเรื่องให้ครอบครัวตรวจสอบนะคะ สวัสดีค่ะ" },
];

const POLICE_ANALYSIS: CallAnalysis = {
  callerName: "ส.ต.ท. วีระพล",
  organization: "สภ.เมืองนนทบุรี (อ้าง)",
  targetPerson: null,
  knewOwner: false,
  reason: "อ้างเป็นตำรวจ ขู่ว่าบัญชีพัวพันคดีฟอกเงิน และให้โอนเงิน",
  reasonEn: "Claims to be police, threatens a money-laundering case and asks for a transfer.",
  summary:
    "ผู้โทรอ้างว่าเป็นตำรวจ สภ.เมืองนนทบุรี บอกว่าบัญชีของคุณยายพัวพันคดีฟอกเงินและขู่จะออกหมายจับ " +
    "สั่งให้แอดไลน์ วิดีโอคอล โอนเงินทั้งหมดไปบัญชี “ตรวจสอบ” และขอเลข OTP พร้อมห้ามบอกลูกหลาน เป็นรูปแบบแก๊งคอลเซ็นเตอร์ชัดเจน",
  summaryEn:
    "Caller posed as a police officer, claimed grandma's account is linked to money laundering and threatened arrest. " +
    "Demanded a LINE video call, a full transfer to a 'verification' account, her OTP, and secrecy from family. Classic call-center scam.",
  callbackNumber: null,
  urgency: "normal",
  riskScore: 92,
  riskLevel: riskLevelFromScore(92),
  redFlags: [
    "authority_claim",
    "accusation_threat",
    "money_request",
    "personal_info_request",
    "secrecy_isolation",
    "channel_switch",
    "urgency_pressure",
    "unknown_target",
  ],
  evidence: [
    { flag: "authority_claim", quote: "ผมสิบตำรวจโทวีระพล จาก สภ.เมืองนนทบุรีครับ" },
    { flag: "accusation_threat", quote: "ถ้าไม่ให้ความร่วมมือภายในวันนี้จะถูกออกหมายจับครับ" },
    { flag: "channel_switch", quote: "ให้แอดไลน์ไอดี police.nont แล้ววิดีโอคอลกับผมเดี๋ยวนี้เลย" },
    { flag: "secrecy_isolation", quote: "ห้ามบอกลูกหลานเด็ดขาด ไม่งั้นจะมีความผิดไปด้วย" },
    { flag: "money_request", quote: "ต้องโอนเงินในบัญชีทั้งหมดมาตรวจสอบที่บัญชีกลางของ ปปง. ก่อน" },
    { flag: "personal_info_request", quote: "ขอเลขบัตรประชาชนกับเลข OTP ที่ส่งไปทาง SMS ด้วยนะครับ" },
  ],
  recommendedAction: "block",
  source: "llm+rules",
  analyzedAt: iso(39 * MIN),
};

const RIDER_TRANSCRIPT: TranscriptTurn[] = [
  { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
  { role: "caller", t: 5, text: "สวัสดีครับ ผมสมชาย ไรเดอร์จากแฟลช เอ็กซ์เพรสครับ มีพัสดุมาส่งคุณสมศรีครับ" },
  { role: "assistant", t: 11, text: "ได้ค่ะ พัสดุเป็นอะไร และต้องชำระเงินไหมคะ" },
  { role: "caller", t: 15, text: "เป็นกล่องยาจากร้านขายยาครับ จ่ายออนไลน์มาแล้ว ไม่ต้องจ่ายเพิ่มครับ" },
  { role: "caller", t: 21, text: "ตอนนี้ผมอยู่หน้าบ้านซอยประชาชื่น 12 แล้ว กดกริ่งไม่มีคนเปิดครับ ฝากไว้กับ รปภ. ได้ไหมครับ" },
  { role: "assistant", t: 30, text: "ดิฉันจะแจ้งครอบครัวให้ค่ะ ถ้าจะติดต่อกลับ ติดต่อเบอร์ไหนได้คะ" },
  { role: "caller", t: 35, text: "เบอร์นี้ได้เลยครับ หรือ 089-555-1234 ครับ ขอบคุณครับ" },
];

const RIDER_ANALYSIS: CallAnalysis = {
  callerName: "สมชาย",
  organization: "แฟลช เอ็กซ์เพรส",
  targetPerson: "คุณสมศรี",
  knewOwner: true,
  reason: "ไรเดอร์มาส่งพัสดุ (ยา) ที่จ่ายเงินแล้ว รออยู่หน้าบ้าน",
  reasonEn: "Delivery rider with a prepaid parcel (medicine), waiting at the door.",
  summary:
    "ไรเดอร์แฟลช เอ็กซ์เพรสชื่อสมชาย นำกล่องยาที่ชำระเงินแล้วมาส่งคุณสมศรี ตอนนี้อยู่หน้าบ้านแต่ไม่มีคนเปิด " +
    "ขอฝากไว้กับ รปภ. ไม่ได้ขอเงินหรือข้อมูลส่วนตัว",
  summaryEn:
    "Flash Express rider Somchai has a prepaid medicine parcel for Somsri and is at the door. " +
    "Asks to leave it with security. No money or personal info requested.",
  callbackNumber: "+66895551234",
  urgency: "normal",
  riskScore: 8,
  riskLevel: riskLevelFromScore(8),
  redFlags: [],
  evidence: [],
  recommendedAction: "accept",
  source: "llm",
  analyzedAt: iso(11 * MIN),
};

const CLINIC_TRANSCRIPT: TranscriptTurn[] = [
  { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
  { role: "caller", t: 6, text: "สวัสดีค่ะ ดิฉันพยาบาลอรุณี จากคลินิกอายุรกรรมบ้านสุขภาพดีค่ะ โทรหาคุณสมศรี ศรีสุข ค่ะ" },
  { role: "assistant", t: 13, text: "เจ้าของเบอร์ไม่สะดวกรับสายค่ะ แจ้งเรื่องไว้ได้เลยนะคะ" },
  { role: "caller", t: 17, text: "ผลตรวจเลือดเมื่อวานค่าโพแทสเซียมสูงผิดปกติค่ะ คุณหมออยากให้มาพบภายในบ่ายนี้ค่ะ" },
  { role: "caller", t: 25, text: "ไม่ต้องเตรียมเงินหรือเอกสารอะไรค่ะ ถือบัตรนัดเดิมมาได้เลย" },
  { role: "assistant", t: 31, text: "ขอเบอร์ติดต่อกลับของคลินิกด้วยค่ะ" },
  { role: "caller", t: 34, text: "โทรกลับได้ที่ 02-123-4567 ต่อ 105 ค่ะ ขอบคุณค่ะ" },
];

const CLINIC_ANALYSIS: CallAnalysis = {
  callerName: "พยาบาลอรุณี",
  organization: "คลินิกอายุรกรรมบ้านสุขภาพดี",
  targetPerson: "คุณสมศรี ศรีสุข",
  knewOwner: true,
  reason: "ผลเลือดผิดปกติ แพทย์ขอให้มาพบภายในบ่ายนี้",
  reasonEn: "Abnormal blood test; the doctor wants to see her this afternoon.",
  summary:
    "พยาบาลจากคลินิกอายุรกรรมบ้านสุขภาพดีแจ้งว่าผลตรวจเลือดของคุณยายมีค่าโพแทสเซียมสูงผิดปกติ " +
    "แพทย์อยากให้มาพบภายในบ่ายนี้ ไม่ได้ขอเงินหรือข้อมูลส่วนตัว และให้เบอร์คลินิกไว้โทรกลับ",
  summaryEn:
    "A nurse from the clinic says grandma's potassium level is abnormally high and the doctor wants to see her this afternoon. " +
    "No money or personal info requested; left the clinic's number.",
  callbackNumber: "+6621234567",
  urgency: "urgent",
  riskScore: 15,
  riskLevel: riskLevelFromScore(15),
  redFlags: [],
  evidence: [],
  recommendedAction: "accept",
  source: "llm",
  analyzedAt: iso(4 * MIN),
};

// ---------- Lighter analyses ----------

const SILENT_ANALYSIS: CallAnalysis = {
  callerName: null,
  organization: null,
  targetPerson: null,
  knewOwner: false,
  reason: "ไม่ยอมบอกชื่อและวางสายก่อนแจ้งธุระ",
  reasonEn: "Refused to give a name and hung up before stating the purpose.",
  summary: "ผู้โทรถามว่า “ใช่บ้านคุณป้าหรือเปล่า” แต่ไม่ยอมบอกชื่อหรือธุระ แล้ววางสายไป ควรรอดูว่าจะโทรมาอีกไหม",
  summaryEn: "Caller asked if this was 'auntie's house' but would not give a name or reason, then hung up.",
  callbackNumber: null,
  urgency: "normal",
  riskScore: 48,
  riskLevel: riskLevelFromScore(48),
  redFlags: ["refused_identity", "unknown_target"],
  evidence: [
    { flag: "unknown_target", quote: "ใช่บ้านคุณป้าหรือเปล่าครับ" },
    { flag: "refused_identity", quote: "ไม่ต้องรู้หรอกว่าใคร เดี๋ยวโทรมาใหม่" },
  ],
  recommendedAction: "review",
  source: "rules",
  analyzedAt: iso(2 * HOUR),
};

const PHARMACY_ANALYSIS: CallAnalysis = {
  callerName: "ภญ.กมลวรรณ",
  organization: "ร้านยาเภสัชใจดี",
  targetPerson: "คุณสมศรี",
  knewOwner: true,
  reason: "แจ้งว่ายาความดันที่สั่งไว้มาถึงร้านแล้ว",
  reasonEn: "Says the blood-pressure medicine she ordered has arrived.",
  summary: "เภสัชกรจากร้านยาเภสัชใจดีโทรแจ้งคุณสมศรีว่ายาความดันที่สั่งไว้มาถึงแล้ว มารับได้ทุกวัน ไม่มีการขอเงินล่วงหน้า",
  summaryEn: "Pharmacist says the ordered blood-pressure medicine has arrived and can be picked up any day.",
  callbackNumber: "+66812223333",
  urgency: "normal",
  riskScore: 12,
  riskLevel: riskLevelFromScore(12),
  redFlags: [],
  evidence: [],
  recommendedAction: "accept",
  source: "llm",
  analyzedAt: iso(26 * HOUR),
};

const INVEST_ANALYSIS: CallAnalysis = {
  callerName: "คุณเจน",
  organization: "บริษัทลงทุนทองคำ (ไม่ระบุชื่อ)",
  targetPerson: null,
  knewOwner: false,
  reason: "ชวนลงทุนทองคำ การันตีกำไร 30% ต่อเดือน ให้แอดไลน์",
  reasonEn: "Gold investment pitch promising 30% monthly returns; asks to add LINE.",
  summary:
    "ผู้โทรชวนลงทุนทองคำออนไลน์ อ้างว่าได้กำไร 30% ต่อเดือนแน่นอน เร่งให้ตัดสินใจวันนี้ และให้แอดไลน์เพื่อโอนเงินมัดจำ",
  summaryEn: "Online gold investment pitch with 'guaranteed' 30% monthly returns, pressure to decide today and move to LINE.",
  callbackNumber: null,
  urgency: "normal",
  riskScore: 74,
  riskLevel: riskLevelFromScore(74),
  redFlags: ["money_request", "channel_switch", "urgency_pressure", "unknown_target"],
  evidence: [
    { flag: "money_request", quote: "โอนมัดจำแค่ห้าพันก่อน เดือนหน้าได้คืนหกพันห้า" },
    { flag: "channel_switch", quote: "แอดไลน์มาคุยรายละเอียดนะคะ" },
    { flag: "urgency_pressure", quote: "โปรนี้หมดวันนี้นะคะ" },
  ],
  recommendedAction: "block",
  source: "llm",
  analyzedAt: iso(30 * HOUR),
};

// ---------- Seed state ----------

export interface MockState {
  family: FamilyDoc;
  calls: CallDoc[];
  whitelist: WhitelistEntry[];
  blocked: BlockedEntry[];
}

const POLICE_KEY = "+66923456781";
const INVEST_KEY = "+66634445555";
const PHARMACY_KEY = "+66812223333";

function base(id: string, callerKey: string, msAgo: number): Omit<CallDoc, "route" | "status"> {
  return {
    id,
    familyId: MOCK_FAMILY_ID,
    callerKey,
    from: callerKey,
    to: "+6620000000",
    startedAt: mockTs(msAgo),
    endedAt: null,
    durationSec: null,
    conversationId: null,
    transcript: [],
    analysis: null,
    decision: null,
    decidedAt: null,
    notified: false,
    simulated: true,
  };
}

function seedState(): MockState {
  const calls: CallDoc[] = [
    {
      // Edge case: server timestamp still pending → startedAt is null for a moment.
      ...base("mock_screening", "+66912345678", 0),
      startedAt: null as unknown as Ts,
      route: "screened",
      status: "screening",
      transcript: [
        { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
        { role: "caller", t: 5, text: "ครับ ผมโทรจาก…" },
      ],
    },
    {
      ...base("mock_analyzing", "+66876543210", 1 * MIN),
      route: "screened",
      status: "analyzing",
      endedAt: mockTs(0.5 * MIN),
      durationSec: 34,
      transcript: [
        { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
        { role: "caller", t: 6, text: "สวัสดีครับ ผมช่างแอร์จากร้านเย็นสบาย จะขอนัดเข้าไปล้างแอร์พรุ่งนี้ครับ" },
      ],
    },
    {
      ...base("mock_clinic", "+6621234567", 5 * MIN),
      route: "screened",
      status: "needs_review",
      endedAt: mockTs(4.5 * MIN),
      durationSec: 38,
      transcript: CLINIC_TRANSCRIPT,
      analysis: CLINIC_ANALYSIS,
      notified: true,
    },
    {
      // Browser call from the web demo (judge plays a delivery rider).
      ...base("mock_rider", "client:judge-1", 12 * MIN),
      from: "client:judge-1",
      route: "screened",
      status: "needs_review",
      endedAt: mockTs(11.4 * MIN),
      durationSec: 40,
      transcript: RIDER_TRANSCRIPT,
      analysis: RIDER_ANALYSIS,
      notified: true,
    },
    {
      ...base("mock_police", POLICE_KEY, 40 * MIN),
      route: "screened",
      status: "auto_blocked",
      endedAt: mockTs(39 * MIN),
      durationSec: 68,
      transcript: POLICE_TRANSCRIPT,
      analysis: POLICE_ANALYSIS,
    },
    {
      ...base("mock_silent", "+66998887777", 2 * HOUR),
      route: "screened",
      status: "no_message",
      endedAt: mockTs(2 * HOUR - 15_000),
      durationSec: 14,
      transcript: [
        { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
        { role: "caller", t: 4, text: "ใช่บ้านคุณป้าหรือเปล่าครับ" },
        { role: "assistant", t: 7, text: "ขอทราบชื่อผู้โทรก่อนนะคะ" },
        { role: "caller", t: 10, text: "ไม่ต้องรู้หรอกว่าใคร เดี๋ยวโทรมาใหม่" },
      ],
      analysis: SILENT_ANALYSIS,
    },
    {
      ...base("mock_forwarded", "+66800000001", 5 * HOUR),
      route: "whitelist",
      status: "forwarded",
      endedAt: mockTs(5 * HOUR - 184_000),
      durationSec: 184,
    },
    {
      ...base("mock_rejected", POLICE_KEY, 20 * HOUR),
      route: "blocked",
      status: "rejected",
      endedAt: mockTs(20 * HOUR - 2_000),
      durationSec: 0,
    },
    {
      ...base("mock_accepted", PHARMACY_KEY, 26 * HOUR),
      route: "screened",
      status: "accepted",
      endedAt: mockTs(26 * HOUR - 30_000),
      durationSec: 30,
      transcript: [
        { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
        { role: "caller", t: 5, text: "สวัสดีค่ะ เภสัชกมลวรรณจากร้านยาเภสัชใจดีค่ะ ยาความดันที่คุณสมศรีสั่งไว้มาถึงแล้วค่ะ" },
        { role: "caller", t: 14, text: "มารับที่ร้านได้ทุกวันค่ะ ไม่ต้องจ่ายเพิ่มค่ะ" },
      ],
      analysis: PHARMACY_ANALYSIS,
      decision: "accepted",
      decidedAt: mockTs(25 * HOUR),
      notified: true,
    },
    {
      ...base("mock_blocked", INVEST_KEY, 30 * HOUR),
      route: "screened",
      status: "blocked",
      endedAt: mockTs(30 * HOUR - 52_000),
      durationSec: 52,
      transcript: [
        { role: "assistant", t: 0, text: "สวัสดีค่ะ ดิฉันเป็นผู้ช่วย AI รับสายแทนเจ้าของเบอร์นี้ค่ะ ขอทราบชื่อและธุระของคุณด้วยค่ะ" },
        { role: "caller", t: 4, text: "สวัสดีค่ะ เจนนะคะ มีโอกาสลงทุนทองคำ กำไรเดือนละ 30% ค่ะ" },
        { role: "caller", t: 12, text: "โอนมัดจำแค่ห้าพันก่อน เดือนหน้าได้คืนหกพันห้า" },
        { role: "caller", t: 20, text: "แอดไลน์มาคุยรายละเอียดนะคะ โปรนี้หมดวันนี้นะคะ" },
      ],
      analysis: INVEST_ANALYSIS,
      decision: "blocked",
      decidedAt: mockTs(29 * HOUR),
      notified: true,
    },
  ];

  return {
    family: {
      ownerName: "คุณยายสมศรี",
      ownerLabelForCallers: "เจ้าของเบอร์นี้",
      ownerPhone: "+66811112222",
      guardianName: "พูม",
      notifyOnIncoming: true,
      twilioNumber: "+6620000000",
      pushTokens: [],
      createdAt: mockTs(3 * 24 * HOUR),
    },
    calls,
    whitelist: [
      {
        callerKey: PHARMACY_KEY,
        displayName: "ภญ.กมลวรรณ",
        note: PHARMACY_ANALYSIS.reason,
        addedBy: "guardian",
        addedAt: mockTs(25 * HOUR),
        sourceCallId: "mock_accepted",
      },
      { callerKey: "+66800000001", displayName: "ลูกสาว", note: null, addedBy: "seed", addedAt: mockTs(3 * 24 * HOUR), sourceCallId: null },
      { callerKey: "+66800000002", displayName: "หลานชาย", note: null, addedBy: "seed", addedAt: mockTs(3 * 24 * HOUR - 1000), sourceCallId: null },
    ],
    blocked: [
      { callerKey: POLICE_KEY, displayName: POLICE_ANALYSIS.callerName, reason: "auto", addedAt: mockTs(39 * MIN), sourceCallId: "mock_police" },
      { callerKey: INVEST_KEY, displayName: INVEST_ANALYSIS.callerName, reason: "guardian", addedAt: mockTs(29 * HOUR), sourceCallId: "mock_blocked" },
    ],
  };
}

// ---------- Store (subscribe pattern, immutable updates) ----------

let state: MockState = seedState();
const listeners = new Set<() => void>();

function sortCalls(calls: CallDoc[]): CallDoc[] {
  return [...calls].sort((a, b) => tsToDate(b.startedAt).getTime() - tsToDate(a.startedAt).getTime());
}

function setState(next: Partial<MockState>) {
  state = { ...state, ...next };
  if (next.calls) state.calls = sortCalls(state.calls);
  listeners.forEach((l) => l());
}

export const mockStore = {
  getState: (): MockState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function patchCall(id: string, patch: Partial<CallDoc>) {
  setState({ calls: state.calls.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}

// ---------- Mutations (mirror the A6 recipes) ----------

export function mockAcceptCall(call: CallDoc) {
  const key = call.callerKey;
  const entry: WhitelistEntry = {
    callerKey: key,
    displayName: call.analysis?.callerName ?? formatCallerKey(key),
    note: call.analysis?.reason ?? null,
    addedBy: "guardian",
    addedAt: mockTs(0),
    sourceCallId: call.id,
  };
  setState({
    whitelist: [entry, ...state.whitelist.filter((w) => w.callerKey !== key)],
    blocked: state.blocked.filter((b) => b.callerKey !== key),
  });
  patchCall(call.id, { decision: "accepted", decidedAt: mockTs(0), status: "accepted" });
}

export function mockBlockCall(call: CallDoc) {
  const key = call.callerKey;
  const entry: BlockedEntry = {
    callerKey: key,
    displayName: call.analysis?.callerName ?? null,
    reason: "guardian",
    addedAt: mockTs(0),
    sourceCallId: call.id,
  };
  setState({
    blocked: [entry, ...state.blocked.filter((b) => b.callerKey !== key)],
    whitelist: state.whitelist.filter((w) => w.callerKey !== key),
  });
  patchCall(call.id, { decision: "blocked", decidedAt: mockTs(0), status: "blocked" });
}

export function mockUnblock(callerKey: string) {
  setState({ blocked: state.blocked.filter((b) => b.callerKey !== callerKey) });
}

export function mockAddWhitelist(callerKey: string, displayName: string) {
  const entry: WhitelistEntry = {
    callerKey,
    displayName,
    note: null,
    addedBy: "guardian",
    addedAt: mockTs(0),
    sourceCallId: null,
  };
  setState({ whitelist: [entry, ...state.whitelist.filter((w) => w.callerKey !== callerKey)] });
}

export function mockRemoveWhitelist(callerKey: string) {
  setState({ whitelist: state.whitelist.filter((w) => w.callerKey !== callerKey) });
}

export function mockUpdateFamily(patch: Partial<FamilyDoc>) {
  setState({ family: { ...state.family, ...patch } });
}

export function mockAddPushToken(token: string) {
  if (state.family.pushTokens.includes(token)) return;
  setState({ family: { ...state.family, pushTokens: [...state.family.pushTokens, token] } });
}

/** Restore the seed data (handy from a dev menu). */
export function resetMocks() {
  state = seedState();
  listeners.forEach((l) => l());
}

// ---------- Live demo simulation ----------

type Scenario = { key: string; transcript: TranscriptTurn[]; analysis: CallAnalysis; finalStatus: CallDoc["status"] };
const SCENARIOS: Scenario[] = [
  { key: "+66895551234", transcript: RIDER_TRANSCRIPT, analysis: RIDER_ANALYSIS, finalStatus: "needs_review" },
  { key: "+6621234567", transcript: CLINIC_TRANSCRIPT, analysis: CLINIC_ANALYSIS, finalStatus: "needs_review" },
  { key: "+66934567812", transcript: POLICE_TRANSCRIPT, analysis: POLICE_ANALYSIS, finalStatus: "auto_blocked" },
];
let simCount = 0;

/**
 * Mock mode only: inserts a new "screening" call, flips it to "analyzing" after ~3 s,
 * then to its final status with analysis after ~6 s. Cycles rider → clinic → fake police
 * (police ends as auto_blocked, the others as needs_review). Returns the new call id.
 */
export function mockSimulateIncomingCall(): string {
  const sc = SCENARIOS[simCount % SCENARIOS.length];
  simCount += 1;
  const id = `sim_mock_${Date.now()}`;
  const call: CallDoc = {
    ...base(id, sc.key, 0),
    route: "screened",
    status: "screening",
    transcript: sc.transcript.slice(0, 2),
  };
  setState({ calls: [call, ...state.calls] });

  setTimeout(() => {
    patchCall(id, { status: "analyzing", transcript: sc.transcript, endedAt: mockTs(0), durationSec: sc.transcript.at(-1)?.t ?? 30 });
  }, 3000);

  setTimeout(() => {
    patchCall(id, {
      status: sc.finalStatus,
      analysis: { ...sc.analysis, analyzedAt: new Date().toISOString() },
      notified: sc.finalStatus === "needs_review",
    });
    if (sc.finalStatus === "auto_blocked" && !state.blocked.some((b) => b.callerKey === sc.key)) {
      setState({
        blocked: [
          { callerKey: sc.key, displayName: sc.analysis.callerName, reason: "auto", addedAt: mockTs(0), sourceCallId: id },
          ...state.blocked,
        ],
      });
    }
  }, 6000);

  return id;
}
