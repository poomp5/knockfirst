// The agent's expressive voice model (eleven_v3) writes delivery tags like "[calm]" or "[polite]" into its text.
// They steer the voice; strip them before showing captions or transcripts.
export function stripVoiceTags(text: string): string {
  return text.replace(/\[[a-z][a-z -]{0,23}\]/gi, " ").replace(/\s{2,}/g, " ").trim();
}
