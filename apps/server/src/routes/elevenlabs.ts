import { Router, raw } from "express";
import { env } from "../env";
import { verifyElevenLabsSignature } from "../services/elevenlabsSignature";
import { processCompletedCall } from "../services/pipeline";
import { db } from "../firebase";
import { toCallerKey, TranscriptTurn } from "../contract";

export const elevenlabsRouter = Router();

elevenlabsRouter.post("/webhooks/elevenlabs", raw({ type: "*/*", limit: "5mb" }), async (req, res) => {
  const body = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (env.ELEVENLABS_WEBHOOK_SECRET && !verifyElevenLabsSignature(body, req.header("elevenlabs-signature"), env.ELEVENLABS_WEBHOOK_SECRET)) {
    console.warn("bad elevenlabs signature");
    return res.sendStatus(401);
  }
  res.sendStatus(200); // reply fast, process after
  try {
    const evt = JSON.parse(body);
    // Keep the last raw payload so the mapping below can be checked against the real shape.
    await db.collection("debug").doc("elevenlabs_last").set({ at: new Date().toISOString(), type: evt.type ?? null, body: body.slice(0, 200000) });
    if (evt.type !== "post_call_transcription") return;
    const d = evt.data ?? {};
    const vars = d.conversation_initiation_client_data?.dynamic_variables ?? {};
    const transcript: TranscriptTurn[] = (d.transcript ?? [])
      .filter((t: any) => typeof t.message === "string" && t.message.trim())
      .map((t: any) => ({ role: t.role === "agent" ? "assistant" : "caller", text: t.message.trim(), t: Number(t.time_in_call_secs ?? 0) }));
    await processCompletedCall({
      familyId: vars.family_id || env.DEFAULT_FAMILY_ID,
      callId: vars.call_sid || `el_${d.conversation_id}`,
      callerKey: vars.caller_key || toCallerKey(vars.system__caller_id ?? ""),
      conversationId: d.conversation_id ?? null,
      transcript,
      agentData: d.analysis?.data_collection_results ?? null,
      durationSec: d.metadata?.call_duration_secs ?? null,
    });
  } catch (e) {
    console.error("post-call processing failed", e);
  }
});
