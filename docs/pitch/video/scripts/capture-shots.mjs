// Captures real KnockFirst app screens from Expo web in mock mode.
// Run the app first: (apps/mobile) EXPO_PUBLIC_USE_MOCKS=true npx expo start --web --port 8099
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { EN, EN_BY_PAGE, EN_PATTERNS } from "./en.mjs";

const BASE = process.env.APP_URL ?? "http://localhost:8099";
const OUT = new URL("../public/shots/", import.meta.url).pathname;
const W = 393;
const H = 852 - 54; // the film draws a 54pt status bar above each screen

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

async function page(role, height = H) {
  const ctx = await browser.newContext({ viewport: { width: W, height }, deviceScaleFactor: 3, locale: "th-TH", timezoneId: "Asia/Bangkok" });
  await ctx.addInitScript((r) => {
    if (r) localStorage.setItem("knockfirst.role", r);
    else localStorage.removeItem("knockfirst.role");
  }, role);
  // Apple keynote time: Fri 16 Oct 2026, 09:41 Bangkok (timers keep running).
  await ctx.clock.setFixedTime(new Date("2026-10-16T09:41:00+07:00"));
  const p = await ctx.newPage();
  p.on("dialog", (d) => d.accept());
  return p;
}

// Hide mock-only test buttons and the dev-mode error toast: they don't exist in the release APK.
async function clean(p) {
  await p.evaluate(() => {
    const leaves = [...document.querySelectorAll("body *")].filter((el) => el.children.length === 0);
    for (const el of leaves) {
      const t = (el.textContent || "").trim();
      if (/cannot contain a nested/.test(t)) {
        // dev-mode toast: hide the small floating box around the text
        let n = el;
        while (n.parentElement && n.parentElement.getBoundingClientRect().height < 120) n = n.parentElement;
        n.style.visibility = "hidden";
      }
      if (/^(จำลองสายเข้า|จำลองคนรู้จักโทรมา)/.test(t)) {
        const btn = el.closest("[tabindex],[role=button],button");
        if (btn) btn.style.display = "none";
      }
    }
  });
}

const seen = new Set();
// The film is 100% English: translate every rendered Thai string in place (layout reflows naturally).
async function translate(p, name) {
  const dict = { ...EN, ...(name.startsWith("call-") ? EN_BY_PAGE.call : {}) };
  const patterns = EN_PATTERNS.map(([re, to]) => [re.source, to]);
  const left = await p.evaluate(({ dict, patterns }) => {
    const res = patterns.map(([src, to]) => [new RegExp(src), to]);
    const tr = (t) => {
      if (dict[t] != null) return dict[t];
      const trimmed = t.trim();
      if (dict[trimmed] != null) return t.replace(trimmed, dict[trimmed]);
      for (const [re, to] of res) if (re.test(trimmed)) return trimmed.replace(re, to);
      if (t.includes(" · ")) return t.split(" · ").map(tr).join(" · ");
      return t;
    };
    const thai = /[\u0E00-\u0E7F]/;
    const missing = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode;
      if (!thai.test(n.nodeValue)) continue;
      n.nodeValue = tr(n.nodeValue);
      if (thai.test(n.nodeValue)) missing.push(n.nodeValue);
    }
    for (const el of document.querySelectorAll("input,textarea")) {
      if (thai.test(el.value)) {
        el.value = tr(el.value);
        if (thai.test(el.value)) missing.push(el.value);
      }
    }
    return missing;
  }, { dict, patterns });
  if (left.length) console.warn("untranslated in", name, left);
}

async function shot(p, name) {
  await p.waitForTimeout(1600);
  await clean(p);
  await translate(p, name);
  await p.waitForTimeout(150);
  if (process.env.DUMP) {
    const texts = await p.evaluate(() => {
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const t = w.currentNode.nodeValue; if (/[\u0E00-\u0E7F]/.test(t)) out.push(t); }
      return out;
    });
    texts.forEach((t) => seen.add(t));
    writeFileSync(`${OUT}../../scripts/thai-strings.json`, JSON.stringify([...seen], null, 1));
  }
  await p.screenshot({ path: `${OUT}${name}.png` });
  console.log("shot", name);
}

// Element boxes (in points, screen coordinates below the status bar) so taps land on real buttons.
const layout = {};
async function measure(p, name, labels) {
  layout[name] ??= {};
  for (const [key, text] of Object.entries(labels)) {
    const b = await p.getByText(text, { exact: true }).first().boundingBox().catch(() => null);
    if (b) layout[name][key] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    else console.warn("not found", name, key);
  }
}

async function go(p, path) {
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
}

// 1. welcome (no role yet)
let p = await page(null);
await go(p, "/");
await shot(p, "welcome");
await measure(p, "welcome", { guardian: "Family (guardian)" });

// 2. guardian inbox + tabs
p = await page("guardian");
await go(p, "/");
await shot(p, "inbox");
await measure(p, "inbox", { live: "Answering now", review: "Needs your decision" });
await go(p, "/whitelist");
await shot(p, "whitelist");
await measure(p, "whitelist", { title: "Allowed", blocked: "Blocked numbers" });
await go(p, "/settings");
await shot(p, "settings");
await measure(p, "settings", { notify: "Alert me when a stranger calls" });
await go(p, "/blocked");
await shot(p, "blocked");

// 3. call details (normal viewport + tall for scrolling)
for (const id of ["mock_police", "mock_rider", "mock_clinic", "mock_screening"]) {
  await go(p, `/call/${id}`);
  await shot(p, `call-${id.replace("mock_", "")}`);
  await measure(p, `call-${id.replace("mock_", "")}`, { block: "Block & Report", accept: "Allow this number", summary: "AI summary" });
}
for (const id of ["mock_police", "mock_rider", "mock_clinic"]) {
  const t = await page("guardian", 2600);
  await go(t, `/call/${id}`);
  await shot(t, `call-${id.replace("mock_", "")}-tall`);
  await measure(t, `call-${id.replace("mock_", "")}-tall`, { summary: "AI summary", facts: "Caller info", flags: "Red flags", transcript: "Transcript" });
}

// 4. accept the rider → banner state
await go(p, "/call/mock_clinic");
await p.getByText("อนุญาตเบอร์นี้", { exact: true }).first().click();
await shot(p, "call-clinic-accepted");

await go(p, "/call/mock_police");
await p.getByText("บล็อกและรายงาน", { exact: true }).first().click();
await shot(p, "call-police-blocked");

// 5. live simulation in the inbox: screening → analyzing → result
p = await page("guardian");
await go(p, "/");
await p.getByText("จำลองสายเข้า", { exact: false }).first().click();
await shot(p, "inbox-sim-1");
await p.waitForTimeout(2500);
await shot(p, "inbox-sim-2");
await p.waitForTimeout(3000);
await shot(p, "inbox-sim-3");

// 6. grandma mode + ring
p = await page("grandma");
await go(p, "/");
await shot(p, "grandma");
p = await page("grandma");
await go(p, "/");
await p.getByText("จำลองคนรู้จักโทรมา", { exact: false }).first().click();
await p.waitForTimeout(2500);
await shot(p, "ring");

writeFileSync(`${OUT}layout.json`, JSON.stringify(layout, null, 2));
await browser.close();
