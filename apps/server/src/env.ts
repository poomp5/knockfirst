import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(8080),
  PUBLIC_BASE_URL: z.string().default("http://localhost:8080"),
  DEFAULT_FAMILY_ID: z.string().default("demo-family"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().min(10),
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_PHONE_NUMBER: z.string().default(""),
  TWILIO_API_KEY_SID: z.string().default(""),
  TWILIO_API_KEY_SECRET: z.string().default(""),
  TWILIO_TWIML_APP_SID: z.string().default(""),
  VALIDATE_TWILIO_SIGNATURE: z.string().default("false").transform(v => v === "true"),
  ELEVENLABS_API_KEY: z.string().default(""),
  ELEVENLABS_AGENT_ID: z.string().default(""),
  ELEVENLABS_WEBHOOK_SECRET: z.string().default(""),
  AUTO_BLOCK_SCORE: z.coerce.number().default(85),
  GLOBAL_BLOCK_THRESHOLD: z.coerce.number().default(3),
  DEMO_ADMIN_TOKEN: z.string().min(16),
  DEMO_OWNER_NAME: z.string().default("คุณยายสมศรี"),
  DEMO_OWNER_PHONE: z.string().default(""),
  SEED_WHITELIST: z.string().default(""),
});
export const env = Env.parse(process.env);
// LLM_* vars are read by Sky's src/ai code directly from process.env.
