// The one bold moment: the logo's door bar stands between the stranger and the family,
// and reacts to the call so the audience sees the AI in the middle.
import type { CallDoc } from "../lib/contract";
import { useLang, type StrKey } from "../lib/i18n";
import type { CallState } from "../lib/usePhoneCall";

export type DoorMode = "idle" | "knock" | "talk" | "send" | "done" | "open" | "shut";

/** Door state from the caller's phase plus the live call doc (for "summarizing" → "delivered"). */
export function doorMode(state: CallState, myCall: CallDoc | null): DoorMode {
  switch (state.phase) {
    case "dialing":
    case "connecting": return "knock";
    case "talking": return "talk";
    case "ringing":
    case "answered": return "open";
    case "blocked": return "shut";
    case "ended":
      if (myCall?.route !== "screened") return "idle"; // a hung-up ringing call sends nothing to the family
      if (myCall.analysis || (myCall.status !== "screening" && myCall.status !== "analyzing")) return "done";
      return "send";
    default: return "idle";
  }
}

const LABEL: Record<DoorMode, StrKey> = {
  idle: "door_idle", knock: "door_knock", talk: "door_talk", send: "door_send",
  done: "door_done", open: "door_open", shut: "door_shut",
};

export function Door({ mode }: { mode: DoorMode }) {
  const { t } = useLang();
  return (
    <div className={`door door--${mode}`} aria-hidden="true">
      <div className="door-way"><p className="door-label">{phrased(t("door_open"))}</p></div>
      <div className="door-leaf">
        <img className="door-mark" src="/brand/logo.svg" alt="" width="40" height="38" />
        <div className="door-signal">
          <span className="door-rings"><i /><i /><i /></span>
          <span className="door-bars"><i /><i /><i /><i /><i /></span>
        </div>
        <p className="door-label">{phrased(t(LABEL[mode]))}</p>
      </div>
      <span className="door-pulse" />
    </div>
  );
}

/** Door labels wrap only between phrases (Thai has no spaces inside a phrase, so the space is the break). */
function phrased(s: string) {
  return s.split(" ").map((w, i) => <span key={i} className="phrase">{w}</span>);
}
