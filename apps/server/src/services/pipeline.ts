import { db, FieldValue } from "../firebase";
import { analyzeCall } from "../ai";
import { paths, riskLevelFromScore, CallAnalysis, CallStatus, TranscriptTurn } from "../contract";
import { getFamily } from "./families";
import { updateCall } from "./calls";
import { decideStatus } from "./policy";
import { notifyGuardians } from "./push";

export interface CompletedCall {
  familyId: string;
  callId: string;
  callerKey: string;
  conversationId?: string | null;
  transcript: TranscriptTurn[];
  agentData?: Record<string, unknown> | null;
  durationSec?: number | null;
}

/** Shared by the ElevenLabs post-call webhook and /dev/simulate-call. */
export async function processCompletedCall(p: CompletedCall): Promise<{ status: CallStatus; analysis: CallAnalysis | null }> {
  const t0 = Date.now();
  const { familyId, callId, callerKey, transcript } = p;
  const ref = db.doc(paths.call(familyId, callId));

  // 1. Mark analyzing. If /twilio/voice never created the doc (e.g. no call_sid), create the fields the inbox needs.
  const existed = (await ref.get()).exists;
  await updateCall(familyId, callId, {
    ...(existed ? {} : {
      id: callId, familyId, callerKey, from: callerKey, to: "", route: "screened",
      startedAt: FieldValue.serverTimestamp(), decision: null, notified: false, analysis: null,
    }),
    status: "analyzing",
    transcript,
    conversationId: p.conversationId ?? null,
    endedAt: FieldValue.serverTimestamp(),
    durationSec: p.durationSec ?? null,
  });

  // 2. Caller said nothing useful → no push.
  if (!transcript.some(t => t.role === "caller" && t.text.trim().length > 1)) {
    await updateCall(familyId, callId, { status: "no_message", analysis: null });
    console.log(`call ${callId} no_message ${Date.now() - t0}ms`);
    return { status: "no_message", analysis: null };
  }

  // 3. Sky's engine (never throws by contract; guarded anyway).
  const family = await getFamily(familyId);
  let analysis: CallAnalysis;
  try {
    analysis = await analyzeCall({
      transcript, callerKey,
      ownerLabel: family?.ownerLabelForCallers ?? "เจ้าของเบอร์นี้",
      agentDataCollection: p.agentData ?? null,
    });
  } catch (e) {
    console.error(`analyzeCall threw for ${callId}`, e);
    analysis = fallbackAnalysis(transcript);
  }

  // 4–5. Policy; auto-block writes the family block + a global report.
  const status = decideStatus(analysis);
  if (status === "auto_blocked") {
    const batch = db.batch();
    batch.set(db.doc(paths.blockedEntry(familyId, callerKey)), {
      callerKey, displayName: analysis.callerName ?? null, reason: "auto",
      addedAt: FieldValue.serverTimestamp(), sourceCallId: callId,
    });
    batch.set(db.doc(paths.globalBlock(callerKey)), {
      callerKey, reportedBy: FieldValue.arrayUnion(familyId),
      lastReason: analysis.reason, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  }

  // 6. Save.
  await updateCall(familyId, callId, { analysis, status });

  // 7. Push only when the guardian has to decide.
  if (status === "needs_review") {
    let notified = false;
    try {
      notified = await notifyGuardians(familyId, callId, callerKey, analysis);
    } catch (e) {
      console.error(`push failed for ${callId}`, e);
    }
    await updateCall(familyId, callId, { notified });
  }

  console.log(`call ${callId} ${status} risk=${analysis.riskScore} ${Date.now() - t0}ms`);
  return { status, analysis };
}

function fallbackAnalysis(transcript: TranscriptTurn[]): CallAnalysis {
  const said = transcript.filter(t => t.role === "caller").map(t => t.text).join(" ");
  const score = 50;
  return {
    callerName: null, organization: null, targetPerson: null, knewOwner: null,
    reason: "ระบบวิเคราะห์ขัดข้อง กรุณาตรวจสอบเอง", reasonEn: "Analysis failed, please review",
    summary: said.slice(0, 200) || "ผู้โทรไม่ได้ให้ข้อมูล", summaryEn: null,
    callbackNumber: null, urgency: "normal",
    riskScore: score, riskLevel: riskLevelFromScore(score),
    redFlags: [], evidence: [], recommendedAction: "review",
    source: "rules", analyzedAt: new Date().toISOString(),
  };
}
