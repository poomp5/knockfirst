// OWNER: Sky. Deterministic Thai/English rules over CALLER turns only.
// Two jobs: the safety floor under the LLM, and the whole answer when the LLM is down.
import { CallAnalysis, RedFlag, RED_FLAG_LABEL_EN, RED_FLAG_LABEL_TH, riskLevelFromScore } from "../contract";
import type { AnalyzeInput } from "./index";
import { actionFromScore, normalizeCallback, normWs } from "./schema";

// Patterns avoid common legit words: ออนไลน์ (online), ศาลา (temple hall), โอนสาย (transfer the call),
// รหัสไปรษณีย์/รหัสพัสดุ (postal/tracking code). Address/birthday only count when someone asks for them.
export const PATTERNS: Record<Exclude<RedFlag, "refused_identity">, RegExp[]> = {
  authority_claim: [
    /ตำรวจ|สภ\.|สน\.|สถานีตำรวจ|กองปราบ/,
    /\bDSI\b|ดีเอสไอ|กรมสอบสวนคดีพิเศษ/i,
    /ปปง\.?|ป\.ป\.ง/,
    /ศาล(?!า)|อัยการ|สรรพากร|ศุลกากร|กรมศุล/,
    /ธนาคาร.{0,15}(แผนก|ฝ่าย|ศูนย์)|ฝ่ายป้องกันการทุจริต|ฝ่ายความปลอดภัย/,
    /การไฟฟ้า|กฟภ|กฟน|\bPEA\b|\bMEA\b/i,
    /กรมการขนส่ง|ขนส่งทางบก|ไปรษณีย์/,
    /\bpolice\b|bank officer|fraud department|\bcustoms\b|revenue department|\bcourt\b|government officer/i,
  ],
  accusation_threat: [
    /ฟอกเงิน|บัญชีม้า|หมายจับ|หมายเรียก|หมายศาล|ดำเนินคดี|ฟ้องร้อง|คดี/,
    /อายัด|ระงับบัญชี|ระงับการใช้งาน|ปิดบัญชี|ผิดกฎหมาย|ยาเสพติด|จับกุม|(ถูก|โดน)จับ/,
    /money laundering|\barrest|warrant|illegal|lawsuit|frozen|suspend(ed)?\s+(your\s+)?account/i,
  ],
  money_request: [
    /โอน(?!สาย)|ชำระ|ค่าธรรมเนียม|ค่าปรับ|ค่าดำเนินการ|ภาษีนำเข้า|วางเงิน|มัดจำ/,
    /ตรวจสอบบัญชี|ยืนยันบัญชี|พิสูจน์ความบริสุทธิ์|ร่วมลงทุน|ลงทุน/,
    /\b(transfer|pay|payment|fee|deposit|wire|invest)\b/i,
  ],
  personal_info_request: [
    /OTP|โอทีพี/i,
    /รหัส(?!ไปรษณีย์|พัสดุ)/,
    /เลข(ที่)?บัตร|บัตรประชาชน|เลขประจำตัวประชาชน|เลข(ที่)?บัญชี|หน้าบัตร/,
    /(ขอ|แจ้ง|บอก|ยืนยัน|กรอก).{0,10}(ที่อยู่|วันเกิด|ชื่อ-?นามสกุลจริง)/,
    /\bPIN\b|password|ID\s*(card\s*)?number|account\s*number|card\s*number|date of birth|security code/i,
  ],
  secrecy_isolation: [
    /ห้ามบอก|อย่าบอก|ไม่ต้องบอก(ใคร|ลูก|หลาน)|เป็นความลับ|ห้ามเปิดเผย/,
    /อยู่คนเดียว|ที่ที่ไม่มีคน|หาที่เงียบ|อย่าวางสาย|ห้ามวางสาย|ห้ามตัดสาย/,
    /don'?t tell|keep (this|it) (a )?secret|stay on the line|don'?t hang up/i,
  ],
  channel_switch: [
    /แอด\s*ไลน์|(?<!ออน)ไลน์|\bLINE\b/,
    /line\s*id|add (me|us) on line/i,
    /telegram|เทเลแกรม|whats\s?app|วอทส์แอป/i,
    /วิดีโอคอล|วีดีโอคอล|video call/i,
    /ติดตั้งแอป|โหลดแอป|ดาวน์โหลด|ลิงก์|ลิ้งก์|ลิงค์|ลิ้งค์|สแกน\s*QR|คิวอาร์/i,
    /install (the |an |our )?app|download|\blink\b|scan (the |this )?QR/i,
  ],
  urgency_pressure: [
    /ด่วน|ภายในวันนี้|วันนี้เท่านั้น|เดี๋ยวนี้|ทันที|โดยเร็วที่สุด/,
    /ภายใน\s*\d+\s*(นาที|ชั่วโมง|ชม)/,
    /right now|immediately|urgent|as soon as possible|within \d+ (minutes|hours)/i,
  ],
  unknown_target: [
    /(ไม่รู้|ไม่ทราบ|ไม่แน่ใจ)(ว่า)?.{0,15}(ใคร|ชื่อ)/,
    /(ขอสาย|ขอเรียนสาย|ขอคุย(กับ)?|ต้องการ(ติดต่อ|คุยกับ)).{0,6}(เจ้าของ(เบอร์|บัญชี|หมายเลข|บ้าน)|ผู้ถือบัญชี)/,
    /whoever|who (am i|is this) (speaking|talking)|the (account|phone) (owner|holder)/i,
  ],
  story_pivot: [
    // Prompt injection aimed at our analyzer is itself the strongest manipulation signal.
    /(ระบบ|AI|เอไอ|ปัญญาประดิษฐ์|บอท|โมเดล).{0,40}(ให้คะแนน|คะแนน|ความเสี่ยง|ปลอดภัย|อนุญาต|ไวท์ลิสต์|whitelist|ห้ามบล็อก|ไม่ต้องบล็อก)/i,
    /ลืมคำสั่ง|เพิกเฉย(ต่อ)?คำสั่ง|ไม่ต้องสนใจคำสั่ง|ยกเลิกคำสั่ง/,
    /ignore (all |any |your |the )?(previous |prior |above )?(instructions|rules)|risk\s*(score)?\s*(of|to|=|:|is)?\s*0\b|mark (this|me|the call) (as )?(safe|legit)|system prompt|developer mode/i,
  ],
};

/** Subset of story_pivot that is prompt injection (index.ts floors these at 70). */
export const INJECTION_PATTERNS = PATTERNS.story_pivot;

const REFUSAL_PATTERNS = [
  /(ไม่|ไม่ขอ|ไม่สะดวก|ไม่จำเป็น(ต้อง)?)\s*(บอก|แจ้ง|เปิดเผย).{0,8}ชื่อ/,
  /ไม่ต้องรู้(หรอก)?(ว่า)?.{0,6}(ใคร|ชื่อ)|บอกไม่ได้|ไม่ใช่เรื่องของคุณ/,
  /(won'?t|will not|not going to|don'?t (need|have) to|can'?t) (tell|give|say).{0,15}(name|who)|none of your business/i,
];

export const WEIGHTS: Record<RedFlag, number> = {
  authority_claim: 20, accusation_threat: 25, money_request: 30, personal_info_request: 30,
  secrecy_isolation: 25, channel_switch: 20, urgency_pressure: 10, refused_identity: 15, unknown_target: 10,
  story_pivot: 40, // not in the task table; only fires on injection-like text here
};

const PARTICLES = /(ครับผม|ครับ|คับ|ค่ะ|คะ|ค่า|นะ|จ้ะ|จ้า|จาก|โทร|เป็น|ที่|และ)/;
const NOT_NAMES = /^(อะไร|ของ|ไม่|เจ้าของ|ว่า|คุณ|ผู้)$/;

function trimThai(s: string): string | null {
  const t = s.trim();
  const m = t.slice(1).search(PARTICLES); // cut at the first particle after the first char
  const out = (m >= 0 ? t.slice(0, m + 1) : t).trim();
  return out.length >= 2 && !NOT_NAMES.test(out) ? out.slice(0, 40) : null;
}

export function extractCallerName(callerTexts: string[]): string | null {
  for (const s of callerTexts) {
    const th = s.match(/ชื่อ(?:ว่า)?\s*(?:คุณ|นาย|นางสาว|นาง|ด\.ต\.|ร\.ต\.อ\.|พ\.ต\.ท\.|จ่า)?\s*([ก-๙]{2,30})/);
    if (th) { const n = trimThai(th[1]); if (n) return n; }
    const en = s.match(/my name is ([a-z]+(?: [a-z]+)?)/i) ?? s.match(/\bthis is ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/);
    if (en && !/^(the|a|an)$/i.test(en[1])) return en[1];
  }
  return null;
}

export function extractOrganization(callerTexts: string[]): string | null {
  for (const s of callerTexts) {
    const brand = s.match(/Flash(?: Express)?|Kerry|J&T|ไปรษณีย์ไทย|LINE MAN|Grab|Shopee|Lazada|แฟลช|เคอรี่/i);
    if (brand) return brand[0];
    const th = s.match(/(?:โทรมาจาก|ติดต่อจาก|โทรจาก|จาก)\s*([ก-๙A-Za-z0-9.]{2,40})/);
    if (th) { const o = trimThai(th[1]); if (o) return o; }
    const en = s.match(/(?:calling from|from) (?:the )?([A-Z][\w&.-]*(?: [A-Z][\w&.-]*){0,3})/);
    if (en) return en[1];
  }
  return null;
}

function findCallback(callerTexts: string[]): string | null {
  for (const s of callerTexts) {
    for (const m of s.matchAll(/\+?\d[\d\s-]{7,}\d/g)) {
      const n = normalizeCallback(m[0]);
      if (n) return n;
    }
  }
  return null;
}

/** An exact substring of the caller turn around the match (passes the evidence check in schema.ts). */
function quoteAround(text: string, index: number): string {
  const t = normWs(text);
  if (t.length <= 120) return t;
  const start = Math.max(0, Math.min(index - 40, t.length - 120));
  return t.slice(start, start + 120).trim();
}

export interface RuleHits {
  flags: RedFlag[];
  evidence: { flag: RedFlag; quote: string }[];
  injection: boolean;
}

export function detectFlags(input: AnalyzeInput): RuleHits {
  const caller = input.transcript.filter(t => t.role === "caller").map(t => normWs(t.text)).filter(Boolean);
  const flags: RedFlag[] = [];
  const evidence: RuleHits["evidence"] = [];
  let injection = false;

  for (const [flag, res] of Object.entries(PATTERNS) as [RedFlag, RegExp[]][]) {
    hit: for (const text of caller) {
      for (const re of res) {
        const m = re.exec(text);
        if (!m) continue;
        flags.push(flag);
        evidence.push({ flag, quote: quoteAround(text, m.index) });
        if (flag === "story_pivot") injection = true;
        break hit;
      }
    }
  }

  // refused_identity: an explicit refusal, or the assistant had to ask for a name twice and still got nothing.
  const refusalTurn = caller.find(t => REFUSAL_PATTERNS.some(re => re.test(t)));
  const nameAsks = input.transcript.filter(t => t.role === "assistant" && /ชื่อ|name/i.test(t.text)).length;
  const anonymous = !extractCallerName(caller) && !extractOrganization(caller);
  if (refusalTurn || (nameAsks >= 2 && anonymous && caller.length > 0)) {
    flags.push("refused_identity");
    if (refusalTurn) evidence.push({ flag: "refused_identity", quote: quoteAround(refusalTurn, 0) });
  }

  return { flags, evidence, injection };
}

/** Minimum score for flag combinations that are scams no matter what the LLM says. */
export function scoreFloor(flags: RedFlag[], injection: boolean): number {
  const has = (f: RedFlag) => flags.includes(f);
  let min = 0;
  if (has("money_request") && (has("authority_claim") || has("accusation_threat"))) min = Math.max(min, 85);
  if (has("personal_info_request") && has("authority_claim")) min = Math.max(min, 80);
  if (injection) min = Math.max(min, 70); // a caller instructing our AI is manipulation by definition
  return min;
}

export function scoreFlags(flags: RedFlag[]): number {
  return Math.min(100, flags.reduce((s, f) => s + WEIGHTS[f], 0));
}

export function ruleBasedAnalysis(input: AnalyzeInput): CallAnalysis {
  const caller = input.transcript.filter(t => t.role === "caller").map(t => normWs(t.text)).filter(Boolean);
  const { flags, evidence, injection } = detectFlags(input);
  // Keywords can't verify anyone: floor at 20 ("plausible but unverified") and never recommend accept.
  const score = Math.max(20, scoreFlags(flags), scoreFloor(flags, injection));
  const callerName = extractCallerName(caller);
  const organization = extractOrganization(caller);

  const first = (caller.find(t => t.length >= 8) ?? caller[0] ?? "").slice(0, 90);
  const quoted = first ? `"${first}${first.length >= 90 ? "…" : ""}"` : "";
  const flagsTh = flags.map(f => RED_FLAG_LABEL_TH[f]).join(", ");
  const flagsEn = flags.map(f => RED_FLAG_LABEL_EN[f]).join(", ");
  const who = callerName ?? organization;

  return {
    callerName,
    organization,
    targetPerson: null,
    knewOwner: null,
    reason: (first ? `ผู้โทรแจ้งว่า ${quoted}` : "ผู้โทรไม่ได้ให้ข้อมูล").slice(0, 120),
    reasonEn: first ? `Caller said: ${quoted}`.slice(0, 160) : "Caller gave no details.",
    summary: [
      `${who ? `ผู้โทร (${who})` : "ผู้โทรที่ไม่ระบุตัวตน"}แจ้งว่า ${quoted || "-"}`,
      flags.length ? `พบสัญญาณเสี่ยง: ${flagsTh}` : "ไม่พบคำที่เป็นสัญญาณเสี่ยง",
      "(สรุปอัตโนมัติจากกฎ เนื่องจาก AI ไม่พร้อมใช้งาน)",
    ].join(" ").slice(0, 400),
    summaryEn: [
      `${who ? `Caller (${who})` : "An unidentified caller"} said ${quoted || "nothing useful"}.`,
      flags.length ? `Red flags: ${flagsEn}.` : "No red-flag keywords found.",
      "(Rule-based summary; the AI was unavailable.)",
    ].join(" "),
    callbackNumber: findCallback(caller),
    urgency: "normal",
    riskScore: score,
    riskLevel: riskLevelFromScore(score),
    redFlags: flags,
    evidence,
    recommendedAction: actionFromScore(score, false),
    source: "rules",
    analyzedAt: new Date().toISOString(),
  };
}
