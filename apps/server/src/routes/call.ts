import { Router, RequestHandler } from "express";
import { z } from "zod";
import { db, FieldValue } from "../firebase";
import { env } from "../env";
import { paths, toCallerKey, formatCallerKey, CallDoc } from "../contract";
import { getFamily, getWhitelistEntry, isBlocked } from "../services/families";
import { createCall } from "../services/calls";
import { notifyIncoming, notifyOwnerRing } from "../services/push";
import { getConversationToken, saveConversationMapping, scheduleFallback } from "../services/elevenlabs";

// v3 (update 05): the web demo's caller page is the phone line. Same routing as the old Twilio webhook.
export const callRouter = Router();

/** Naive per-IP limiter (one server instance on Railway, so in-memory is enough). */
function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, number[]>();
  return (req, res, next) => {
    const ip = req.ip ?? "x";
    const now = Date.now();
    const arr = (hits.get(ip) ?? []).filter(t => now - t < windowMs);
    arr.push(now);
    hits.set(ip, arr);
    if (arr.length > max) return void res.status(429).json({ error: "slow down" });
    next();
  };
}

const newCallId = () => `web_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`;

const StartBody = z.object({
  callerNumber: z.string().max(32).refine(s => s.replace(/\D/g, "").length >= 9, "callerNumber needs at least 9 digits"),
  callerLabel: z.string().trim().max(40).optional(),
  familyId: z.string().min(1).max(64).optional(),
});

callRouter.post("/call/start", rateLimit(10, 60_000), async (req, res, next) => {
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad body", issues: parsed.error.issues });
  try {
    const { callerNumber } = parsed.data;
    const callerLabel = parsed.data.callerLabel || null;
    const familyId = parsed.data.familyId ?? env.DEFAULT_FAMILY_ID;
    const callerKey = toCallerKey(callerNumber);
    const [family, blocked, known] = await Promise.all([
      getFamily(familyId), isBlocked(familyId, callerKey), getWhitelistEntry(familyId, callerKey),
    ]);
    const callId = newCallId();
    const displayName = known?.displayName || formatCallerKey(callerKey);
    const ownerName = family?.ownerName || env.DEMO_OWNER_NAME;
    const base = { id: callId, familyId, callerKey, from: callerNumber, to: "", channel: "web" as const, callerLabel };
    const reply = { callId, callerKey, displayName, ownerName };

    if (blocked) {
      await createCall({ ...base, route: "blocked", status: "rejected" }, { endedAt: FieldValue.serverTimestamp(), durationSec: 0 });
      return res.json({ ...reply, route: "blocked" });
    }
    if (known) {
      await createCall({ ...base, route: "whitelist", status: "forwarded" }, { ownerResponse: null });
      void notifyOwnerRing(familyId, callId, displayName).catch(e => console.warn("owner ring push failed", e));
      return res.json({ ...reply, route: "whitelist" });
    }

    // unknown → AI assistant. Get the token first, so a failed token never leaves a stuck call or a stray alert.
    let tok: { token: string; conversationId: string | null };
    try {
      tok = await getConversationToken();
    } catch (e) {
      console.error("conversation token failed", e);
      return res.status(502).json({ error: "AI assistant unavailable" });
    }
    await createCall({ ...base, route: "screened", status: "screening" }, tok.conversationId ? { conversationId: tok.conversationId } : {});
    if (tok.conversationId) await saveConversationMapping(tok.conversationId, familyId, callId);
    // Not awaited: the caller must never wait for FCM (update 04).
    void notifyIncoming(familyId, callId, callerKey).catch(e => console.warn("incoming push failed", e));
    res.json({
      ...reply,
      route: "screened",
      conversationToken: tok.token,
      dynamicVariables: {
        call_id: callId,
        family_id: familyId,
        caller_key: callerKey,
        owner_label: family?.ownerLabelForCallers || "เจ้าของเบอร์นี้",
      },
    });
  } catch (e) {
    next(e);
  }
});

const EndBody = z.object({
  callId: z.string().regex(/^web_[a-z0-9]+$/),
  conversationId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).optional(),
  familyId: z.string().min(1).max(64).optional(),
});

callRouter.post("/call/end", rateLimit(30, 60_000), async (req, res, next) => {
  const parsed = EndBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad body", issues: parsed.error.issues });
  try {
    const { callId, conversationId } = parsed.data;
    const familyId = parsed.data.familyId ?? env.DEFAULT_FAMILY_ID;
    const ref = db.doc(paths.call(familyId, callId));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "unknown call" });
    const call = snap.data() as CallDoc;

    if (conversationId) {
      await Promise.all([ref.set({ conversationId }, { merge: true }), saveConversationMapping(conversationId, familyId, callId)]);
    }
    if (call.status === "forwarded" && !call.endedAt) {
      const durationSec = Math.max(0, Math.round((Date.now() - call.startedAt.toDate().getTime()) / 1000));
      await ref.set({ endedAt: FieldValue.serverTimestamp(), durationSec }, { merge: true });
    }
    const convId = conversationId ?? call.conversationId ?? null;
    if (call.route === "screened" && call.status === "screening" && convId) scheduleFallback(familyId, callId, convId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
