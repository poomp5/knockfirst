import { useEffect, useRef, useState } from "react";
import {
  formatCallerKey, RED_FLAG_LABEL_EN, RED_FLAG_LABEL_TH, RISK_LABEL_EN, RISK_LABEL_TH,
  STATUS_LABEL_EN, STATUS_LABEL_TH, type CallDoc, type RiskLevel,
} from "../lib/contract";
import { timeAgo, useLang } from "../lib/i18n";
import { callTime, type InboxState } from "../lib/useCalls";
import { Icon, type IconName } from "./Icon";

interface Props {
  inbox: InboxState;
  myKeys: readonly string[]; // caller keys this browser called as
  onOpen: (id: string) => void;
  onLanded: (call: CallDoc) => void; // the judge's own call just got its analysis
}

const FRESH_MS = 4500;
const isLive = (c: CallDoc) => c.status === "screening" || c.status === "analyzing";

/** Score + colour + label, always together (brand rule: risk is never colour alone). */
export function RiskTile({ level, score, big = false }: { level: RiskLevel; score: number; big?: boolean }) {
  const { lang, t } = useLang();
  return (
    <span className={`risk-tile risk-tile--${level}${big ? " risk-tile--big" : ""}`}>
      <span className="sr">{t("risk")} </span>
      <span className="risk-score">{score}</span>
      <span className="risk-label">{(lang === "en" ? RISK_LABEL_EN : RISK_LABEL_TH)[level]}</span>
    </span>
  );
}

export function FamilySide({ inbox, myKeys, onOpen, onLanded }: Props) {
  const { lang, t } = useLang();
  const listRef = useRef<HTMLOListElement>(null);
  const seen = useRef<Map<string, boolean> | null>(null); // id → had analysis
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [announce, setAnnounce] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const calls = inbox.kind === "live" || inbox.kind === "preview" ? inbox.calls : [];

  // A card is "fresh" when it first appears or when its analysis lands. Fresh cards glow,
  // get announced to screen readers, and the list scrolls to the judge's own one.
  useEffect(() => {
    if (inbox.kind !== "live") return;
    const prev = seen.current;
    seen.current = new Map(inbox.calls.map(c => [c.id, !!c.analysis]));
    if (!prev) return; // first snapshot: history, not news
    const arrived = inbox.calls.filter(c => !prev.has(c.id) || (!prev.get(c.id) && !!c.analysis));
    if (arrived.length === 0) return;

    const ids = arrived.map(c => c.id);
    setFresh(s => new Set([...s, ...ids]));
    timers.current.push(setTimeout(() => setFresh(s => new Set([...s].filter(id => !ids.includes(id)))), FRESH_MS));

    const first = arrived[0];
    const a = first.analysis;
    const who = a?.callerName ?? formatCallerKey(first.callerKey);
    const status = (lang === "en" ? STATUS_LABEL_EN : STATUS_LABEL_TH)[first.status];
    setAnnounce(`${t("newCall")}: ${who}. ${a ? `${t("risk")} ${a.riskScore} ${(lang === "en" ? RISK_LABEL_EN : RISK_LABEL_TH)[a.riskLevel]}. ` : ""}${status}`);

    const mine = arrived.find(c => myKeys.includes(c.callerKey));
    if (mine) {
      if (mine.analysis) onLanded(mine);
      const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(mine.id)}"]`);
      const list = listRef.current;
      if (el && list && list.scrollHeight > list.clientHeight) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        list.scrollTo({ top: el.offsetTop - list.offsetTop - 8, behavior: reduce ? "auto" : "smooth" });
      }
    }
    // lang/t only shape the announcement text; a language switch must not re-run this.
  }, [inbox, myKeys, onLanded]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Firestore already orders newest-first, so a live call is on top without pinning (a stuck doc must not stay above everything).
  const ordered = calls;
  const latestMine = calls.find(c => myKeys.includes(c.callerKey))?.id; // only the newest of your calls gets the outline

  return (
    <section className="side side--family" id="inbox" aria-labelledby="family-h">
      <header className="side-head">
        <h2 id="family-h" className="side-title">
          <span className="step" aria-hidden="true">2</span>{t("familySees")}
          {inbox.kind === "live" && <span className="live-badge"><i aria-hidden="true" />{t("live")}</span>}
        </h2>
        <p className="side-sub">{t("familyLead")}</p>
      </header>
      <p className="sr" role="status" aria-live="polite">{announce}</p>

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
        <ol className="inbox" ref={listRef}>
          {ordered.map(c => (
            <CallRow key={c.id} call={c} mine={myKeys.includes(c.callerKey)} latest={c.id === latestMine}
              fresh={fresh.has(c.id)} onOpen={onOpen} />
          ))}
        </ol>
      )}
    </section>
  );
}

const COMPACT_GLYPH: Partial<Record<CallDoc["status"], IconName>> = { rejected: "block", forwarded: "check", no_message: "more" };

function CallRow({ call, mine, latest, fresh, onOpen }: {
  call: CallDoc; mine: boolean; latest: boolean; fresh: boolean; onOpen: (id: string) => void;
}) {
  const { lang, t } = useLang();
  const en = lang === "en";
  const a = call.analysis;
  const live = isLive(call);
  const kind = live ? "live" : a ? "full" : "compact";
  const who = a?.callerName ?? formatCallerKey(call.callerKey);
  const reason = a ? (en ? a.reasonEn ?? a.reason : a.reason) : null;
  const flags = a?.redFlags ?? [];
  const status = (en ? STATUS_LABEL_EN : STATUS_LABEL_TH)[call.status];
  const owner = call.ownerResponse === "answered" ? t("ownerAnswered") : call.ownerResponse === "declined" ? t("ownerDeclined") : null;
  const alerted = call.incomingNotified && (mine || live
    ? <span className="tag tag--alerted"><Icon name="bell" size={14} /> {t("guardianAlerted")}</span>
    : <span className="tag tag--alerted tag--icon" title={t("guardianAlerted")}><Icon name="bell" size={14} /><span className="sr">{t("guardianAlerted")}</span></span>);

  return (
    <li className={`row row--${kind} row--${call.status}${mine ? " row--mine" : ""}${latest ? " row--latest-mine" : ""}${fresh ? " row--fresh" : ""}`} data-id={call.id}>
      <button className="row-btn" onClick={() => onOpen(call.id)}>
        {kind === "full" && a ? <RiskTile level={a.riskLevel} score={a.riskScore} />
          : kind === "live" ? <span className="row-tile row-tile--live" aria-hidden="true"><i /><i /><i /></span>
          : <span className="row-tile" aria-hidden="true"><Icon name={COMPACT_GLYPH[call.status] ?? "more"} size={22}
              strokeWidth={COMPACT_GLYPH[call.status] && call.status !== "no_message" ? 1.75 : 3} /></span>}

        <span className="row-main">
          <span className="row-top">
            <span className="row-who">{who}</span>
            <span className="row-time">{timeAgo(callTime(call), lang)}</span>
          </span>
          {kind === "live" && <span className="row-reason row-reason--live">{call.status === "screening" ? t("aiTalking") : status}</span>}
          {kind === "full" && reason && <span className="row-reason">{reason}</span>}
          {kind === "compact" && <span className="row-reason row-reason--compact">{status}{owner ? ` · ${owner}` : ""}</span>}

          {(kind !== "compact" || mine || alerted) && (
            <span className="row-tags">
              {kind === "full" && <span className={`pill pill--${call.status}`}>{status}{call.status === "needs_review" && <Icon name="arrowRight" size={13} />}</span>}
              {mine && <span className="tag tag--mine">{t("yourCall")}</span>}
              {flags.slice(0, 3).map(f => <span key={f} className="tag tag--flag">{(en ? RED_FLAG_LABEL_EN : RED_FLAG_LABEL_TH)[f]}</span>)}
              {flags.length > 3 && <span className="tag tag--flag">+{flags.length - 3}</span>}
              {alerted}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
