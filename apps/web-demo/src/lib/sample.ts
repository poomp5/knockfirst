// Sample cards for local preview ONLY (no Firebase config). A configured build never shows these.
import { riskLevelFromScore, type CallAnalysis, type CallDoc, type RedFlag, type TranscriptTurn } from "./contract";

const ago = (min: number) => { const d = new Date(Date.now() - min * 60_000); return { toDate: () => d }; };
const OPEN = "สวัสดีค่ะ ดิฉันเป็นผู้ช่วยรับสายอัตโนมัติของเจ้าของเบอร์นี้ค่ะ สายนี้มีการบันทึกเพื่อความปลอดภัย รบกวนแจ้งชื่อของคุณ และต้องการติดต่อเรื่องอะไรคะ";

function talk(lines: string[]): TranscriptTurn[] {
  return [{ role: "assistant", text: OPEN, t: 0 }, ...lines.map((l, i) => ({
    role: (l.startsWith("A:") ? "assistant" : "caller") as TranscriptTurn["role"], text: l.slice(2).trim(), t: 6 + i * 7,
  }))];
}

function analysis(p: Partial<CallAnalysis> & { riskScore: number; redFlags: RedFlag[] }): CallAnalysis {
  return {
    callerName: null, organization: null, targetPerson: null, knewOwner: null, reason: "", reasonEn: null,
    summary: "", summaryEn: null, callbackNumber: null, urgency: "normal", evidence: [],
    recommendedAction: "review", source: "llm+rules", analyzedAt: new Date().toISOString(),
    ...p, riskLevel: riskLevelFromScore(p.riskScore),
  };
}

export function sampleCalls(): CallDoc[] {
  const base = { familyId: "demo-family", to: "", route: "screened" as const, simulated: true };
  return [
    {
      ...base, id: "sample-live", callerKey: "+66900000301", from: "+66900000301", status: "screening",
      startedAt: ago(0.2), incomingNotified: true,
    },
    {
      ...base, id: "sample-rider", callerKey: "+66900000201", from: "+66900000201", status: "needs_review",
      startedAt: ago(4), incomingNotified: true, durationSec: 38,
      transcript: talk([
        "C: สวัสดีครับ ไรเดอร์แฟลชเอ็กซ์เพรสครับ มาส่งพัสดุให้คุณสมศรีครับ",
        "A: ขอบคุณค่ะ ต้องการให้ฝากเรื่องอะไรไว้คะ",
        "C: ตอนนี้ผมอยู่หน้าประตูรั้วแล้วครับ กดกริ่งแล้วไม่มีคนออกมา ฝากไว้กับป้อมยามได้ไหมครับ",
      ]),
      analysis: analysis({
        callerName: "ไรเดอร์ Flash Express", organization: "Flash Express", riskScore: 18, redFlags: [],
        reason: "ไรเดอร์มาส่งพัสดุ รออยู่หน้าประตู", reasonEn: "A Flash rider is at the gate with a parcel.",
        summary: "ไรเดอร์ Flash Express มาส่งพัสดุที่จ่ายเงินแล้ว ตอนนี้รออยู่หน้าประตูรั้ว และถามว่าฝากไว้กับป้อมยามได้ไหม ไม่มีการขอเงินหรือข้อมูลส่วนตัว",
        summaryEn: "A Flash Express rider has a prepaid parcel and is waiting at the gate. He asks to leave it with the guard. No money or personal details were requested.",
        recommendedAction: "accept", urgency: "urgent",
      }),
    },
    {
      ...base, id: "sample-police", callerKey: "+66900000101", from: "+66900000101", status: "auto_blocked",
      startedAt: ago(26), incomingNotified: true, durationSec: 71,
      transcript: talk([
        "C: สวัสดีครับ ผมสิบตำรวจโทวิชัย จากสถานีตำรวจภูธรเมืองนนทบุรีครับ",
        "A: ขอบคุณค่ะ ต้องการติดต่อเรื่องอะไรคะ",
        "C: ตอนนี้มีคนนำชื่อและบัญชีธนาคารของเจ้าของเบอร์นี้ไปใช้ในคดีฟอกเงินครับ มีหมายจับออกแล้ว",
        "C: ให้เจ้าของบัญชีโอนเงินทั้งหมดมาที่บัญชีของสำนักงานเพื่อตรวจสอบ ภายในวันนี้",
        "C: แล้วห้ามบอกลูกหลานนะครับ เพราะเป็นความลับทางคดี",
      ]),
      analysis: analysis({
        callerName: "สิบตำรวจโทวิชัย", organization: "สถานีตำรวจภูธรเมืองนนทบุรี", riskScore: 96,
        redFlags: ["authority_claim", "accusation_threat", "money_request", "secrecy_isolation", "urgency_pressure"],
        reason: "อ้างเป็นตำรวจ กล่าวหาคดีฟอกเงิน และให้โอนเงินเพื่อตรวจสอบ", reasonEn: "Claims to be police, alleges money laundering, demands a transfer.",
        summary: "ผู้โทรอ้างเป็นตำรวจ บอกว่าบัญชีของคุณยายเกี่ยวกับคดีฟอกเงิน ให้โอนเงินทั้งหมดเพื่อตรวจสอบภายในวันนี้ และห้ามบอกลูกหลาน เป็นรูปแบบแก๊งคอลเซ็นเตอร์ ตำรวจจริงไม่ให้โอนเงินเพื่อพิสูจน์ความบริสุทธิ์",
        summaryEn: "The caller claims to be police, says her account is linked to money laundering, demands she transfer everything today and tell no one. This is the call-centre scam script; real police never ask for money to prove innocence.",
        evidence: [
          { flag: "accusation_threat", quote: "ตอนนี้มีคนนำชื่อและบัญชีธนาคารของเจ้าของเบอร์นี้ไปใช้ในคดีฟอกเงินครับ มีหมายจับออกแล้ว" },
          { flag: "money_request", quote: "ให้เจ้าของบัญชีโอนเงินทั้งหมดมาที่บัญชีของสำนักงานเพื่อตรวจสอบ" },
          { flag: "secrecy_isolation", quote: "แล้วห้ามบอกลูกหลานนะครับ" },
        ],
        recommendedAction: "block",
      }),
    },
    {
      ...base, id: "sample-clinic", callerKey: "+66900000202", from: "+66900000202", status: "accepted", decision: "accepted",
      startedAt: ago(95), durationSec: 29,
      transcript: talk(["C: สวัสดีค่ะ ดิฉันชื่อนิดา จากคลินิกทันตกรรมยิ้มสวยค่ะ โทรมาเตือนนัดทำฟันวันพฤหัสนี้ สิบโมงเช้าค่ะ"]),
      analysis: analysis({
        callerName: "นิดา", organization: "คลินิกทันตกรรมยิ้มสวย", riskScore: 8, redFlags: [],
        reason: "คลินิกทันตกรรมโทรเตือนนัดวันพฤหัส", reasonEn: "Dental clinic reminding her of Thursday's appointment.",
        summary: "คุณนิดาจากคลินิกทันตกรรมยิ้มสวยโทรเตือนนัดทำฟันวันพฤหัสนี้ สิบโมงเช้า ไม่ได้ขออะไร", summaryEn: "Nida from Yim Suay dental clinic called to remind her of Thursday's 10:00 appointment. Nothing was requested.",
        recommendedAction: "accept",
      }),
    },
  ];
}
