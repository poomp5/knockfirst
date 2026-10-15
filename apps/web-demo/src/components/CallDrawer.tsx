import { useEffect, useRef, useState } from "react";
import {
  formatCallerKey, RED_FLAG_LABEL_EN, RED_FLAG_LABEL_TH, RISK_COLOR, RISK_LABEL_EN, RISK_LABEL_TH,
  STATUS_LABEL_EN, STATUS_LABEL_TH, type CallDoc,
} from "../lib/contract";
import { acceptCall, blockCall } from "../lib/actions";
import { PREVIEW_MODE } from "../lib/env";
import { timeAgo, useLang } from "../lib/i18n";
import { callTime } from "../lib/useCalls";

const DECIDABLE = new Set(["needs_review", "auto_blocked", "no_message", "accepted", "blocked"]);

export function CallDrawer({ call, onClose }: { call: CallDoc; onClose: () => void }) {
  const { lang, t } = useLang();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<"accept" | "block" | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("no-scroll"); };
  }, [onClose]);

  const a = call.analysis;
  const en = lang === "en";
  const level = a?.riskLevel;
  const live = call.status === "screening" || call.status === "analyzing";
  const decided = call.decision ?? (call.status === "accepted" || call.status === "blocked" ? call.status : null);

  async function decide(kind: "accept" | "block") {
    setBusy(kind); setFailed(false);
    try { await (kind === "accept" ? acceptCall(call) : blockCall(call)); }
    catch (e) { console.warn("[decide]", e); setFailed(true); }
    finally { setBusy(null); }
  }

  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-h" onClick={e => e.stopPropagation()}
        style={{ ["--risk" as string]: level ? RISK_COLOR[level] : "var(--line)" }}>
        <header className="drawer-head">
          <div>
            <h2 id="drawer-h">{a?.callerName ?? formatCallerKey(call.callerKey)}</h2>
            <p className="drawer-meta">
              {formatCallerKey(call.callerKey)}{a?.organization ? `, ${a.organization}` : ""} · {timeAgo(callTime(call), lang)}
            </p>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label={t("close")}>✕</button>
        </header>

        <div className="drawer-body">
          <div className="verdict">
            {a ? (
              <>
                <span className="verdict-score">{a.riskScore}</span>
                <span className="verdict-text">
                  <strong>{(en ? RISK_LABEL_EN : RISK_LABEL_TH)[a.riskLevel]}</strong>
                  <span>{(en ? STATUS_LABEL_EN : STATUS_LABEL_TH)[call.status]}</span>
                </span>
              </>
            ) : (
              <span className="verdict-text"><strong>{(en ? STATUS_LABEL_EN : STATUS_LABEL_TH)[call.status]}</strong>
                {live && <span>{t("aiTalking")}</span>}</span>
            )}
          </div>

          {call.incomingNotified && <p className="tag tag--alerted tag--block">📲 {t("guardianAlerted")}</p>}

          {a && (
            <section>
              <h3>{t("summary")}</h3>
              <p className="summary">{en ? a.summaryEn ?? a.summary : a.summary}</p>
              {a.redFlags.length > 0 && (
                <ul className="flag-list">
                  {a.redFlags.map(f => <li key={f} className="tag tag--flag">{(en ? RED_FLAG_LABEL_EN : RED_FLAG_LABEL_TH)[f]}</li>)}
                </ul>
              )}
              {(a.callbackNumber || call.durationSec) && (
                <dl className="facts">
                  {a.callbackNumber && <><dt>{t("callback")}</dt><dd>{formatCallerKey(a.callbackNumber)}</dd></>}
                  {call.durationSec ? <><dt>{t("duration")}</dt><dd>{call.durationSec} {t("sec")}</dd></> : null}
                </dl>
              )}
            </section>
          )}

          {a && a.evidence.length > 0 && (
            <section>
              <h3>{t("evidence")}</h3>
              <ul className="evidence">
                {a.evidence.map((e, i) => (
                  <li key={i}>
                    <span className="tag tag--flag">{(en ? RED_FLAG_LABEL_EN : RED_FLAG_LABEL_TH)[e.flag]}</span>
                    <blockquote lang="th">{e.quote}</blockquote>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {call.transcript && call.transcript.length > 0 && (
            <section>
              <h3>{t("transcript")}</h3>
              <ol className="bubbles">
                {call.transcript.map((turn, i) => (
                  <li key={i} className={`bubble bubble--${turn.role}`}>
                    <span className="bubble-who">{turn.role === "caller" ? t("caller") : t("assistant")}</span>
                    {turn.text}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <footer className="drawer-foot">
          {decided === "accepted" && <p className="note note--next" role="status">{t("acceptedNext")}</p>}
          {decided === "blocked" && <p className="note note--done" role="status">{t("blockedDone")}</p>}
          {failed && <p className="note note--error" role="alert">{t("decisionFailed")}</p>}
          {live ? (
            <p className="drawer-wait">{t("decideWhenDone")}</p>
          ) : DECIDABLE.has(call.status) && !PREVIEW_MODE ? (
            <div className="decide">
              <div className="decide-opt">
                <button className="btn btn--accept" disabled={!!busy || decided === "accepted"} onClick={() => decide("accept")}>
                  {busy === "accept" ? "…" : t("accept")}</button>
                <small>{t("acceptHint")}</small>
              </div>
              <div className="decide-opt">
                <button className="btn btn--block" disabled={!!busy || decided === "blocked"} onClick={() => decide("block")}>
                  {busy === "block" ? "…" : t("block")}</button>
                <small>{t("blockHint")}</small>
              </div>
            </div>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
