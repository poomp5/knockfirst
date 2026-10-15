import { db, FieldValue } from "../firebase";
import { env } from "../env";
import { paths, TranscriptTurn } from "../contract";
import { processCompletedCall } from "./pipeline";

const API = "https://api.elevenlabs.io/v1/convai";

async function el(path: string): Promise<any> {
  const r = await fetch(`${API}${path}`, { headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

/** One-time WebRTC token for a private agent. The response also carries the conversation id (SDK TokenResponseModel). */
export async function getConversationToken(): Promise<{ token: string; conversationId: string | null }> {
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_AGENT_ID) throw new Error("ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID not set");
  const d = await el(`/conversation/token?agent_id=${encodeURIComponent(env.ELEVENLABS_AGENT_ID)}`);
  if (typeof d?.token !== "string" || !d.token) throw new Error("ElevenLabs token response has no token");
  return { token: d.token, conversationId: typeof d.conversation_id === "string" ? d.conversation_id : null };
}

export const getConversation = (conversationId: string) => el(`/conversations/${encodeURIComponent(conversationId)}`);

export interface MappedConversation {
  conversationId: string | null;
  status: string | null;
  vars: Record<string, string>;
  transcript: TranscriptTurn[];
  agentData: Record<string, unknown> | null;
  durationSec: number | null;
}

/** Same mapping for the post-call webhook's `data` and GET /conversations/{id}. */
export function mapConversation(d: any): MappedConversation {
  const raw = d?.conversation_initiation_client_data?.dynamic_variables ?? {};
  const vars = Object.fromEntries(Object.entries(raw).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)]));
  const transcript: TranscriptTurn[] = (d?.transcript ?? [])
    .filter((t: any) => typeof t?.message === "string" && t.message.trim())
    .map((t: any) => ({ role: t.role === "agent" ? "assistant" : "caller", text: t.message.trim(), t: Number(t.time_in_call_secs ?? 0) }));
  return {
    conversationId: d?.conversation_id ?? null,
    status: d?.status ?? null,
    vars,
    transcript,
    agentData: d?.analysis?.data_collection_results ?? null,
    durationSec: d?.metadata?.call_duration_secs ?? null,
  };
}

// conversations/{conversationId} = { familyId, callId } — server only (Sky's rules deny clients).
export async function saveConversationMapping(conversationId: string, familyId: string, callId: string) {
  await db.collection("conversations").doc(conversationId).set({ familyId, callId, createdAt: FieldValue.serverTimestamp() });
}

export async function getConversationMapping(conversationId: string): Promise<{ familyId: string; callId: string } | null> {
  const s = await db.collection("conversations").doc(conversationId).get();
  return s.exists ? { familyId: s.get("familyId"), callId: s.get("callId") } : null;
}

/** Tunable so tests don't have to wait 25 s. */
export const fallbackTiming = { firstMs: 25_000, everyMs: 5_000, maxMs: 60_000 };
const pending = new Set<string>();

/**
 * If no post-call webhook has processed the call 25 s after hang-up, fetch the conversation ourselves
 * (every 5 s, for up to 60 s more) and run the same pipeline. The pipeline's claim makes a late webhook a no-op.
 */
export function scheduleFallback(familyId: string, callId: string, conversationId: string) {
  const key = `${familyId}/${callId}`;
  if (pending.has(key)) return;
  pending.add(key);
  const deadline = Date.now() + fallbackTiming.firstMs + fallbackTiming.maxMs;
  const tick = async () => {
    try {
      const snap = await db.doc(paths.call(familyId, callId)).get();
      if (!snap.exists || snap.get("status") !== "screening") return void pending.delete(key); // webhook got there first
      const conv = mapConversation(await getConversation(conversationId));
      if (conv.status === "done" || conv.status === "failed") {
        console.log(`fallback: no webhook for ${callId}, processing conversation ${conversationId} (${conv.status})`);
        await processCompletedCall({
          familyId, callId, callerKey: snap.get("callerKey"), conversationId,
          transcript: conv.transcript, agentData: conv.agentData, durationSec: conv.durationSec,
        });
        return void pending.delete(key);
      }
    } catch (e) {
      console.warn(`fallback ${callId} failed`, e);
    }
    if (Date.now() + fallbackTiming.everyMs > deadline) {
      console.warn(`fallback gave up on ${callId} (conversation ${conversationId})`);
      return void pending.delete(key);
    }
    setTimeout(tick, fallbackTiming.everyMs);
  };
  setTimeout(tick, fallbackTiming.firstMs);
}
