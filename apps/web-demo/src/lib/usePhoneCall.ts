// The caller page is the phone line (update 05): POST /call/start, then by route:
// blocked → busy tone · whitelist → grandma's phone rings (app) · screened → live ElevenLabs conversation.
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceConversation } from "@elevenlabs/client";
import { doc, onSnapshot } from "firebase/firestore";
import { paths } from "./contract";
import { FAMILY_ID, SERVER_URL } from "./env";
import { db, ensureSignedIn } from "./firebase";
import { stripVoiceTags } from "./speech";

export type CallPhase =
  | "idle" | "dialing" | "connecting" | "talking" | "ended"   // unknown number → AI
  | "ringing" | "answered" | "declined" | "noAnswer"         // known number → grandma's phone
  | "blocked";
export type CallError = "unavailable" | "aiUnavailable" | "badNumber" | "busy" | "micDenied" | "micMissing" | "failed";
export interface Caption { role: "assistant" | "caller"; text: string }
export interface CallState {
  phase: CallPhase;
  error: CallError | null;
  since: number | null;        // talking / ringing started
  callId: string | null;
  callerKey: string | null;
  displayName: string | null;
  ownerName: string | null;
  captions: Caption[];
}

interface StartReply {
  callId: string;
  route: "blocked" | "whitelist" | "screened";
  callerKey: string;
  displayName: string;
  ownerName: string;
  conversationToken?: string;
  dynamicVariables?: Record<string, string>;
}

const IDLE: CallState = { phase: "idle", error: null, since: null, callId: null, callerKey: null, displayName: null, ownerName: null, captions: [] };
const RING_TIMEOUT_MS = 30_000;

function classify(err: unknown): CallError {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "micDenied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "micMissing";
  return "failed";
}

/** Phone tones with WebAudio: Thai-style 425 Hz ringback (1 s on / 4 s off) and a short busy signal. */
function tones(ctx: AudioContext | null) {
  const beep = (start: number, dur: number) => {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 425;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    g.gain.setValueAtTime(0.12, start + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(ctx.destination);
    o.start(start); o.stop(start + dur + 0.01);
  };
  return {
    busy() { if (ctx) for (let i = 0; i < 4; i++) beep(ctx.currentTime + i * 0.5, 0.25); },
    ringback(): () => void {
      if (!ctx) return () => {};
      const ring = () => beep(ctx.currentTime, 1);
      ring();
      const id = setInterval(ring, 5000);
      return () => clearInterval(id);
    },
  };
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${SERVER_URL}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function usePhoneCall() {
  const [state, setState] = useState<CallState>(IDLE);
  const conv = useRef<VoiceConversation | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const cleanup = useRef<(() => void)[]>([]);
  const ended = useRef(false);
  const ringFinish = useRef<((p: "answered" | "declined" | "noAnswer" | "ended") => void) | null>(null);

  const runCleanup = useCallback(() => { cleanup.current.splice(0).forEach(f => { try { f(); } catch { /* already stopped */ } }); }, []);
  useEffect(() => () => { runCleanup(); void conv.current?.endSession(); }, [runCleanup]);

  /** Tell the server the call is over (once). Screened calls pass the conversation id for the fallback fetch. */
  const endOnServer = useCallback((callId: string, conversationId?: string) => {
    if (ended.current) return;
    ended.current = true;
    void postJson("/call/end", { callId, familyId: FAMILY_ID, ...(conversationId ? { conversationId } : {}) })
      .catch(e => console.warn("[call] /call/end failed", e));
  }, []);

  const start = useCallback(async (callerNumber: string, callerLabel?: string) => {
    if (conv.current) return;
    runCleanup();
    ended.current = false;
    if (!SERVER_URL) { setState({ ...IDLE, error: "unavailable" }); return; }

    // Create the AudioContext inside the click, before any await, so browsers allow sound.
    try { audio.current ??= new AudioContext(); void audio.current.resume(); } catch { audio.current = null; }
    const tone = tones(audio.current);
    setState({ ...IDLE, phase: "dialing" });

    let r: StartReply;
    try {
      const res = await postJson("/call/start", { callerNumber, callerLabel: callerLabel?.trim() || undefined, familyId: FAMILY_ID });
      if (res.status === 400) { setState({ ...IDLE, error: "badNumber" }); return; }
      if (res.status === 429) { setState({ ...IDLE, error: "busy" }); return; }
      if (res.status === 502) { setState({ ...IDLE, error: "aiUnavailable" }); return; }
      if (!res.ok) throw new Error(`call/start ${res.status}`);
      r = await res.json();
    } catch (e) {
      console.warn("[call] start failed", e);
      setState({ ...IDLE, error: "unavailable" });
      return;
    }
    const base = { ...IDLE, callId: r.callId, callerKey: r.callerKey, displayName: r.displayName, ownerName: r.ownerName };

    if (r.route === "blocked") {
      tone.busy();
      setState({ ...base, phase: "blocked" });
      return;
    }

    if (r.route === "whitelist") {
      setState({ ...base, phase: "ringing", since: Date.now() });
      cleanup.current.push(tone.ringback());
      const finish = (phase: "answered" | "declined" | "noAnswer" | "ended") => {
        runCleanup();
        endOnServer(r.callId);
        setState(s => (s.callId === r.callId ? { ...s, phase } : s));
      };
      const timer = setTimeout(() => finish("noAnswer"), RING_TIMEOUT_MS);
      cleanup.current.push(() => clearTimeout(timer));
      cleanup.current.push(() => { ringFinish.current = null; });
      ringFinish.current = finish;
      if (db) {
        const firestore = db;
        ensureSignedIn().then(() => {
          if (ringFinish.current !== finish) return; // already over
          const stop = onSnapshot(doc(firestore, paths.call(FAMILY_ID, r.callId)), snap => {
            const resp = snap.get("ownerResponse");
            if (resp === "answered" || resp === "declined") finish(resp);
          }, err => console.warn("[call] ring listener", err));
          cleanup.current.push(stop);
        }).catch(err => console.warn("[call] sign-in for ring listener", err));
      }
      return;
    }

    // screened → talk to the AI in the browser (WebRTC)
    if (!r.conversationToken) { setState({ ...IDLE, error: "aiUnavailable" }); return; }
    setState({ ...base, phase: "connecting" });
    try {
      // Loaded on first call only: keeps the first page load small.
      const { Conversation } = await import("@elevenlabs/client");
      const c = (await Conversation.startSession({
        conversationToken: r.conversationToken,
        connectionType: "webrtc",
        dynamicVariables: r.dynamicVariables,
        onConnect: () => setState(s => ({ ...s, phase: "talking", since: Date.now() })),
        onMessage: m => {
          const role: Caption["role"] = m.role === "agent" ? "assistant" : "caller";
          const text = role === "assistant" ? stripVoiceTags(m.message ?? "") : m.message?.trim();
          if (!text) return;
          setState(s => ({ ...s, captions: [...s.captions, { role, text }].slice(-8) }));
        },
        onDisconnect: () => {
          const id = conv.current?.getId();
          conv.current = null;
          endOnServer(r.callId, id);
          setState(s => (s.callId === r.callId ? { ...s, phase: "ended" } : s));
        },
        onError: (message: string) => console.warn("[call] conversation error", message),
      })) as VoiceConversation;
      conv.current = c;
    } catch (e) {
      console.warn("[call] startSession failed", e);
      conv.current = null;
      endOnServer(r.callId);
      setState({ ...base, phase: "idle", error: classify(e) });
    }
  }, [endOnServer, runCleanup]);


  const hangUp = useCallback(() => {
    if (conv.current) { void conv.current.endSession(); return; } // onDisconnect finishes the call
    if (ringFinish.current) { ringFinish.current("ended"); return; }
    runCleanup();
    setState(s => ({ ...s, phase: s.phase === "dialing" || s.phase === "connecting" ? "idle" : s.phase }));
  }, [runCleanup]);

  return { state, start, hangUp };
}
