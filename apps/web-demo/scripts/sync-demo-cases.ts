// Copies the 5 stage-demo transcripts from the eval set (apps/server/src/ai/eval/cases.ts) into the web demo,
// so the admin page loads exactly what `npm run simulate -- --demo` sends. Run: bun run sync-demo
import { writeFileSync } from "fs";
import { CASES, DEMO_IDS } from "../../server/src/ai/eval/cases";

const demo = DEMO_IDS.map(id => CASES.find(c => c.id === id)!).map(({ id, title, from, transcript }) => ({ id, title, from, transcript }));
writeFileSync(new URL("../src/lib/demoCases.json", import.meta.url), JSON.stringify(demo, null, 1) + "\n");
console.log(`wrote ${demo.length} demo cases: ${demo.map(c => c.id).join(", ")}`);
