import express from "express";
import cors from "cors";
import { env } from "./env";
import { CONTRACT_VERSION } from "./contract";
import { elevenlabsRouter } from "./routes/elevenlabs";
import { twilioRouter } from "./routes/twilio";
import { voiceTokenRouter } from "./routes/voiceToken";
import { devRouter } from "./routes/dev";

const app = express();
app.set("trust proxy", true);
app.use(cors({ origin: env.CORS_ORIGINS.split(",").map(s => s.trim()) }));

// 1) raw body FIRST for the ElevenLabs HMAC check (before any json parser)
app.use(elevenlabsRouter);
// 2) Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(twilioRouter);
// 3) JSON for everything else
app.use(express.json({ limit: "1mb" }));
app.use(voiceTokenRouter);
app.use(devRouter);

app.get("/health", (_req, res) => res.json({ ok: true, contractVersion: CONTRACT_VERSION }));
app.use((err: any, _req: any, res: any, _next: any) => { console.error(err); res.status(500).json({ error: "internal" }); });
app.listen(env.PORT, () => console.log(`LukLan server on :${env.PORT}`));
