import express from "express";
import cors from "cors";
import { env } from "./env";
import { CONTRACT_VERSION } from "./contract";
import { elevenlabsRouter } from "./routes/elevenlabs";
import { callRouter } from "./routes/call";
import { devRouter } from "./routes/dev";

export function createApp() {
  const app = express();
  app.set("trust proxy", true);
  // Exact origins from env, plus this project's Vercel deploys (u-hackathon.vercel.app and every
  // u-hackathon-*.vercel.app preview). Not *.vercel.app: unknown origins must stay rejected (security probe).
  const vercelPreview = /^https:\/\/u-hackathon(-[a-z0-9-]+)?\.vercel\.app$/;
  app.use(cors({ origin: [...env.CORS_ORIGINS.split(",").map(s => s.trim()), vercelPreview] }));

  // 1) raw body FIRST for the ElevenLabs HMAC check (before any json parser)
  app.use(elevenlabsRouter);
  // 2) JSON for everything else
  app.use(express.json({ limit: "1mb" }));
  app.use(callRouter);
  app.use(devRouter);

  app.get("/health", (_req, res) => res.json({ ok: true, contractVersion: CONTRACT_VERSION }));
  app.use((err: any, _req: any, res: any, _next: any) => { console.error(err); res.status(500).json({ error: "internal" }); });
  return app;
}
