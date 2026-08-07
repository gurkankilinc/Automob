/**
 * Uygulama kabuğu (header/footer) süslemeleri.
 *
 * Şu an tek işi sekmelerin altındaki kayan göstergeyi konumlandırmak: aktif
 * sekmenin genişliği ve konumu CSS değişkenlerine yazılır, geçişi CSS yapar.
 * Sekme metinleri farklı uzunlukta olduğu için bu ölçüm çalışma anında gerekir.
 */

let tabsEl: HTMLElement | null = null;

function place(): void {
  if (!tabsEl) return;
  const active = tabsEl.querySelector<HTMLElement>(".tab.active");
  if (!active || active.classList.contains("hidden")) {
    tabsEl.classList.remove("ink-ready");
    return;
  }
  tabsEl.style.setProperty("--ink-x", `${active.offsetLeft}px`);
  tabsEl.style.setProperty("--ink-w", `${active.offsetWidth}px`);
  tabsEl.classList.add("ink-ready");
}

/** Aktif sekme değiştiğinde çağrılır. */
export function syncTabIndicator(): void {
  // Sekme görünürlüğü aynı karede değişebiliyor — ölçümü yerleşim sonrasına bırak.
  requestAnimationFrame(place);
}

export function initChrome(): void {
  tabsEl = document.getElementById("tabs");
  if (!tabsEl) return;

  // Yazı tipleri yüklenince sekme genişlikleri değişir; ölçümü tazele.
  document.fonts?.ready.then(place).catch(() => { /* destek yoksa ilk ölçüm yeterli */ });
  window.addEventListener("resize", place);
  syncTabIndicator();
}
