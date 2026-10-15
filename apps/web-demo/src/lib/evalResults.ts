// Headline numbers from apps/server/src/ai/eval/results*.md. Copy them here after each `npm run eval`.
// TODO(Sky): replace with the LLM run (results.md) once LLM_API_KEY is available; currently the rules-only baseline.
export const EVAL = {
  engine: "rules only (LLM run pending)",
  scams: { caught: 10, total: 13 },
  legit: { falseAlarms: 0, total: 11 },
  autoBlock: { correct: 7, total: 7 },
};
