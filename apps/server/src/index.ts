import express from "express";
import cors from "cors";
import { env } from "./env";
import { CONTRACT_VERSION } from "./contract";

const app = express();
app.set("trust proxy", true);
app.use(cors({ origin: env.CORS_ORIGINS.split(",").map(s => s.trim()) }));

// Routers (elevenlabs → urlencoded + twilio → json + voiceToken/dev) are mounted here in B3.

app.get("/health", (_req, res) => res.json({ ok: true, contractVersion: CONTRACT_VERSION }));
app.use((err: any, _req: any, res: any, _next: any) => { console.error(err); res.status(500).json({ error: "internal" }); });
app.listen(env.PORT, () => console.log(`KnockFirst server on :${env.PORT}`));
