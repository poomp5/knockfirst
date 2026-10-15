import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import { SERVER_URL } from "./env";

export type CallPhase = "idle" | "fetching" | "connecting" | "talking" | "ended";
export type CallError = "unavailable" | "micDenied" | "micMissing" | "failed";
export interface CallState { phase: CallPhase; error: CallError | null; talkingSince: number | null }

/** Stable per-browser identity so a judge's calls stay highlighted after a reload. */
export function getIdentity(): string {
  const fresh = () => `judge-${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
  try {
    const saved = localStorage.getItem("kf-identity");
    if (saved && /^judge-[a-z0-9]{6}$/.test(saved)) return saved;
    const id = fresh();
    localStorage.setItem("kf-identity", id);
    return id;
  } catch {
    return fresh();
  }
}

function classify(err: unknown): CallError {
  const code = (err as { code?: number })?.code;
  if (code === 31401) return "micDenied";   // UserMediaErrors.PermissionDeniedError
  if (code === 31402) return "micMissing";  // UserMediaErrors.AcquisitionFailedError
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError") return "micDenied";
  if (name === "NotFoundError") return "micMissing";
  return "failed";
}

export function useBrowserCall(identity: string) {
  const [state, setState] = useState<CallState>({ phase: "idle", error: null, talkingSince: null });
  const device = useRef<Device | null>(null);
  const call = useRef<Call | null>(null);

  const teardown = useCallback(() => {
    call.current = null;
    device.current?.destroy();
    device.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    if (call.current) return;
    if (!SERVER_URL) { setState({ phase: "idle", error: "unavailable", talkingSince: null }); return; }
    setState({ phase: "fetching", error: null, talkingSince: null });

    let token: string, to: string;
    try {
      const res = await fetch(`${SERVER_URL}/voice/token?identity=${encodeURIComponent(identity)}`);
      if (!res.ok) throw new Error(`token ${res.status}`);
      ({ token, to } = await res.json());
      if (!token || !to) throw new Error("token response incomplete");
    } catch (e) {
      console.warn("[call] token fetch failed", e);
      setState({ phase: "idle", error: "unavailable", talkingSince: null });
      return;
    }

    const fail = (err: unknown) => {
      console.warn("[call] error", err);
      teardown();
      setState({ phase: "idle", error: classify(err), talkingSince: null });
    };
    const ended = () => { teardown(); setState({ phase: "ended", error: null, talkingSince: null }); };

    try {
      // Loaded on first call: the Voice SDK is most of the bundle.
      const { Device } = await import("@twilio/voice-sdk");
      const d = new Device(token, { closeProtection: true });
      device.current = d;
      d.on("error", fail);
      setState({ phase: "connecting", error: null, talkingSince: null });
      const c = await d.connect({ params: { To: to } });
      call.current = c;
      c.on("accept", () => setState({ phase: "talking", error: null, talkingSince: Date.now() }));
      c.on("disconnect", ended);
      c.on("cancel", ended);
      c.on("reject", ended);
      c.on("error", fail);
    } catch (e) {
      fail(e);
    }
  }, [identity, teardown]);

  const hangUp = useCallback(() => {
    if (call.current) call.current.disconnect();
    else { teardown(); setState(s => ({ ...s, phase: "idle" })); }
  }, [teardown]);

  return { state, start, hangUp };
}
