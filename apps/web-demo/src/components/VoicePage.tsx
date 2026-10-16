// #voice/<callId>: grandma's side of a known-caller call, opened by the app when she taps รับสาย.
import { useEffect, useRef, useState } from "react";
import { callCaller, type VoiceLink } from "../lib/voice";

export function VoicePage({ callId }: { callId: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const link = useRef<VoiceLink | null>(null);
  const [phase, setPhase] = useState<"ready" | "connecting" | "talking" | "ended" | "error">("ready");
  useEffect(() => () => link.current?.stop(), []);

  async function start() {
    audio.current ??= new Audio(); // created inside the tap so iOS lets it play
    void audio.current.play().catch(() => {});
    setPhase("connecting");
    try {
      link.current = await callCaller(callId, audio.current, () => setPhase("talking"), () => setPhase("ended"));
    } catch (e) {
      console.warn("[voice]", e);
      setPhase("error");
    }
  }
  function hangUp() { link.current?.stop(); link.current = null; setPhase("ended"); }

  const text = { ready: "แตะเพื่อเริ่มคุย", connecting: "กำลังเชื่อมต่อสาย…", talking: "กำลังคุยอยู่", ended: "วางสายแล้ว", error: "เชื่อมต่อเสียงไม่ได้ (อนุญาตไมโครโฟนแล้วลองใหม่)" }[phase];
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "inherit" }}>
      <div style={{ display: "grid", gap: 24 }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>{text}</h1>
        {phase === "ready" || phase === "error" ? (
          <button className="btn btn--primary" style={{ fontSize: 24, padding: "20px 40px" }} onClick={() => void start()}>รับสาย / เริ่มคุย</button>
        ) : phase !== "ended" ? (
          <button className="btn" style={{ fontSize: 24, padding: "20px 40px", background: "#D93025", color: "#fff" }} onClick={hangUp}>วางสาย</button>
        ) : null}
      </div>
    </main>
  );
}
