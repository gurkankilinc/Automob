/**
 * Marka görselleri — dönen tekerlek ve AUTOMOB logosu.
 *
 * Tekrar eden geometri (jant telleri, disk delikleri, bijonlar, harfler) burada
 * döngüyle üretilir; hem giriş ekranı sahnesi hem açılış ekranı aynı parçaları kullanır.
 * Dönüş hızı tek bir CSS değişkeniyle yönetilir: --spin-dur.
 */

/** Jant telleri — 5 adet, 72°'lik aralıklarla. */
function spokes(fillId: string): string {
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += `<path class="w-spoke" fill="url(#${fillId})" d="M109 36.7 A84 84 0 0 1 131 36.7 L126.5 96 Q120 101 113.5 96 Z" transform="rotate(${i * 72} 120 120)"/>`;
  }
  return out;
}

/** Fren diskindeki havalandırma delikleri — 10 adet, 50 birim yarıçapta. */
function rotorHoles(): string {
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += `<circle class="w-hole" cx="120" cy="70" r="3.2" transform="rotate(${i * 36} 120 120)"/>`;
  }
  return out;
}

/** Göbek bijonları — 5 adet. */
function lugs(): string {
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += `<circle class="w-lug" cx="120" cy="106" r="3.4" transform="rotate(${i * 72} 120 120)"/>`;
  }
  return out;
}

/**
 * Büyük tekerlek. Katman sırası gerçek bir tekerlekteki gibi:
 * lastik → jant kovanı → fren diski (döner), kaliper (gövdeye bağlı, dönmez),
 * teller → göbek (döner). Kaliper tellerin arkasından görünüp kaybolur.
 *
 * @param idPrefix Aynı sayfada birden çok tekerlek olduğunda gradient id'leri çakışmasın diye.
 */
export function wheelSvg(idPrefix = "w"): string {
  const rim = `${idPrefix}RimG`;
  const spoke = `${idPrefix}SpokeG`;
  const hub = `${idPrefix}HubG`;
  const halo = `${idPrefix}HaloG`;

  return `
<svg class="wheel-svg" viewBox="0 0 240 240" aria-hidden="true">
  <defs>
    <linearGradient id="${rim}" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#fff2c6"/>
      <stop offset="0.42" stop-color="#f5c93e"/>
      <stop offset="1" stop-color="#8a5c07"/>
    </linearGradient>
    <linearGradient id="${spoke}" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#39414f"/>
      <stop offset="0.5" stop-color="#8d97a7"/>
      <stop offset="1" stop-color="#252b35"/>
    </linearGradient>
    <radialGradient id="${hub}">
      <stop offset="0" stop-color="#6c7686"/>
      <stop offset="1" stop-color="#1b202a"/>
    </radialGradient>
    <radialGradient id="${halo}">
      <stop offset="0.5" stop-color="rgba(245,201,62,0.22)"/>
      <stop offset="1" stop-color="rgba(245,201,62,0)"/>
    </radialGradient>
  </defs>

  <circle cx="120" cy="120" r="118" fill="url(#${halo})"/>

  <!-- hız izleri: tekerlekten hızlı döner, hareket hissini taşır -->
  <g class="w-blur">
    <circle class="w-arc" cx="120" cy="120" r="124" stroke-dasharray="46 132" opacity="0.55"/>
    <circle class="w-arc" cx="120" cy="120" r="131" stroke-dasharray="24 168" stroke-dashoffset="60" opacity="0.35"/>
  </g>

  <g class="w-spin">
    <circle class="w-tire" cx="120" cy="120" r="104"/>
    <circle class="w-tread" cx="120" cy="120" r="104"/>
    <circle class="w-edge" cx="120" cy="120" r="116.5"/>
    <circle class="w-sidewall" cx="120" cy="120" r="91.5"/>
    <circle class="w-barrel" cx="120" cy="120" r="86"/>
    <circle class="w-rim" cx="120" cy="120" r="88" stroke="url(#${rim})"/>
    <circle class="w-rotor" cx="120" cy="120" r="62"/>
    <circle class="w-groove" cx="120" cy="120" r="56"/>
    <circle class="w-groove" cx="120" cy="120" r="44"/>
    ${rotorHoles()}
  </g>

  <path class="w-caliper" d="M67 148.2 A60 60 0 0 1 75.4 79.9"/>
  <path class="w-caliper-hi" d="M70.6 143.4 A54 54 0 0 1 77.6 84.6"/>
  <circle class="w-heat" cx="120" cy="120" r="62"/>

  <g class="w-spin">
    ${spokes(spoke)}
    <circle class="w-hub" cx="120" cy="120" r="22" fill="url(#${hub})"/>
    ${lugs()}
    <circle class="w-cap" cx="120" cy="120" r="5.5"/>
  </g>
</svg>`;
}

/** Logodaki "O" — dönen tellerle küçük bir jant. */
function letterWheelSvg(): string {
  let sp = "";
  for (let i = 0; i < 5; i++) {
    sp += `<line x1="24" y1="15" x2="24" y2="6" transform="rotate(${i * 72} 24 24)"/>`;
  }
  return `
<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round">
  <circle cx="24" cy="24" r="21" stroke-width="3.5"/>
  <g class="o-spin" stroke-width="2.6">${sp}</g>
  <circle cx="24" cy="24" r="8" stroke-width="3"/>
</svg>`;
}

/** AUTOMOB — harf harf gelir; ikinci "O" dönen bir jant olur. */
export function wordmark(): string {
  return [..."AUTOMOB"]
    .map((ch, i) =>
      i === 5
        ? `<span class="hw-o" style="--i:${i}">${letterWheelSvg()}</span>`
        : `<span class="hw-l" style="--i:${i}">${ch}</span>`,
    )
    .join("");
}
