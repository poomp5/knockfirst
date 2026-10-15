import { useCallback, useEffect, useState } from "react";
import { CallDrawer } from "./components/CallDrawer";
import { ACTIVE, CallerSide, PhoneIcon, useStatusLine } from "./components/CallerSide";
import { Door, doorMode } from "./components/Door";
import { FamilySide } from "./components/FamilySide";
import { Footer, GetApp, HowItWorks, Results } from "./components/Sections";
import type { CallDoc } from "./lib/contract";
import { useLang } from "./lib/i18n";
import { addMyKey, loadMyKeys } from "./lib/callerNumber";
import { usePhoneCall } from "./lib/usePhoneCall";
import { Icon } from "./components/Icon";
import { useCalls } from "./lib/useCalls";
import { AdminPanel } from "./components/AdminPanel";

// Team-only admin page at #admin (see AdminPanel). Not linked from the public page.
export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash === "#admin" ? <AdminPanel /> : <Demo />;
}

function Demo() {
  const { lang, setLang, t } = useLang();
  const [myKeys, setMyKeys] = useState(loadMyKeys);
  const { state, start, hangUp } = usePhoneCall();
  const call = useCallback((number: string, name: string) => { setMyKeys(addMyKey(number)); void start(number, name); }, [start]);
  const inbox = useCalls();
  const calls = inbox.kind === "live" || inbox.kind === "preview" ? inbox.calls : [];
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? calls.find(c => c.id === openId) ?? null : null; // live doc, updates in place
  const close = useCallback(() => setOpenId(null), []);
  const myCall = state.callId ? calls.find(c => c.id === state.callId) ?? null : null;
  const myLiveCall = myCall && (myCall.status === "screening" || myCall.status === "analyzing") ? myCall : null;
  const mode = doorMode(state, myCall);

  // "Your card is in" toast (mostly for phones, where the inbox is below the fold).
  const [landed, setLanded] = useState<CallDoc | null>(null);
  const onLanded = useCallback((c: CallDoc) => setLanded(c), []);
  useEffect(() => {
    if (!landed) return;
    const id = setTimeout(() => setLanded(null), 9000);
    return () => clearTimeout(id);
  }, [landed]);

  return (
    <>
      <a className="skip" href="#stage">{t("tryCall")}</a>
      <header className="top">
        <img className="top-logo" src="/brand/logo-wordmark.png" alt="KnockFirst" width="154" height="32" />
        <nav className="top-nav" aria-label="KnockFirst">
          <div className="lang" role="group" aria-label="Language / ภาษา">
            <button aria-pressed={lang === "th"} onClick={() => setLang("th")}>ไทย</button>
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en">EN</button>
          </div>
          <a className="top-app" href="#app">{t("getApp")}</a>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-h">
          <h1 id="hero-h" className="hero-title">{phrases(t("tagline")).map((p, i) => <span key={i} className="phrase">{p}</span>)}</h1>
          <p className="hero-lead">{t("heroLead")}</p>
        </section>

        <div className={`stage stage--${mode}`} id="stage">
          <CallerSide state={state} onCall={call} onHangUp={hangUp} myLiveCall={myLiveCall} />
          <Door mode={mode} />
          <FamilySide inbox={inbox} myKeys={myKeys} onOpen={setOpenId} onLanded={onLanded} />
        </div>

        <HowItWorks />
        <Results calls={calls} />
        <GetApp />
      </main>
      <Footer />

      <CallBar state={state} onHangUp={hangUp} landed={landed}
        onSee={() => { if (landed) setOpenId(landed.id); setLanded(null); }} />
      {open && <CallDrawer call={open} onClose={close} />}
    </>
  );
}

/** Split a tagline at its clause boundary so Thai never wraps mid-phrase ("…ก่อน | ลูกหลาน…", "…first. | Family…"). */
function phrases(s: string): string[] {
  const i = s.indexOf(". ");
  if (i > 0) return [s.slice(0, i + 1) + " ", s.slice(i + 2)];
  const j = s.indexOf(" ");
  return j > 0 ? [s.slice(0, j) + " ", s.slice(j + 1)] : [s];
}

/** Phones only: keeps hang-up and the call status reachable while you scroll down to the inbox. */
function CallBar({ state, onHangUp, landed, onSee }: {
  state: ReturnType<typeof usePhoneCall>["state"]; onHangUp: () => void; landed: CallDoc | null; onSee: () => void;
}) {
  const { t } = useLang();
  const { text, clock } = useStatusLine(state);
  const active = ACTIVE.has(state.phase);
  if (!active && !landed) return null;
  return (
    <div className="callbar" role="region" aria-label={t("liveCaptions")}>
      {active ? (
        <>
          <p className="callbar-text"><span className="callbar-dot" aria-hidden="true" /><span className="callbar-label">{text}</span>{clock && <b>{clock}</b>}</p>
          <button className="callbar-btn callbar-btn--hang" onClick={onHangUp}><PhoneIcon down size={20} /> {t("hangUp")}</button>
        </>
      ) : (
        <>
          <p className="callbar-text">{t("yourCardArrived")}</p>
          <button className="callbar-btn" onClick={onSee}>{t("see")} <Icon name="arrowRight" size={16} /></button>
        </>
      )}
    </div>
  );
}
