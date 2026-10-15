import { Router, RequestHandler } from "express";
import twilio from "twilio";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "../env";
import { paths, toCallerKey } from "../contract";
import { db, FieldValue } from "../firebase";
import { findFamilyIdByTwilioNumber, getFamily, isBlocked, isWhitelisted } from "../services/families";
import { createCall } from "../services/calls";

const elevenlabs = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });
export const twilioRouter = Router();

// Off by default so a proxy URL mismatch can't break the demo; turn on Fri morning (B12).
const verifyTwilio: RequestHandler = (req, res, next) => {
  if (!env.VALIDATE_TWILIO_SIGNATURE) return next();
  const ok = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, req.header("X-Twilio-Signature") ?? "", env.PUBLIC_BASE_URL + req.originalUrl, req.body ?? {});
  if (ok) return next();
  console.warn("bad twilio signature", req.originalUrl);
  res.sendStatus(403);
};

let loggedTwimlType = false;

twilioRouter.post("/twilio/voice", verifyTwilio, async (req, res) => {
  const { From = "", To = "", CallSid = "" } = req.body ?? {};
  const to = To || env.TWILIO_PHONE_NUMBER;
  const callerKey = toCallerKey(From);
  const vr = new twilio.twiml.VoiceResponse();
  console.log(`voice From=${JSON.stringify(From)} To=${JSON.stringify(To)} CallSid=${CallSid}`);
  try {
    const familyId = await findFamilyIdByTwilioNumber(to);
    const [family, blocked, whitelisted] = await Promise.all([
      getFamily(familyId), isBlocked(familyId, callerKey), isWhitelisted(familyId, callerKey),
    ]);
    const base = { id: CallSid || `tw_${Date.now().toString(36)}`, familyId, callerKey, from: From, to };

    if (blocked) {
      await createCall({ ...base, route: "blocked", status: "rejected" }, { endedAt: FieldValue.serverTimestamp(), durationSec: 0 });
      vr.reject({ reason: "busy" });
      return res.type("text/xml").send(vr.toString());
    }
    if (whitelisted && family?.ownerPhone) {
      await createCall({ ...base, route: "whitelist", status: "forwarded" });
      // Twilio doesn't allow verified Thai caller IDs for calls to Thailand, so present our own number.
      const dial = vr.dial({ callerId: env.TWILIO_PHONE_NUMBER, timeout: 25 });
      dial.number({ statusCallback: `${env.PUBLIC_BASE_URL}/twilio/status`, statusCallbackEvent: ["completed"] }, family.ownerPhone);
      return res.type("text/xml").send(vr.toString());
    }

    // unknown → AI assistant
    await createCall({ ...base, route: "screened", status: "screening" });
    const twiml = await elevenlabs.conversationalAi.twilio.registerCall({
      agentId: env.ELEVENLABS_AGENT_ID,
      fromNumber: From.startsWith("client:") ? env.TWILIO_PHONE_NUMBER : From, // browser callers have no phone number
      toNumber: to,
      direction: "inbound",
      conversationInitiationClientData: {
        dynamicVariables: {
          call_sid: base.id,
          family_id: familyId,
          caller_key: callerKey,
          owner_label: family?.ownerLabelForCallers || "เจ้าของเบอร์นี้",
        },
      },
    });
    if (!loggedTwimlType) { console.log(`registerCall returned ${typeof twiml}`); loggedTwimlType = true; }
    return res.type("text/xml").send(typeof twiml === "string" ? twiml : String(twiml));
  } catch (e) {
    console.error("voice route failed", e);
    vr.say({ language: "th-TH" }, "ขออภัยค่ะ ระบบขัดข้อง กรุณาโทรใหม่อีกครั้ง");
    return res.type("text/xml").send(vr.toString());
  }
});

// Status callback for the dialed leg of forwarded calls.
twilioRouter.post("/twilio/status", verifyTwilio, async (req, res) => {
  const b = req.body ?? {};
  // Twilio sends ParentCallSid for the dialed leg; fall back to CallSid
  const id = b.ParentCallSid || b.CallSid;
  res.sendStatus(204);
  if (!id) return;
  try {
    // Demo: one family, so look it up via DEFAULT_FAMILY_ID.
    const ref = db.doc(paths.call(env.DEFAULT_FAMILY_ID, id));
    if (!(await ref.get()).exists) return;
    const dur = Number(b.DialCallDuration ?? b.CallDuration);
    await ref.set({ endedAt: FieldValue.serverTimestamp(), durationSec: Number.isFinite(dur) ? dur : null }, { merge: true });
  } catch (e) {
    console.error("status callback failed", e);
  }
});
