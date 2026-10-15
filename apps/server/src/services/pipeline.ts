import { db, FieldValue } from "../firebase";
import { analyzeCall } from "../ai";
import { paths, riskLevelFromScore, CallAnalysis, CallStatus, TranscriptTurn } from "../contract";
import { getFamily } from "./families";
import { updateCall } from "./calls";
import { decideStatus } from "./policy";
import { notifyGuardians, notifyUpdate } from "./push";

export interface CompletedCall {
  familyId: string;
  callId: string;
  callerKey: string;
  conversationId?: string | null;
  transcript: TranscriptTurn[];
  agentData?: Record<string, unknown> | null;
  durationSec?: number | null;
}

const isDecision = (d: unknown): d is "accepted" | "blocked" => d === "accepted" || d === "blocked";

/** Shared by the ElevenLabs post-call webhook and /dev/simulate-call. */
export async function processCompletedCall(p: CompletedCall): Promise<{ status: CallStatus; analysis: CallAnalysis | null }> {
  const t0 = Date.now();
  const { familyId, callId, callerKey, transcript } = p;
  const ref = db.doc(paths.call(familyId, callId));

  // 1. Save the transcript and mark analyzing. If /twilio/voice never created the doc (e.g. no call_sid),
  //    create the fields the inbox needs. Never overwrite a guardian decision's status.
  const snap = await ref.get();
  await updateCall(familyId, callId, {
    ...(snap.exists ? {} : {
      id: callId, familyId, callerKey, from: callerKey, to: "", route: "screened",
      startedAt: FieldValue.serverTimestamp(), decision: null, notified: false, analysis: null,
    }),
    ...(isDecision(snap.get("decision")) ? {} : { status: "analyzing" }),
    transcript,
    conversationId: p.conversationId ?? null,
    endedAt: FieldValue.serverTimestamp(),
    durationSec: p.durationSec ?? null,
  });

  // 2. Caller said nothing useful.
  if (!transcript.some(t => t.role === "caller" && t.text.trim().length > 1)) {
    const r = await commitResult(familyId, callId, callerKey, null, "no_message");
    if (!r.decided) await safePush(callId, () => notifyUpdate(familyId, callId, "no_message", callerKey, null));
    console.log(`call ${callId} ${r.status}${r.decided ? " (guardian decided)" : ""} ${Date.now() - t0}ms`);
    return { status: r.status, analysis: null };
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

  // 4–6. Policy + save (auto-block included), unless the guardian already decided.
  const r = await commitResult(familyId, callId, callerKey, analysis, decideStatus(analysis));

  // 7. Pushes replace the "calling now" notification (same tag = callId).
  if (!r.decided) {
    if (r.status === "needs_review") {
      const notified = await safePush(callId, () => notifyGuardians(familyId, callId, callerKey, analysis));
      await updateCall(familyId, callId, { notified });
    } else if (r.status === "auto_blocked") {
      await safePush(callId, () => notifyUpdate(familyId, callId, "auto_blocked", callerKey, analysis));
    }
  }

  console.log(`call ${callId} ${r.status}${r.decided ? " (guardian decided)" : ""} risk=${analysis.riskScore} ${Date.now() - t0}ms`);
  return { status: r.status, analysis };
}

/**
 * Writes the result in a transaction. If the guardian already accepted/blocked (e.g. during the call),
 * keeps status = decision, still saves the analysis, and skips auto-block; the caller skips pushes.
 */
async function commitResult(
  familyId: string, callId: string, callerKey: string, analysis: CallAnalysis | null, status: CallStatus,
): Promise<{ status: CallStatus; decided: boolean }> {
  const ref = db.doc(paths.call(familyId, callId));
  return db.runTransaction(async tx => {
    const decision = (await tx.get(ref)).get("decision");
    if (isDecision(decision)) {
      tx.set(ref, { analysis, status: decision }, { merge: true });
      return { status: decision, decided: true };
    }
    if (status === "auto_blocked" && analysis) {
      tx.set(db.doc(paths.blockedEntry(familyId, callerKey)), {
        callerKey, displayName: analysis.callerName ?? null, reason: "auto",
        addedAt: FieldValue.serverTimestamp(), sourceCallId: callId,
      });
      tx.set(db.doc(paths.globalBlock(callerKey)), {
        callerKey, reportedBy: FieldValue.arrayUnion(familyId),
        lastReason: analysis.reason, updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    tx.set(ref, { analysis, status }, { merge: true });
    return { status, decided: false };
  });
}

async function safePush(callId: string, send: () => Promise<boolean>): Promise<boolean> {
  try {
    return await send();
  } catch (e) {
    console.error(`push failed for ${callId}`, e);
    return false;
  }
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
