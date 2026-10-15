// npm run reset [familyId]: same as POST /demo/reset, run locally.
import { env } from "../src/env";
import { resetFamily } from "../src/services/reset";

const familyId = process.argv[2] || env.DEFAULT_FAMILY_ID;
resetFamily(familyId).then(
  r => { console.log(`reset ${familyId}`, r); process.exit(0); },
  e => { console.error(e); process.exit(1); },
);
