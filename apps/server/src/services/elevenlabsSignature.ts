import crypto from "crypto";

/** Header `ElevenLabs-Signature: t=<unix>,v0=<hex>`, hex = HMAC-SHA256(secret, `${t}.${rawBody}`). */
export function verifyElevenLabsSignature(raw: string, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map(p => { const i = p.indexOf("="); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }));
  const t = parts["t"], v0 = parts["v0"];
  if (!t || !v0 || Math.abs(Date.now() / 1000 - Number(t)) > 30 * 60) return false;
  const mac = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return mac.length === v0.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(v0));
}
