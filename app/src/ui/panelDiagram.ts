import { BODY_PANELS, PANEL_STATE_ORDER, PANEL_STATE_LABEL, type PanelId, type PanelState } from "../data/bodyPanels";
import { store } from "../state/store";

/**
 * Klasik "ekspertiz" üstten görünüm kaporta/boya durumu paneli — KONSEPT.md'deki
 * "Kaporta panelleri" bölge kategorisinin somutlaştırılmış hâli. Motor/fren/amortisör
 * gibi mekanik bakım bölgelerinden bağımsız bir alan: gövde/boya durumu.
 *
 * Renk dili bilinçli olarak referans ekspertiz sitelerindeki mavi/kırmızıyı KOPYALAMAZ —
 * "sarı yalnızca aracın dilidir" ilkesine uyarak amber/sarı ailesindeki 4 tonu kullanır
 * (nötr gri → açık amber → koyu amber → fault turuncusu), böylece 3D sahne ve bölge
 * hatırlatmalarıyla aynı görsel sözlüğü konuşur.
 */

const STATE_VAR: Record<PanelState, string> = {
  "orijinal": "var(--panel-orijinal)",
  "lokal-boyali": "var(--panel-lokal)",
  "boyali": "var(--panel-boyali)",
  "degisen": "var(--panel-degisen)",
};

// Üstten görünüm geometrisi: viewBox 0 0 240 440, burun yukarıda.
const PANEL_SHAPES: Record<PanelId, string> = {
  "on-tampon": "M 66 20 Q 60 20 58 26 L 182 26 Q 180 20 174 20 Z M 58 26 L 182 26 L 180 45 L 60 45 Z",
  "kaput": "M 70 45 L 170 45 L 168 128 L 72 128 Z",
  "sol-on-camurluk": "M 32 45 Q 30 45 30 62 L 30 128 L 70 128 L 70 45 Z",
  "sag-on-camurluk": "M 208 45 Q 210 45 210 62 L 210 128 L 170 128 L 170 45 Z",
  "sol-on-kapi": "M 30 130 L 70 130 L 70 228 L 30 228 Z",
  "sag-on-kapi": "M 210 130 L 170 130 L 170 228 L 210 228 Z",
  "tavan": "M 72 130 L 168 130 L 168 328 L 72 328 Z",
  "sol-arka-kapi": "M 30 230 L 70 230 L 70 328 L 30 328 Z",
  "sag-arka-kapi": "M 210 230 L 170 230 L 170 328 L 210 328 Z",
  "sol-arka-camurluk": "M 30 330 L 70 330 L 70 396 Q 30 396 30 380 Z",
  "sag-arka-camurluk": "M 210 330 L 170 330 L 170 396 Q 210 396 210 380 Z",
  "bagaj": "M 72 330 L 168 330 L 168 396 L 72 396 Z",
  "arka-tampon": "M 60 398 L 180 398 Q 180 415 174 418 L 66 418 Q 60 415 60 398 Z",
};

let svgRoot: SVGSVGElement | null = null;
let listRoot: HTMLElement | null = null;
let interactive = true;

function readState(id: PanelId): PanelState {
  return store.panelStatus[id]?.state ?? "orijinal";
}

function cycle(id: PanelId): void {
  if (!interactive) return;
  const cur = readState(id);
  const next = PANEL_STATE_ORDER[(PANEL_STATE_ORDER.indexOf(cur) + 1) % PANEL_STATE_ORDER.length];
  store.setPanelState(id, next, store.panelStatus[id]?.note);
}

function renderSvg(): void {
  if (!svgRoot) return;
  for (const def of BODY_PANELS) {
    const path = svgRoot.querySelector<SVGPathElement>(`[data-panel="${def.id}"]`);
    if (!path) continue;
    const state = readState(def.id);
    path.setAttribute("fill", state === "orijinal" ? "rgba(139,146,162,0.12)" : `${STATE_VAR[state]}`);
    path.style.fillOpacity = state === "orijinal" ? "1" : "0.55";
    path.setAttribute("stroke", STATE_VAR[state]);
    path.classList.toggle("panel-active", state !== "orijinal");
  }
}

function renderList(): void {
  if (!listRoot) return;
  listRoot.innerHTML = "";
  const changed = BODY_PANELS.filter((d) => readState(d.id) !== "orijinal").length;
  const countEl = document.getElementById("panel-count");
  if (countEl) countEl.textContent = changed > 0 ? `${changed}/${BODY_PANELS.length} işaretli` : "tümü orijinal";
  for (const def of BODY_PANELS) {
    const state = readState(def.id);
    const row = document.createElement("div");
    row.className = "panel-row";
    row.innerHTML =
      `<span class="panel-dot" style="background:${STATE_VAR[state]}"></span>` +
      `<span class="panel-name">${def.label}</span>`;
    const states = document.createElement("div");
    states.className = "panel-state-btns";
    for (const s of PANEL_STATE_ORDER) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "panel-state-btn" + (s === state ? " active" : "");
      b.style.setProperty("--sw-color", STATE_VAR[s]);
      b.title = PANEL_STATE_LABEL[s];
      b.setAttribute("aria-label", `${def.label}: ${PANEL_STATE_LABEL[s]}`);
      if (interactive) {
        b.addEventListener("click", () => store.setPanelState(def.id, s, store.panelStatus[def.id]?.note));
      } else {
        b.disabled = true;
      }
      states.appendChild(b);
    }
    row.appendChild(states);
    listRoot.appendChild(row);
  }
}

function render(): void {
  renderSvg();
  renderList();
}

export function initPanelDiagram(opts: { svgContainer: HTMLElement; listContainer: HTMLElement; canEdit: boolean }): void {
  interactive = opts.canEdit;
  listRoot = opts.listContainer;

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 240 440");
  svg.setAttribute("class", "panel-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Araç üstten görünüm kaporta/boya durumu diyagramı");

  // Gövde dış hattı (görsel referans, tıklanamaz)
  const outline = document.createElementNS(NS, "path");
  outline.setAttribute(
    "d",
    "M 66 20 Q 30 20 30 62 L 30 380 Q 30 418 66 418 L 174 418 Q 210 418 210 380 L 210 62 Q 210 20 174 20 Z",
  );
  outline.setAttribute("class", "panel-outline");
  svg.appendChild(outline);

  // Ön cam / arka cam ipuçları (dekoratif, tıklanamaz)
  const glass = document.createElementNS(NS, "path");
  glass.setAttribute("d", "M 82 138 L 158 138 L 152 158 L 88 158 Z M 82 300 L 158 300 L 152 320 L 88 320 Z");
  glass.setAttribute("class", "panel-glass");
  svg.appendChild(glass);

  for (const def of BODY_PANELS) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", PANEL_SHAPES[def.id]);
    p.setAttribute("data-panel", def.id);
    p.setAttribute("class", "panel-shape" + (interactive ? " interactive" : ""));
    p.setAttribute("tabindex", interactive ? "0" : "-1");
    p.setAttribute("role", "button");
    p.setAttribute("aria-label", def.label);
    if (interactive) {
      p.addEventListener("click", () => cycle(def.id));
      p.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cycle(def.id); }
      });
    }
    const title = document.createElementNS(NS, "title");
    title.textContent = def.label;
    p.appendChild(title);
    svg.appendChild(p);
  }

  // Tekerlekler (dekoratif)
  for (const [cx, cy] of [[26, 87], [214, 87], [26, 363], [214, 363]] as [number, number][]) {
    const wheel = document.createElementNS(NS, "rect");
    wheel.setAttribute("x", String(cx - 8));
    wheel.setAttribute("y", String(cy - 20));
    wheel.setAttribute("width", "16");
    wheel.setAttribute("height", "40");
    wheel.setAttribute("rx", "6");
    wheel.setAttribute("class", "panel-wheel");
    svg.appendChild(wheel);
  }

  opts.svgContainer.innerHTML = "";
  opts.svgContainer.appendChild(svg);
  svgRoot = svg;

  store.subscribe(render);
  render();
}
