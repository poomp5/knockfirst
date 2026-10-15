import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { paths, type CallDoc } from "./contract";
import { FAMILY_ID, PREVIEW_MODE } from "./env";
import { db, ensureSignedIn } from "./firebase";
import { sampleCalls } from "./sample";

export type InboxState =
  | { kind: "loading" }
  | { kind: "live"; calls: CallDoc[] }
  | { kind: "preview"; calls: CallDoc[] }
  | { kind: "error"; message: string };

/** Realtime listener on the family's calls (A6: orderBy startedAt desc, limit 100, no where). */
export function useCalls(): InboxState {
  const [state, setState] = useState<InboxState>(
    PREVIEW_MODE ? { kind: "preview", calls: sampleCalls() } : { kind: "loading" },
  );

  useEffect(() => {
    if (PREVIEW_MODE || !db) return;
    const firestore = db;
    let stop: (() => void) | undefined;
    let cancelled = false;
    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        const q = query(collection(firestore, paths.calls(FAMILY_ID)), orderBy("startedAt", "desc"), limit(100));
        stop = onSnapshot(
          q,
          snap => setState({ kind: "live", calls: snap.docs.map(d => ({ ...(d.data() as CallDoc), id: d.id })) }),
          err => setState({ kind: "error", message: err.code ?? err.message }),
        );
      })
      .catch(err => setState({ kind: "error", message: err?.code ?? String(err) }));
    return () => { cancelled = true; stop?.(); };
  }, []);

  return state;
}

/** startedAt can be briefly null while serverTimestamp() is pending. */
export function callTime(c: CallDoc): Date | null {
  try { return c.startedAt?.toDate() ?? null; } catch { return null; }
}
