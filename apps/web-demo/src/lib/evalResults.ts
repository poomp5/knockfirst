// Headline numbers from apps/server/src/ai/eval/results.md (LLM run, Thu 15 Oct). Copy them here after each `npm run eval`.
// Rules-only baseline (results-rules.md): 10/13 scams, 0/11 false alarms, auto-block 7/7.
export const EVAL = {
  engine: "Claude Haiku 5.5 with keyword rules, 24 Thai and English test calls, 4.1 s per call on average",
  scams: { caught: 12, total: 13 },
  legit: { falseAlarms: 0, total: 11 },
  autoBlock: { correct: 12, total: 12 },
};
