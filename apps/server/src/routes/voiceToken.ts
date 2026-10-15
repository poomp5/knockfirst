import { Router } from "express";
import twilio from "twilio";
import { env } from "../env";

export const voiceTokenRouter = Router();
const hits = new Map<string, number[]>(); // naive rate limit: 10 tokens / minute / IP

voiceTokenRouter.get("/voice/token", (req, res) => {
  const ip = req.ip ?? "x";
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter(t => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (arr.length > 10) return res.status(429).json({ error: "slow down" });
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_API_KEY_SID || !env.TWILIO_API_KEY_SECRET || !env.TWILIO_TWIML_APP_SID) {
    return res.status(503).json({ error: "twilio not configured" });
  }
  const raw = String(req.query.identity ?? "");
  const identity = (raw || `judge-${Math.random().toString(36).slice(2, 8)}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "judge";
  const { AccessToken } = twilio.jwt;
  const { VoiceGrant } = AccessToken;
  const token = new AccessToken(env.TWILIO_ACCOUNT_SID, env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, { identity, ttl: 3600 });
  token.addGrant(new VoiceGrant({ outgoingApplicationSid: env.TWILIO_TWIML_APP_SID, incomingAllow: false }));
  res.json({ token: token.toJwt(), identity, to: env.TWILIO_PHONE_NUMBER });
});
