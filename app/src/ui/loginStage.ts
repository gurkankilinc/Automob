/**
 * Giriş ekranının marka sahnesi ve form etkileşimleri.
 *
 * Sahne DOM'u burada üretilir; tekerlek ve logo görselleri brandArt'tan gelir.
 * Tekerleğin dönüş hızı tek bir CSS değişkeniyle (--spin-dur) yönetilir ve
 * formda ne olduğuna göre değişir: boşta yavaş, fare sahnedeyken orta,
 * doğrulama sürerken hızlı, girişte kalkış.
 */

import { api } from "../api/client";
import { wheelSvg, wordmark } from "./brandArt";

/** Dönüş hızları (derece/saniye) — JS animasyon döngüsü kullanır */
const RPM_IDLE   = 65;   // 65°/s → ~5.5s/tur
const RPM_HOVER  = 150;  // 150°/s → ~2.4s/tur
const RPM_BUSY   = 800;  // 800°/s → ~0.45s/tur
const RPM_LAUNCH = 1285; // 1285°/s → ~0.28s/tur

const TAGLINES = [
  "3B araç görünümü üzerinden servis kaydı",
  "Her bakım kaydı, her detay; araç geçmişi tek yerde",
  "Bakım takvimi her zaman bir adım önde",
];

const FEATURES: Array<[string, string]> = [
  [
    "3B Servis Kaydı",
    `<path d="M3 8.5 12 3.5l9 5v7L12 20.5 3 15.5Z"/><path d="M3 8.5 12 13.5l9-5M12 13.5V20.5"/>`,
  ],
  [
    "Kaporta Analizi",
    `<path d="M4 14 5.8 9.2A2.4 2.4 0 0 1 8 7.6h8a2.4 2.4 0 0 1 2.2 1.6L20 14"/><path d="M3 14h18v3.4H3Z"/><circle cx="7.4" cy="17.4" r="1.6"/><circle cx="16.6" cy="17.4" r="1.6"/>`,
  ],
  ["Bakım Takvimi", `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>`],
];

function reduced(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function featureList(): string {
  return FEATURES.map(
    ([label, path], i) => `
    <li style="--i:${i}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>
      ${label}
    </li>`,
  ).join("");
}

function streaks(): string {
  const rows = [
    { t: 18, w: 120, d: 2.4, dl: 0 },
    { t: 34, w: 74, d: 3.1, dl: 0.7 },
    { t: 62, w: 150, d: 2.7, dl: 1.4 },
    { t: 78, w: 96, d: 3.4, dl: 0.35 },
    { t: 88, w: 60, d: 2.9, dl: 2 },
  ];
  return rows
    .map((r) => `<i style="--t:${r.t}%;--w:${r.w}px;--d:${r.d}s;--dl:${r.dl}s"></i>`)
    .join("");
}

// ---------- JS tabanlı dönüş motoru ----------
// CSS animation-duration değişince animasyon sıfırlanır ve atlama oluşur.
// Bunun yerine açıyı JS ile hesaplayıp doğrudan transform yazıyoruz;
// böylece hız değişse de süreklilik bozulmaz.

let stageEl: HTMLElement | null = null;
let busy = false;

/** Anlık hedef dönüş hızı (derece/saniye) */
let targetDps = RPM_IDLE;
/** Yumuşatılmış anlık hız */
let currentDps = RPM_IDLE;
/** Birikmiş açı (derece) */
let angle = 0;
/** Bir önceki frame zaman damgası */
let lastTs = 0;
/** Animasyon döngüsü aktif mi */
let rafId = 0;

function spinFrame(ts: number): void {
  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0;
  lastTs = ts;
  // Hızı yumuşat (exponential smoothing)
  const alpha = 1 - Math.exp(-dt * 5);
  currentDps += (targetDps - currentDps) * alpha;
  angle += currentDps * dt;
  // Tüm .w-spin ve .w-blur + .o-spin + .hero-road::after elementlerine uygula
  if (stageEl) {
    const spinEls = stageEl.querySelectorAll<SVGElement>(".w-spin");
    const blurEls = stageEl.querySelectorAll<SVGElement>(".w-blur");
    const oSpin   = stageEl.querySelectorAll<SVGElement>(".o-spin");
    for (const el of spinEls) el.style.transform = `rotate(${angle}deg)`;
    for (const el of blurEls) el.style.transform = `rotate(${angle * 0.55}deg)`;
    for (const el of oSpin)   el.style.transform = `rotate(${angle * 1.6}deg)`;
    // Yol şeridini de senkronize et: tekerlekle aynı oran
    const road = stageEl.querySelector<HTMLElement>(".hero-road");
    if (road) {
      // yol hareketini yüzdesel pozisyonla ifade et
      const roadPos = ((angle * 0.2) % 56);
      road.style.setProperty("--road-offset", `${-roadPos}px`);
    }
  }
  rafId = requestAnimationFrame(spinFrame);
}

function startSpinLoop(): void {
  if (rafId) return;
  lastTs = 0;
  rafId = requestAnimationFrame(spinFrame);
}

function stopSpinLoop(): void {
  cancelAnimationFrame(rafId);
  rafId = 0;
}

function setSpin(dps: number): void {
  targetDps = dps;
}

/** Doğrulama sürerken tekerlek hızlanır — beklemenin görsel karşılığı. */
export function setAuthBusy(on: boolean): void {
  busy = on;
  document.getElementById("login-submit")?.classList.toggle("busy", on);
  setSpin(on ? RPM_BUSY : RPM_IDLE);
}

/** Giriş başarılı: tekerlek kalkışa geçer, kabuk büyüyerek kaybolur. */
export function playLaunch(): Promise<void> {
  const screen = document.getElementById("login-screen");
  if (!screen || reduced()) return Promise.resolve();
  setSpin(RPM_LAUNCH);
  screen.classList.add("launching");
  return new Promise((resolve) => {
    window.setTimeout(() => {
      stopSpinLoop();
      screen.classList.remove("launching");
      resolve();
    }, 500);
  });
}

// ---------- Sahne ----------

function buildStage(stage: HTMLElement): void {
  stage.innerHTML = `
    <div class="stage-eyebrow"><span class="se-dot"></span>Servis Yönetim Sistemi</div>
    <div class="stage-core">
      <div class="hero-streaks" aria-hidden="true">${streaks()}</div>
      <div class="hero-wheel">${wheelSvg("lg")}</div>
      <div class="hero-road" aria-hidden="true"></div>
      <div class="hero-word" role="img" aria-label="Automob">${wordmark()}</div>
      <div class="hero-tagline"><span class="ht-text" id="hero-tagline"></span></div>
    </div>
    <ul class="stage-features">${featureList()}</ul>
  `;
}

function initTaglines(): void {
  const el = document.getElementById("hero-tagline");
  if (!el) return;
  el.textContent = TAGLINES[0];
  if (reduced()) return;

  let i = 0;
  window.setInterval(() => {
    i = (i + 1) % TAGLINES.length;
    el.textContent = TAGLINES[i];
    el.classList.remove("swap");
    void el.offsetWidth; // reflow — animasyonu yeniden tetikler
    el.classList.add("swap");
  }, 4200);
}

/** Fare sahnede gezinirken hafif eğim + tekerlek hızlanması. */
function initStageMotion(stage: HTMLElement): void {
  if (reduced()) return;
  const core = stage.querySelector<HTMLElement>(".stage-core");

  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!busy) setSpin(RPM_HOVER);
    if (!core) return;
    const r = stage.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    core.style.setProperty("--tx", `${(dx * 9).toFixed(2)}deg`);
    core.style.setProperty("--ty", `${(-dy * 7).toFixed(2)}deg`);
  });

  stage.addEventListener("pointerleave", () => {
    if (!busy) setSpin(RPM_IDLE);
    core?.style.setProperty("--tx", "0deg");
    core?.style.setProperty("--ty", "0deg");
  });
}

// ---------- Form etkileşimleri ----------

function initPasswordToggle(): void {
  const btn = document.getElementById("pw-toggle");
  const input = document.getElementById("login-password") as HTMLInputElement | null;
  if (!btn || !input) return;

  btn.addEventListener("click", () => {
    const shown = input.type === "text";
    input.type = shown ? "password" : "text";
    btn.setAttribute("aria-pressed", String(!shown));
    btn.setAttribute("aria-label", shown ? "Şifreyi göster" : "Şifreyi gizle");
    input.focus();
  });
}

/** Caps Lock açıkken uyarı — yanlış şifre denemelerinin en sık nedeni. */
function initCapsHint(): void {
  const hint = document.getElementById("caps-hint") as HTMLElement | null;
  const input = document.getElementById("login-password") as HTMLInputElement | null;
  if (!hint || !input) return;

  const update = (e: KeyboardEvent) => {
    hint.hidden = !e.getModifierState?.("CapsLock");
  };
  input.addEventListener("keydown", update);
  input.addEventListener("keyup", update);
  input.addEventListener("blur", () => {
    hint.hidden = true;
  });
}

/** Sunucuya ulaşılabiliyor mu — kullanıcı yazmaya başlamadan önce görsün. */
async function initServerBadge(): Promise<void> {
  const el = document.getElementById("auth-status");
  const txt = el?.querySelector(".as-txt");
  if (!el || !txt) return;

  const ok = await api.ping();
  el.classList.toggle("online", ok);
  el.classList.toggle("offline", !ok);
  txt.textContent = ok
    ? "Sunucu bağlantısı hazır"
    : "Sunucuya ulaşılamıyor — backend çalışmıyor olabilir";
}

/** Giriş ekranını kurar. Uygulama açılışında bir kez çağrılır. */
export function initLoginStage(): void {
  stageEl = document.getElementById("auth-stage");
  if (stageEl) {
    buildStage(stageEl);
    initTaglines();
    initStageMotion(stageEl);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startSpinLoop();
    }
  }

  initPasswordToggle();
  initCapsHint();
  void initServerBadge();

  document.getElementById("login-email")?.focus();
}
