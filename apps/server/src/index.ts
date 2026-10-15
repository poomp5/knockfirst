import { env } from "./env";
import { createApp } from "./app";

createApp().listen(env.PORT, () => console.log(`KnockFirst server on :${env.PORT}`));
