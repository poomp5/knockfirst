import { useEffect, useRef } from "react";
import {
  formatCallerKey, RED_FLAG_LABEL_EN, RED_FLAG_LABEL_TH, RISK_COLOR, RISK_LABEL_EN, RISK_LABEL_TH,
  STATUS_LABEL_EN, STATUS_LABEL_TH, type CallDoc,
} from "../lib/contract";
import { timeAgo, useLang } from "../lib/i18n";
import { callTime, type InboxState } from "../lib/useCalls";

interface Props {
  inbox: InboxState;
  myKey: string;
  onOpen: (id: string) => void;
}

export function FamilySide({ inbox, myKey, onOpen }: Props) {
  const { t } = useLang();
  const listRef = useRef<HTMLOListElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const calls = inbox.kind === "live" || inbox.kind === "preview" ? inbox.calls : [];

  // Scroll the list (not the page) to the judge's own call when a new one arrives.
  useEffect(() => {
    if (inbox.kind !== "live") return;
    const ids = new Set(inbox.calls.map(c => c.id));
    if (seen.current) {
      const fresh = inbox.calls.find(c => c.callerKey === myKey && !seen.current!.has(c.id));
      const el = fresh && listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(fresh.id)}"]`);
      if (el && listRef.current) listRef.current.scrollTo({ top: el.offsetTop - listRef.current.offsetTop - 8, behavior: "smooth" });
    }
    seen.current = ids;
  }, [inbox, myKey]);

  return (
    <section className="side side--family" id="inbox" aria-labelledby="family-h">
      <h2 id="family-h" className="side-title">{t("familySide")}</h2>
      <p className="side-sub">{t("familySideSub")}</p>

      {inbox.kind === "preview" && <p className="note note--preview">{t("previewNote")}</p>}
      {inbox.kind === "loading" && <p className="inbox-msg">{t("inboxLoading")}</p>}
      {inbox.kind === "error" && (
        <div className="note note--error" role="alert">
          <p>{t("inboxError")} ({inbox.message})</p>
          <p className="note-hint">{t("inboxErrorHint")}</p>
        </div>
      )}
      {(inbox.kind === "live" || inbox.kind === "preview") && calls.length === 0 && (
        <div className="inbox-empty">
          <img src="/brand/empty-inbox.svg" alt="" width="120" height="120" />
          <p>{t("inboxEmpty")}</p>
        </div>
      )}
      {calls.length > 0 && (
        <ol className="inbox" ref={listRef} aria-live="polite">
          {calls.map(c => <CallRow key={c.id} call={c} mine={c.callerKey === myKey} onOpen={onOpen} />)}
        </ol>
      )}
    </section>
  );
}

function CallRow({ call, mine, onOpen }: { call: CallDoc; mine: boolean; onOpen: (id: string) => void }) {
  const { lang, t } = useLang();
  const a = call.analysis;
  const level = a?.riskLevel;
  const live = call.status === "screening" || call.status === "analyzing";
  const who = a?.callerName ?? formatCallerKey(call.callerKey);
  const reason = a ? (lang === "en" ? a.reasonEn ?? a.reason : a.reason) : null;
  const flags = a?.redFlags ?? [];

  return (
    <li className={`row${mine ? " row--mine" : ""}`} data-id={call.id}>
      <button className="row-btn" onClick={() => onOpen(call.id)} style={{ ["--risk" as string]: level ? RISK_COLOR[level] : "var(--line)" }}>
        <span className="row-score" aria-label={level ? `${t("risk")} ${a!.riskScore}` : undefined}>
          {live ? <span className="pulse" aria-hidden="true" /> : a ? a.riskScore : "–"}
        </span>
        <span className="row-main">
          <span className="row-top">
            <span className="row-who">{who}</span>
            <span className="row-time">{timeAgo(callTime(call), lang)}</span>
          </span>
          {live ? (
            <span className="row-reason row-reason--live">{call.status === "screening" ? t("aiTalking") : (lang === "en" ? STATUS_LABEL_EN : STATUS_LABEL_TH)[call.status]}</span>
          ) : reason && <span className="row-reason">{reason}</span>}
          <span className="row-tags">
            {mine && <span className="tag tag--mine">{t("yourCall")}</span>}
            {!live && <span className={`tag tag--status tag--${call.status}`}>{(lang === "en" ? STATUS_LABEL_EN : STATUS_LABEL_TH)[call.status]}</span>}
            {level && call.status !== "auto_blocked" && <span className="tag tag--risk">{(lang === "en" ? RISK_LABEL_EN : RISK_LABEL_TH)[level]}</span>}
            {flags.slice(0, 3).map(f => <span key={f} className="tag tag--flag">{(lang === "en" ? RED_FLAG_LABEL_EN : RED_FLAG_LABEL_TH)[f]}</span>)}
            {flags.length > 3 && <span className="tag tag--flag">+{flags.length - 3}</span>}
            {call.incomingNotified && (mine || live
              ? <span className="tag tag--alerted">📲 {t("guardianAlerted")}</span>
              : <span className="tag tag--alerted" title={t("guardianAlerted")}><span aria-hidden="true">📲</span><span className="sr">{t("guardianAlerted")}</span></span>)}
          </span>
        </span>
      </button>
    </li>
  );
}
