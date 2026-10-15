import { useEffect, useState } from "react";
import type { CallDoc } from "../lib/contract";
import { useLang, type StrKey } from "../lib/i18n";
import type { CallState } from "../lib/useBrowserCall";

const SCENARIOS = [
  { id: "rider", icon: "🚚", label: "scenario_rider", say: "scenario_rider_say" },
  { id: "police", icon: "👮", label: "scenario_police", say: "scenario_police_say" },
  { id: "clinic", icon: "🏥", label: "scenario_clinic", say: "scenario_clinic_say" },
] as const satisfies readonly { id: string; icon: string; label: StrKey; say: StrKey }[];

function useClock(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [since]);
  if (!since) return null;
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  identity: string;
  state: CallState;
  onCall: () => void;
  onHangUp: () => void;
  myLiveCall: CallDoc | null; // the judge's own call while the AI is on it
}

export function CallerSide({ identity, state, onCall, onHangUp, myLiveCall }: Props) {
  const { t } = useLang();
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]["id"]>("rider");
  const clock = useClock(state.talkingSince);
  const active = state.phase === "fetching" || state.phase === "connecting" || state.phase === "talking";
  const current = SCENARIOS.find(s => s.id === scenario)!;

  const errorText = state.error && {
    unavailable: t("callUnavailable"),
    micDenied: t("micDenied"),
    micMissing: t("micMissing"),
    failed: t("callFailed"),
  }[state.error];

  return (
    <section className="side side--caller" aria-labelledby="caller-h">
      <h2 id="caller-h" className="side-title">{t("callerSide")}</h2>
      <p className="side-sub">{t("callerSideSub")}</p>

      <dl className="caller-id">
        <dt>{t("yourId")}</dt>
        <dd>client:{identity}</dd>
      </dl>

      <fieldset className="roles">
        <legend>{t("pickRole")}</legend>
        <div className="role-chips">
          {SCENARIOS.map(s => (
            <label key={s.id} className="role-chip">
              <input type="radio" name="scenario" value={s.id} checked={scenario === s.id} onChange={() => setScenario(s.id)} />
              <span><span aria-hidden="true">{s.icon}</span> {t(s.label)}</span>
            </label>
          ))}
        </div>
        <p className="say"><span className="say-label">{t("sayThis")}</span> {t(current.say)}</p>
      </fieldset>

      <div className="dial">
        {active ? (
          <button className="dial-btn dial-btn--hang" onClick={onHangUp}>
            <PhoneIcon down /> <span>{t("hangUp")}</span>
          </button>
        ) : (
          <button className="dial-btn" onClick={onCall}>
            <PhoneIcon /> <span>{t("callGrandma")}</span>
          </button>
        )}
        <p className="dial-state" role="status" aria-live="polite">
          {t(`st_${state.phase}`)}{clock && state.phase === "talking" ? ` · ${clock}` : ""}
        </p>
      </div>

      {myLiveCall && (myLiveCall.status === "screening" || myLiveCall.status === "analyzing") && (
        <p className="note note--alert" role="status">📲 {t("guardianAlertedNow")}</p>
      )}
      {state.phase === "ended" && <a className="note note--next" href="#inbox">⬇ {t("afterCall")}</a>}
      {errorText && (
        <div className="note note--error" role="alert">
          <p>{errorText}</p>
          {state.error === "unavailable" && <p className="note-hint">{t("callUnavailableHint")}</p>}
        </div>
      )}
    </section>
  );
}

function PhoneIcon({ down = false }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" style={down ? { transform: "rotate(135deg)" } : undefined}>
      <path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
    </svg>
  );
}
