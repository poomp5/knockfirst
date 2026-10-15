import { Router, raw } from "express";
import { env } from "../env";
import { verifyElevenLabsSignature } from "../services/elevenlabsSignature";
import { processCompletedCall } from "../services/pipeline";
import { getConversationMapping, mapConversation } from "../services/elevenlabs";
import { db } from "../firebase";
import { toCallerKey } from "../contract";

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
    const c = mapConversation(evt.data);
    // v3: dynamic variable call_id (call_sid was the Twilio name). Missing → the mapping written by /call/start or /call/end.
    let familyId = c.vars.family_id;
    let callId = c.vars.call_id || c.vars.call_sid;
    if (!callId && c.conversationId) {
      const m = await getConversationMapping(c.conversationId);
      if (m) { familyId = familyId || m.familyId; callId = m.callId; }
    }
    await processCompletedCall({
      familyId: familyId || env.DEFAULT_FAMILY_ID,
      callId: callId || `el_${c.conversationId}`,
      callerKey: c.vars.caller_key || toCallerKey(c.vars.system__caller_id ?? ""),
      conversationId: c.conversationId,
      transcript: c.transcript,
      agentData: c.agentData,
      durationSec: c.durationSec,
    });
  } catch (e) {
    console.error("post-call processing failed", e);
  }
});
