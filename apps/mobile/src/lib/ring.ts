// Grandma-mode ringing (update 05): ringtone + vibration, and auto-opening the ring screen
// when a whitelisted ("forwarded") call arrives while the app is open.
import { useEffect, useRef } from "react";
import { Vibration } from "react-native";
import { router, type Href } from "expo-router";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useCalls } from "./hooks";
import { tsToDate } from "./time";

const RING_SOURCE = require("../../assets/ring.mp3");

/** How long a forwarded call keeps ringing before it counts as missed. */
export const RING_TIMEOUT_MS = 30_000;

// A call that shows up live is rung even if the device clock says it's a bit older than 30 s.
const SKEW_TOLERANCE_MS = 5 * 60_000;

// [wait, vibrate, wait, vibrate, …] in ms; repeated from index 0. Long buzz like a real phone.
const VIBRATION_PATTERN = [0, 1000, 800, 1000, 1200];

/**
 * While `active`: loops assets/ring.mp3 (also in silent mode where the OS allows) and vibrates in a
 * long repeating pattern. Stops by itself after 30 s, and on inactive/unmount.
 */
export function useRingtone(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let player: AudioPlayer | null = null;

    // expo-audio v57: playsInSilentMode (iOS ringer switch); doNotMix takes audio focus from other apps.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix", shouldPlayInBackground: false }).catch(
      (e: unknown) => console.warn("[ring] setAudioModeAsync failed", e),
    );
    try {
      player = createAudioPlayer(RING_SOURCE);
      player.loop = true;
      player.volume = 1;
      player.play();
    } catch (e) {
      console.warn("[ring] audio failed, vibrating only", e);
    }
    try {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    } catch {
      // vibration unsupported (web/desktop) → ignore
    }

    const stop = () => {
      if (stopped) return;
      stopped = true;
      Vibration.cancel();
      if (player) {
        try {
          player.pause();
          player.remove();
        } catch {
          // already released
        }
        player = null;
      }
    };
    const timer = setTimeout(stop, RING_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [active]);
}

/**
 * When `enabled` (grandma mode), opens /ring/{id} once per call for every call that is
 * `forwarded`, has no `ownerResponse` yet, and either started within the last 30 s or appeared
 * after the first snapshot (covers a device clock that is off by up to a few minutes).
 */
export function useAutoRing(enabled: boolean): void {
  const { calls, loading } = useCalls();
  const opened = useRef(new Set<string>());
  const initialIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (initialIds.current === null) initialIds.current = new Set(calls.map((c) => c.id));
    if (!enabled) return;
    const now = Date.now();
    for (const c of calls) {
      if (c.status !== "forwarded" || c.ownerResponse != null || c.endedAt) continue;
      if (opened.current.has(c.id)) continue;
      const ageMs = now - tsToDate(c.startedAt).getTime();
      const fresh = ageMs <= RING_TIMEOUT_MS;
      const appearedLive = !initialIds.current.has(c.id) && ageMs <= SKEW_TOLERANCE_MS;
      if (!fresh && !appearedLive) continue;
      opened.current.add(c.id);
      router.push(`/ring/${c.id}` as Href);
      break; // one ring screen at a time; the next snapshot picks up any other call
    }
  }, [enabled, calls, loading]);
}
