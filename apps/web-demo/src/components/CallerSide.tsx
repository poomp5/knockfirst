import { useState } from "react";
import type { CallDoc } from "../lib/contract";
import { loadLastNumber, randomThaiMobile, saveLastNumber } from "../lib/callerNumber";
import { useLang, type StrKey } from "../lib/i18n";
import { useClock } from "../lib/useClock";
import type { CallPhase, CallState } from "../lib/usePhoneCall";
import { Icon, type IconName } from "./Icon";

const KNOWN_CALLER = "081-111-2222";

const SCENARIOS = [
  { id: "rider", icon: "truck", label: "role_rider", say: "scenario_rider_say" },
  { id: "police", icon: "badge", label: "role_police", say: "scenario_police_say" },
  { id: "clinic", icon: "cross", label: "role_clinic", say: "scenario_clinic_say" },
  // Seeded on grandma's known-callers list: skips the AI and rings grandma's phone.
  { id: "family", icon: "home", label: "role_family", say: "scenario_family_say", number: KNOWN_CALLER },
] as const satisfies readonly { id: string; icon: IconName; label: StrKey; say: StrKey; number?: string }[];

export const ACTIVE: ReadonlySet<CallPhase> = new Set(["dialing", "connecting", "talking", "ringing", "answered"]); // answered = live line with grandma

/** Status text + clock, shared by the caller panel and the mobile sticky call bar. */
export function useStatusLine(state: CallState) {
  const { lang, t } = useLang();
  const who = lang === "en" || !state.ownerName ? t("grandma") : state.ownerName;
  const clock = useClock(state.phase === "talking" || state.phase === "ringing" ? state.since : null);
  return { text: t(`st_${state.phase}`).replace("{name}", who), clock };
}

interface Props {
  state: CallState;
  onCall: (number: string, name: string) => void;
  onHangUp: () => void;
  myLiveCall: CallDoc | null; // the judge's own call while the AI is on it
}

export function CallerSide({ state, onCall, onHangUp, myLiveCall }: Props) {
  const { t } = useLang();
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]["id"]>("rider");
  const [number, setNumber] = useState(randomThaiMobile);
  const [last, setLast] = useState(loadLastNumber);
  const [name, setName] = useState("");
  const active = ACTIVE.has(state.phase);
  const { text: statusLine, clock } = useStatusLine(state);
  const current = SCENARIOS.find(s => s.id === scenario)!;

  function pick(s: (typeof SCENARIOS)[number]) {
    setScenario(s.id);
    if ("number" in s) setNumber(s.number);
    else if (number === KNOWN_CALLER) setNumber(randomThaiMobile()); // leaving "family": back to a stranger's number
  }

  function call() {
    saveLastNumber(number);
    setLast(number);
    onCall(number, name);
  }

  const errorText = state.error && ({
    unavailable: t("callUnavailable"),
    aiUnavailable: t("aiUnavailable"),
    aiQuota: t("aiQuota"),
    badNumber: t("badNumber"),
    busy: t("tooManyCalls"),
    micDenied: t("micDenied"),
    micMissing: t("micMissing"),
    failed: t("callFailed"),
  } as const)[state.error];

  const showCaptions = (state.phase === "talking" || state.phase === "ended") && state.captions.length > 0;

  return (
    <section className={`side side--caller${active ? " is-active" : ""}`} aria-labelledby="caller-h">
      <header className="side-head">
        <h2 id="caller-h" className="side-title"><span className="step" aria-hidden="true">1</span>{t("callerSide")}</h2>
        <p className="side-sub">{t("callerLead")}</p>
      </header>

      <fieldset className="roles">
        <legend>{t("pickRole")}</legend>
        <div className="role-chips">
          {SCENARIOS.map(s => (
            <label key={s.id} className="role-chip">
              <input type="radio" name="scenario" value={s.id} checked={scenario === s.id} onChange={() => pick(s)} disabled={active} />
              <span><Icon name={s.icon} size={20} className="icon role-icon" />{t(s.label)}</span>
            </label>
          ))}
        </div>
        <figure className="say">
          <figcaption className="say-label">{t("sayThis")}</figcaption>
          <blockquote>{t(current.say)}</blockquote>
        </figure>
      </fieldset>

      <div className="callas">
        <label className="field field--number">
          <span>{t("callAs")}</span>
          <input type="tel" inputMode="tel" autoComplete="off" value={number} disabled={active}
            onChange={e => setNumber(e.target.value)} />
        </label>
        <div className="callas-btns">
          <button type="button" className="btn btn--chip" disabled={active} onClick={() => setNumber(randomThaiMobile())}>
            <Icon name="refresh" size={16} /> {t("newNumber")}</button>
          <button type="button" className="btn btn--chip" disabled={active || !last || last === number}
            onClick={() => last && setNumber(last)}><Icon name="undo" size={16} /> {t("sameNumber")}</button>
        </div>
        <label className="field field--name">
          <span>{t("yourName")}</span>
          <input type="text" autoComplete="off" maxLength={40} value={name} disabled={active} onChange={e => setName(e.target.value)} />
        </label>
      </div>

      <div className="dial">
        {active ? (
          <button className="dial-btn dial-btn--hang" onClick={onHangUp}>
            <PhoneIcon down /> <span>{t("hangUp")}</span>
          </button>
        ) : (
          <button className="dial-btn" onClick={call} disabled={!number.trim()}>
            <PhoneIcon /> <span>{t("callGrandma")}</span>
          </button>
        )}
        <p className={`dial-state dial-state--${state.phase}`} role="status" aria-live="polite">
          <span>{statusLine}</span>{clock && <span className="dial-clock">{clock}</span>}
        </p>
      </div>

      {showCaptions && (
        <div className="captions" aria-live="polite">
          <p className="captions-title">{t("liveCaptions")}</p>
          <ol>
            {state.captions.map((c, i) => (
              <li key={i} className={`cap cap--${c.role}`}>
                <span className="cap-who">{c.role === "caller" ? t("you") : t("assistant")}</span> {c.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      {myLiveCall && !state.error && (myLiveCall.status === "screening" || myLiveCall.status === "analyzing") && (
        <p className="note note--alert" role="status"><Icon name="bell" /> {t("guardianAlertedNow")}</p>
      )}
      {state.phase === "blocked" && <p className="note note--error" role="status"><Icon name="block" /> {t("blockedNow")}</p>}
      {state.phase === "answered" && (
        <p className="note note--ok" role="status"><Icon name="checkCircle" /> {t("grandmaAnswered")}</p>
      )}
      {(state.phase === "declined" || state.phase === "noAnswer") && (
        <p className="note note--done" role="status">{state.phase === "declined" ? t("grandmaDeclined") : t("grandmaNoAnswer")}</p>
      )}
      {state.phase === "ended" && <a className="note note--next" href="#inbox">{t("afterCall")} <Icon name="arrowRight" /></a>}
      {errorText && (
        <div className="note note--error" role="alert">
          <p>{errorText}</p>
          {state.error === "unavailable" && <p className="note-hint">{t("callUnavailableHint")}</p>}
          {(state.error === "aiQuota" || state.error === "aiUnavailable") && (
            <p className="note-hint">
              <button type="button" className="link-btn" onClick={() => pick(SCENARIOS.find(s => s.id === "family")!)}>{t("tryKnownCaller")}</button>
            </p>
          )}
        </div>
      )}
      <p className="tip"><Icon name="headphones" size={16} /> {t("earphones")}</p>
    </section>
  );
}

export function PhoneIcon({ down = false, size = 26 }: { down?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={down ? { transform: "rotate(135deg)" } : undefined}>
      <path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
    </svg>
  );
}
