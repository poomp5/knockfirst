import { useCallback, useState } from "react";
import { CallDrawer } from "./components/CallDrawer";
import { CallerSide } from "./components/CallerSide";
import { FamilySide } from "./components/FamilySide";
import { Footer, GetApp, HowItWorks, Results } from "./components/Sections";
import { APK_URL } from "./lib/env";
import { useLang } from "./lib/i18n";
import { addMyKey, loadMyKeys } from "./lib/callerNumber";
import { usePhoneCall } from "./lib/usePhoneCall";
import { useCalls } from "./lib/useCalls";

export default function App() {
  const { lang, setLang, t } = useLang();
  const [myKeys, setMyKeys] = useState(loadMyKeys);
  const { state, start, hangUp } = usePhoneCall();
  const call = useCallback((number: string, name: string) => { setMyKeys(addMyKey(number)); void start(number, name); }, [start]);
  const inbox = useCalls();
  const calls = inbox.kind === "live" || inbox.kind === "preview" ? inbox.calls : [];
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? calls.find(c => c.id === openId) ?? null : null; // live doc, updates in place
  const close = useCallback(() => setOpenId(null), []);
  const myLiveCall = calls.find(c => c.id === state.callId && (c.status === "screening" || c.status === "analyzing")) ?? null;
  const ringing = state.phase === "connecting" || state.phase === "talking" || state.phase === "ringing";

  return (
    <>
      <header className="top">
        <img className="top-logo" src="/brand/logo-wordmark.png" alt="KnockFirst" height="36" />
        <nav className="top-nav">
          <div className="lang" role="group" aria-label="Language">
            <button aria-pressed={lang === "th"} onClick={() => setLang("th")}>ไทย</button>
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          </div>
          <a className="top-app" href="#app">{t("getApp")}</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>{t("tagline")}</h1>
          <div>
            <p className="hero-lead">{t("heroLead")}</p>
            <p className="hero-cta">
              <a className="btn btn--primary" href="#stage">{t("tryCall")}</a>
              <a className="btn btn--quiet" href={APK_URL}>{t("getApp")}</a>
            </p>
          </div>
        </section>

        <div className={`stage${ringing ? " stage--knocking" : ""}`} id="stage">
          <CallerSide state={state} onCall={call} onHangUp={hangUp} myLiveCall={myLiveCall} />
          <div className="door" aria-hidden="true"><span className="knock" /><span className="knock" /><span className="knock" /></div>
          <FamilySide inbox={inbox} myKeys={myKeys} onOpen={setOpenId} />
        </div>

        <HowItWorks />
        <Results calls={calls} />
        <GetApp />
      </main>
      <Footer />

      {open && <CallDrawer call={open} onClose={close} />}
    </>
  );
}
