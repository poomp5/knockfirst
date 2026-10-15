import { Router, RequestHandler } from "express";
import { z } from "zod";
import { env } from "../env";
import { toCallerKey } from "../contract";
import { createCall } from "../services/calls";
import { processCompletedCall } from "../services/pipeline";
import { resetFamily } from "../services/reset";

export const devRouter = Router();

// Per-route (not router.use) so it never touches requests meant for routes mounted later, like /health.
const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.header("x-admin-token") !== env.DEMO_ADMIN_TOKEN) return void res.sendStatus(401);
  next();
};

const SimulateBody = z.object({
  familyId: z.string().min(1).optional(),
  from: z.string().min(1),
  transcript: z.array(z.object({
    role: z.enum(["assistant", "caller"]),
    text: z.string(),
    t: z.number(),
  })).max(60),
});

devRouter.post("/dev/simulate-call", requireAdmin, async (req, res, next) => {
  const parsed = SimulateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad body", issues: parsed.error.issues });
  try {
    const { from, transcript } = parsed.data;
    const familyId = parsed.data.familyId ?? env.DEFAULT_FAMILY_ID;
    const callId = "sim_" + Date.now().toString(36);
    const callerKey = toCallerKey(from);
    await createCall({ id: callId, familyId, callerKey, from, to: "", route: "screened", status: "analyzing", simulated: true });
    const durationSec = transcript.length ? Math.round(transcript[transcript.length - 1].t) : 0;
    const { status, analysis } = await processCompletedCall({ familyId, callId, callerKey, transcript, durationSec });
    res.json({ callId, status, analysis });
  } catch (e) {
    next(e);
  }
});

devRouter.post("/demo/reset", requireAdmin, async (req, res, next) => {
  try {
    const familyId = typeof req.body?.familyId === "string" && req.body.familyId ? req.body.familyId : env.DEFAULT_FAMILY_ID;
    res.json({ ok: true, familyId, deleted: await resetFamily(familyId) });
  } catch (e) {
    next(e);
  }
});
