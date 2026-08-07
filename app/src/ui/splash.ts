/**
 * Açılış ekranı — giriş ile panelin arasındaki kısa marka anı.
 *
 * Asıl işi de yapar: 3B sahnenin kurulması ve ilk veri çekimi bunun arkasında
 * gerçekleşir, böylece o sırada oluşan boş/yarım ekran kullanıcıya görünmez.
 * En az MIN_MS kadar durur (yanıp sönmesin), iş daha uzun sürerse iş bitene kadar bekler.
 */

import { wheelSvg, wordmark } from "./brandArt";

const MIN_MS = 700;
const STEPS = ["Sahne hazırlanıyor", "Araç dosyası alınıyor", "Panel açılıyor"];

function reduced(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function build(el: HTMLElement): void {
  el.innerHTML = `
    <div class="sp-inner">
      <div class="sp-wheel">${wheelSvg("sp")}</div>
      <div class="hero-word sp-word" role="img" aria-label="Automob">${wordmark()}</div>
      <div class="sp-bar"><i></i></div>
      <div class="sp-status" id="sp-status">${STEPS[0]}…</div>
    </div>`;
}

/**
 * Açılışı gösterir, `work` çalışırken bekletir, sonra kapatır.
 * `work` hata verirse de açılış kapanır — hatayı çağıran taraf ele alır.
 */
export async function runSplash(work: () => Promise<void>): Promise<void> {
  const el = document.getElementById("splash");
  if (!el || reduced()) {
    await work();
    return;
  }

  build(el);
  el.hidden = false;
  const started = performance.now();

  // Durum satırı ilerledikçe değişir — bekleme boş görünmesin
  let step = 0;
  const status = el.querySelector<HTMLElement>("#sp-status");
  const ticker = window.setInterval(() => {
    step = Math.min(step + 1, STEPS.length - 1);
    if (status) status.textContent = `${STEPS[step]}…`;
  }, 420);

  try {
    await work();
  } finally {
    window.clearInterval(ticker);
    const wait = Math.max(0, MIN_MS - (performance.now() - started));
    await new Promise((r) => window.setTimeout(r, wait));

    el.classList.add("out");
    await new Promise((r) => window.setTimeout(r, 380));
    el.hidden = true;
    el.classList.remove("out");
    el.innerHTML = "";
  }
}
