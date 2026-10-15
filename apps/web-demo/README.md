# KnockFirst web demo

The page judges open first: call grandma from the browser, watch the family's inbox update live, accept or block.

```bash
cd apps/web-demo
cp .env.example .env   # fill in the Firebase web config + VITE_SERVER_URL (public values only)
bun install
bun run dev            # http://localhost:5173
bun run build          # → dist/
```

Without Firebase config the page runs in preview mode with clearly labelled sample cards.
Deploy on Vercel with root directory `apps/web-demo` (Vite preset) and the same `VITE_*` variables.
Never put `DEMO_ADMIN_TOKEN` or any API key in `VITE_*`: everything here ships to the browser.
