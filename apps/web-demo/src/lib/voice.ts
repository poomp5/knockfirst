// Known-caller live voice (demo): plain WebRTC between the caller page and grandma's voice page,
// signalled through the public PeerJS server. No AI on this path. Loaded from a CDN on first use.
/* eslint-disable @typescript-eslint/no-explicit-any */
const PEERJS = "https://esm.sh/peerjs@1.5.4";

export const callerPeerId = (callId: string) => `knockfirst-${callId}-caller`;

async function loadPeer(): Promise<any> {
  const m: any = await import(/* @vite-ignore */ PEERJS);
  return m.Peer ?? m.default;
}

export interface VoiceLink { stop(): void }

/** Caller side: wait for grandma's page to call in, answer with our mic, play her voice. */
export async function listenAsCaller(callId: string, audio: HTMLAudioElement, onConnected: () => void): Promise<VoiceLink> {
  const Peer = await loadPeer();
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  const peer = new Peer(callerPeerId(callId));
  peer.on("call", (call: any) => {
    call.answer(mic);
    call.on("stream", (remote: MediaStream) => { audio.srcObject = remote; void audio.play().catch(() => {}); onConnected(); });
  });
  return { stop() { try { peer.destroy(); } catch { /* gone */ } mic.getTracks().forEach(t => t.stop()); audio.srcObject = null; } };
}

/** Grandma side: call the waiting caller with our mic. */
export async function callCaller(callId: string, audio: HTMLAudioElement, onConnected: () => void, onEnd: () => void): Promise<VoiceLink> {
  const Peer = await loadPeer();
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  const peer = new Peer();
  peer.on("open", () => {
    const call = peer.call(callerPeerId(callId), mic);
    call.on("stream", (remote: MediaStream) => { audio.srcObject = remote; void audio.play().catch(() => {}); onConnected(); });
    call.on("close", onEnd);
  });
  peer.on("error", onEnd);
  return { stop() { try { peer.destroy(); } catch { /* gone */ } mic.getTracks().forEach(t => t.stop()); audio.srcObject = null; } };
}
