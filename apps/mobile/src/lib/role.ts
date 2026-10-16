// Device role (update 05 "grandma mode"). Persisted locally; null = never chosen (first launch → chooser).
// A tiny module-level store so every useDeviceRole() and non-React code (push.ts) see the same value.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// "caller" = demo-only stranger phone: opens the web caller page to ring grandma's number through the AI.
export type DeviceRole = "guardian" | "grandma" | "caller";

const STORAGE_KEY = "knockfirst.role";

type RoleState = { role: DeviceRole | null; loaded: boolean };

let state: RoleState = { role: null, loaded: false };
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: RoleState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): RoleState => state;

function isRole(v: unknown): v is DeviceRole {
  return v === "guardian" || v === "grandma" || v === "caller";
}

/** Reads the saved role once (idempotent). Storage errors count as "never chosen". */
export function loadDeviceRole(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      let saved: string | null = null;
      try {
        saved = await AsyncStorage.getItem(STORAGE_KEY);
      } catch (e) {
        console.warn("[role] read failed", e);
      }
      // setRole() may have run while we were reading: keep that choice.
      if (!state.loaded) setState({ role: isRole(saved) ? saved : null, loaded: true });
    })();
  }
  return loadPromise;
}

/** Current role for non-React code (null until loaded or never chosen). */
export function getDeviceRole(): DeviceRole | null {
  return state.role;
}

/** Updates every subscriber immediately, then persists (a failed write only logs). */
export async function setDeviceRole(role: DeviceRole): Promise<void> {
  setState({ role, loaded: true });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, role);
  } catch (e) {
    console.warn("[role] save failed", e);
  }
}

export function useDeviceRole(): { role: DeviceRole | null; loaded: boolean; setRole(r: DeviceRole): Promise<void> } {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void loadDeviceRole();
  }, []);
  const setRole = useCallback((r: DeviceRole) => setDeviceRole(r), []);
  return { role: s.role, loaded: s.loaded, setRole };
}
