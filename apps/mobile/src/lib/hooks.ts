// Realtime data hooks (B3). Firestore listeners in live mode, the in-memory mock store when USE_MOCKS.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { paths, type BlockedEntry, type CallDoc, type FamilyDoc, type WhitelistEntry } from "./contract";
import { db, ensureSignedIn, FAMILY_ID, USE_MOCKS } from "./firebase";
import { mockStore } from "./mocks";
import { tsToDate } from "./time";

export type FamilyResult = { family: FamilyDoc | null; loading: boolean; error: Error | null };
export type CallsResult = { calls: CallDoc[]; loading: boolean; error: Error | null; retry: () => void };
export type CallResult = { call: CallDoc | null; loading: boolean; error: Error | null };
export type WhitelistResult = { entries: WhitelistEntry[]; loading: boolean; error: Error | null };
export type BlockedResult = { entries: BlockedEntry[]; loading: boolean; error: Error | null };

const EMPTY_CALLS: CallDoc[] = [];
const EMPTY_WHITELIST: WhitelistEntry[] = [];
const EMPTY_BLOCKED: BlockedEntry[] = [];
const noop = () => {};

function byAddedAtDesc<T extends { addedAt: WhitelistEntry["addedAt"] | null | undefined }>(list: T[]): T[] {
  // null addedAt (pending server timestamp) → treated as "now" → sorts on top
  return [...list].sort((a, b) => tsToDate(b.addedAt).getTime() - tsToDate(a.addedAt).getTime());
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

// "estimate" turns pending serverTimestamp() fields into a local estimate instead of null.
function snapData(d: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): DocumentData {
  return d.data({ serverTimestamps: "estimate" }) ?? {};
}

// ---------- Firestore plumbing ----------

type Live<T> = { key: string; value: T; error: Error | null };

/**
 * Subscribes after anonymous sign-in. `key` identifies the subscription (null = idle);
 * when it changes the listener restarts and `loading` is true until the first snapshot.
 */
function useLive<T>(
  key: string | null,
  initial: T,
  subscribe: (onData: (v: T) => void, onError: (e: Error) => void) => Unsubscribe,
): { value: T; loading: boolean; error: Error | null } {
  const [state, setState] = useState<Live<T> | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let unsub: Unsubscribe | undefined;
    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        unsub = subscribe(
          (value) => setState({ key, value, error: null }),
          (error) => {
            console.error(`[hooks] ${key} listener failed`, error);
            setState((prev) => ({ key, value: prev?.key === key ? prev.value : initial, error }));
          },
        );
      })
      .catch((e: unknown) => {
        console.error("[hooks] sign-in failed", e);
        if (!cancelled) setState({ key, value: initial, error: toError(e) });
      });
    return () => {
      cancelled = true;
      unsub?.();
    };
    // `subscribe`/`initial` are derived from `key`; re-subscribing only on key change is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state && state.key === key ? state : null;
  return {
    value: current ? current.value : initial,
    loading: key !== null && current === null,
    error: current?.error ?? null,
  };
}

function useFamilyFirestore(): FamilyResult {
  const { value, loading, error } = useLive<FamilyDoc | null>("family", null, (onData, onError) =>
    onSnapshot(
      doc(db, paths.family(FAMILY_ID)),
      (snap) => onData(snap.exists() ? (snapData(snap) as FamilyDoc) : null),
      onError,
    ),
  );
  return { family: value, loading, error };
}

function useCallsFirestore(): CallsResult {
  const [nonce, setNonce] = useState(0);
  const { value, loading, error } = useLive<CallDoc[]>(`calls#${nonce}`, EMPTY_CALLS, (onData, onError) =>
    onSnapshot(
      query(collection(db, paths.calls(FAMILY_ID)), orderBy("startedAt", "desc"), limit(100)),
      (snap) => onData(snap.docs.map((d) => ({ ...(snapData(d) as Omit<CallDoc, "id">), id: d.id }))),
      onError,
    ),
  );
  return { calls: value, loading, error, retry: () => setNonce((n) => n + 1) };
}

function useCallFirestore(id: string | undefined): CallResult {
  const { value, loading, error } = useLive<CallDoc | null>(id ? `call:${id}` : null, null, (onData, onError) =>
    onSnapshot(
      doc(db, paths.call(FAMILY_ID, id as string)),
      (snap) => onData(snap.exists() ? ({ ...(snapData(snap) as Omit<CallDoc, "id">), id: snap.id }) : null),
      onError,
    ),
  );
  return { call: value, loading, error };
}

function useWhitelistFirestore(): WhitelistResult {
  const { value, loading, error } = useLive<WhitelistEntry[]>("whitelist", EMPTY_WHITELIST, (onData, onError) =>
    onSnapshot(
      collection(db, paths.whitelist(FAMILY_ID)),
      (snap) =>
        onData(byAddedAtDesc(snap.docs.map((d) => ({ ...(snapData(d) as WhitelistEntry), callerKey: d.id })))),
      onError,
    ),
  );
  return { entries: value, loading, error };
}

function useBlockedFirestore(): BlockedResult {
  const { value, loading, error } = useLive<BlockedEntry[]>("blocked", EMPTY_BLOCKED, (onData, onError) =>
    onSnapshot(
      collection(db, paths.blocked(FAMILY_ID)),
      (snap) => onData(byAddedAtDesc(snap.docs.map((d) => ({ ...(snapData(d) as BlockedEntry), callerKey: d.id })))),
      onError,
    ),
  );
  return { entries: value, loading, error };
}

// ---------- Mock implementations ----------

function useMockState() {
  return useSyncExternalStore(mockStore.subscribe, mockStore.getState, mockStore.getState);
}

function useFamilyMock(): FamilyResult {
  return { family: useMockState().family, loading: false, error: null };
}

function useCallsMock(): CallsResult {
  return { calls: useMockState().calls, loading: false, error: null, retry: noop };
}

function useCallMock(id: string | undefined): CallResult {
  const calls = useMockState().calls;
  const call = id ? (calls.find((c) => c.id === id) ?? null) : null;
  return { call, loading: false, error: null };
}

function useWhitelistMock(): WhitelistResult {
  const list = useMockState().whitelist;
  const entries = useMemo(() => byAddedAtDesc(list), [list]);
  return { entries, loading: false, error: null };
}

function useBlockedMock(): BlockedResult {
  const list = useMockState().blocked;
  const entries = useMemo(() => byAddedAtDesc(list), [list]);
  return { entries, loading: false, error: null };
}

// ---------- Public hooks (USE_MOCKS is a build-time constant, so hook order is stable) ----------

/** families/{FAMILY_ID}; family is null when the doc doesn't exist. */
export const useFamily: () => FamilyResult = USE_MOCKS ? useFamilyMock : useFamilyFirestore;
/** Last 100 calls, newest first (startedAt desc). */
export const useCalls: () => CallsResult = USE_MOCKS ? useCallsMock : useCallsFirestore;
/** One call, live. call is null when id is undefined or the doc doesn't exist. */
export const useCall: (id: string | undefined) => CallResult = USE_MOCKS ? useCallMock : useCallFirestore;
/** Whitelist sorted by addedAt desc. */
export const useWhitelist: () => WhitelistResult = USE_MOCKS ? useWhitelistMock : useWhitelistFirestore;
/** Blocked numbers sorted by addedAt desc. */
export const useBlocked: () => BlockedResult = USE_MOCKS ? useBlockedMock : useBlockedFirestore;
