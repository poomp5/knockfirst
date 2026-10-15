import { CallAnalysis, CallStatus } from "../contract";
import { env } from "../env";

export function decideStatus(a: CallAnalysis): Extract<CallStatus, "auto_blocked" | "needs_review"> {
  return a.riskScore >= env.AUTO_BLOCK_SCORE ? "auto_blocked" : "needs_review";
}
