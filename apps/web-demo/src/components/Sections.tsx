import { QRCodeSVG } from "qrcode.react";
import type { CallDoc } from "../lib/contract";
import { APK_URL, REPO_URL } from "../lib/env";
import { EVAL } from "../lib/evalResults";
import { useLang } from "../lib/i18n";

export function HowItWorks() {
  const { t } = useLang();
  return (
    <section className="block how" id="how" aria-labelledby="how-h">
      <h2 id="how-h">{t("howTitle")}</h2>
      {/* Same three lanes as the stage: stranger | the AI door | family */}
      <ol className="lanes">
        <li className="lane lane--caller">
          <p className="lane-step"><span className="step" aria-hidden="true">1</span><strong>{t("how1")}</strong><span>{t("how1b")}</span></p>
          <p className="lane-branch"><strong>{t("how2")}</strong><span>{t("how2b")}</span></p>
        </li>
        <li className="lane lane--door">
          <p className="lane-step"><span className="step" aria-hidden="true">2</span><strong>{t("how3")}</strong><span>{t("how3b")}</span></p>
          <p className="lane-step"><span className="step" aria-hidden="true">3</span><strong>{t("how4")}</strong><span>{t("how4b")}</span></p>
        </li>
        <li className="lane lane--family">
          <p className="lane-step"><span className="step" aria-hidden="true">4</span><strong>{t("how5")}</strong><span>{t("how5b")}</span></p>
        </li>
      </ol>
      <p className="built">
        <span>{t("builtWith")}</span>
        <strong>ElevenLabs Agents</strong><span>WebRTC</span><span>Claude</span><span>Firebase</span><span>Expo / React Native</span>
      </p>
    </section>
  );
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "–");

export function Results({ calls }: { calls: CallDoc[] }) {
  const { t } = useLang();
  const screened = calls.filter(c => c.route === "screened").length;
  const autoBlocked = calls.filter(c => c.status === "auto_blocked").length;
  const accepted = calls.filter(c => c.status === "accepted").length;
  return (
    <section className="block results" aria-labelledby="results-h">
      <h2 id="results-h">{t("resultsTitle")}</h2>
      <p className="block-sub">{t("resultsSub")}</p>
      <dl className="metrics">
        <div><dt>{t("detect")}</dt><dd>{pct(EVAL.scams.caught, EVAL.scams.total)}</dd><small>{EVAL.scams.caught}/{EVAL.scams.total}</small></div>
        <div><dt>{t("falseAlarm")}</dt><dd>{pct(EVAL.legit.falseAlarms, EVAL.legit.total)}</dd><small>{EVAL.legit.falseAlarms}/{EVAL.legit.total}</small></div>
        <div><dt>{t("precision")}</dt><dd>{pct(EVAL.autoBlock.correct, EVAL.autoBlock.total)}</dd><small>{EVAL.autoBlock.correct}/{EVAL.autoBlock.total}</small></div>
      </dl>
      <p className="engine">{EVAL.engine}</p>
      <h3>{t("liveTitle")}</h3>
      <dl className="counters">
        <div><dt>{t("screened")}</dt><dd>{screened}</dd></div>
        <div><dt>{t("autoBlocked")}</dt><dd>{autoBlocked}</dd></div>
        <div><dt>{t("accepted")}</dt><dd>{accepted}</dd></div>
      </dl>
    </section>
  );
}

export function GetApp() {
  const { t } = useLang();
  return (
    <section className="block app" id="app" aria-labelledby="app-h">
      <div>
        <h2 id="app-h">{t("appTitle")}</h2>
        <p className="block-sub">{t("appSub")}</p>
        <ol className="steps">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
        <a className="btn btn--primary" href={APK_URL}>{t("download")}</a>
      </div>
      <figure className="qr">
        <QRCodeSVG value={APK_URL} size={168} marginSize={2} fgColor="#1D1D1F" />
        <figcaption>{t("scanQr")}</figcaption>
      </figure>
    </section>
  );
}

// Bios from each member's own site (Oct 2026).
const TEAM = [
  {
    name: "Tete", full: "Nattasit Manapiyawong", url: "https://github.com/teterw", site: "github.com/teterw",
    role: { th: "Backend และระบบโทรศัพท์", en: "Backend & telephony" },
    bio: {
      th: "สายสร้างของที่มีงานอดิเรกเพียบ และพิมพ์เร็วตัวจริง ผลงานเช่น catsole จอ OLED ข้างโต๊ะจาก Arduino ที่โชว์เนื้อเพลงหรือสถานะเครื่อง สลับด้วยการแตะ NFC",
      en: "Hobbyist builder and speed typist. Built catsole, an Arduino desk display that shows synced lyrics or live PC stats and switches with an NFC tap.",
    },
  },
  {
    name: "Poom", full: "Poonyapat Goonmanoon", url: "https://poomp5.com/", site: "poomp5.com",
    role: { th: "แอปมือถือและดีไซน์", en: "Mobile app & design" },
    bio: {
      th: "CEO ของ Pranakorn Group นักพัฒนาฟรอนต์เอนด์และดีไซเนอร์ที่เรียนเอง รางวัลชนะเลิศ Intania Innovation Contest 2026, Platinum Coding Thailand 2026 และเหรียญทอง I-New Gen Award 2025",
      en: "CEO of Pranakorn Group, self-taught front-end developer and designer. Grand Prize at Intania Innovation Contest 2026, Platinum at Coding Thailand 2026, Gold at I-New Gen Award 2025.",
    },
  },
  {
    name: "Sky", full: "Nonthanaphong Saechua", url: "https://zarutech.dev/", site: "zarutech.dev",
    role: { th: "AI ความปลอดภัย และเว็บ", en: "AI, safety & web" },
    bio: {
      th: "สาย Cyber Security และ CTF เหรียญทอง Thailand New Gen Inventors Award 2026 (PDLite), อันดับ 3 ระดับประเทศ CODEKIT 2026 และ ACT Brand Ambassador 2025",
      en: "Cyber security and CTF player. Gold medal at Thailand New Gen Inventors Award 2026 (PDLite), 3rd nationally at CODEKIT 2026, ACT Brand Ambassador 2025.",
    },
  },
  {
    name: "PM", full: "Phassaree Prasai", url: "https://mmm432.vercel.app/", site: "mmm432.vercel.app",
    role: { th: "พิตช์และงานวิจัย", en: "Pitch & research" },
    bio: {
      th: "ดูแลเรื่องเล่าและงานวิจัยผู้ใช้ของ KnockFirst เคยร่วมทำ CareMotion, Doodee Future, Doodee Move และ PicoPair",
      en: "Owns KnockFirst's story and user research. Has worked on CareMotion, Doodee Future, Doodee Move and PicoPair.",
    },
  },
];

export function Footer() {
  const { t, lang } = useLang();
  return (
    <footer className="foot">
      <img src="/brand/logo-wordmark.png" alt="KnockFirst" height="32" />
      <p className="foot-tag">{t("tagline")}</p>
      <h2 className="foot-h">{t("team")}</h2>
      <ul className="team">
        {TEAM.map(m => (
          <li key={m.name}>
            <span className="team-name">{m.name}</span>
            <small className="team-full">{m.full}</small>
            <small className="team-role">{m.role[lang]}</small>
            <p className="team-bio">{m.bio[lang]}</p>
            <a className="team-site" href={m.url} target="_blank" rel="noreferrer">{m.site}</a>
          </li>
        ))}
      </ul>
      <a className="foot-repo" href={REPO_URL}>{t("source")}</a>
      <p className="foot-small">U-Hackathon 2026 · AI track</p>
    </footer>
  );
}
