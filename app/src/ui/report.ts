import { formatTL } from "../state/store";
import { renderThumbs } from "./photos";
import { showToast } from "./toast";

export interface ReportLine {
  title: string;
  price: number;
  photos?: string[];
}

export interface ReportData {
  serviceName: string;
  date: string;
  km: number;
  plate: string;
  model: string;
  bodyLabel: string;
  /** 3D sahne anlık görüntüsü (PNG data URL) */
  snapshot: string;
  operations: ReportLine[];
  suggestions: ReportLine[];
  total: number;
}

let root: HTMLElement | null = null;
let cardBody: HTMLElement;
let current: ReportData | null = null;

function build(): void {
  root = document.createElement("div");
  root.className = "report-backdrop";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = `
    <div class="report-dialog">
      <div class="report-actions">
        <button class="ract" id="rp-print" type="button">Yazdır / PDF</button>
        <button class="ract" id="rp-copy" type="button">Bağlantı kopyala</button>
        <button class="ract close" id="rp-close" type="button" aria-label="Kapat">Kapat ×</button>
      </div>
      <article class="report-card" id="rp-card"></article>
    </div>`;
  document.body.appendChild(root);
  cardBody = root.querySelector("#rp-card")!;

  root.querySelector("#rp-close")!.addEventListener("click", close);
  root.addEventListener("click", (e) => { if (e.target === root) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root!.classList.contains("open")) close();
  });
  root.querySelector("#rp-print")!.addEventListener("click", () => window.print());
  root.querySelector("#rp-copy")!.addEventListener("click", copyLink);
}

function copyLink(): void {
  // Prototipte gerçek arka uç yok; müşteriye gidecek paylaşım bağlantısını temsil eder
  const link = `${location.origin}${location.pathname}#musteri`;
  navigator.clipboard?.writeText(link).then(
    () => showToast("Rapor bağlantısı kopyalandı."),
    () => showToast("Bağlantı kopyalanamadı."),
  );
}

function lineRow(line: ReportLine, offer: boolean): HTMLElement {
  const row = document.createElement("div");
  row.className = "rp-line" + (offer ? " offer" : "");
  const head = document.createElement("div");
  head.className = "rp-line-head";
  head.innerHTML =
    `<span class="rp-line-title">${offer ? "Öneri: " : ""}${line.title}</span>` +
    `<span class="rp-line-price">${formatTL(line.price)}</span>`;
  row.appendChild(head);
  if (line.photos?.length) row.appendChild(renderThumbs(line.photos));
  return row;
}

export function openReport(data: ReportData): void {
  if (!root) build();
  current = data;
  cardBody.innerHTML = "";

  const head = document.createElement("header");
  head.className = "rp-head";
  head.innerHTML =
    `<div class="rp-logo">${data.serviceName}</div>` +
    `<div class="rp-meta">${data.date} · ${data.km.toLocaleString("tr-TR")} km</div>`;
  cardBody.appendChild(head);

  const veh = document.createElement("div");
  veh.className = "rp-vehicle";
  veh.innerHTML =
    `<span class="rp-plate">${data.plate}</span>` +
    `<span>${data.model} · ${data.bodyLabel}</span>`;
  cardBody.appendChild(veh);

  const snap = document.createElement("div");
  snap.className = "rp-snap";
  const img = document.createElement("img");
  img.src = data.snapshot;
  img.alt = "Araç 3D anlık görüntüsü";
  snap.appendChild(img);
  cardBody.appendChild(snap);

  if (data.operations.length) {
    cardBody.appendChild(sectionLabel("Yapılan işlemler"));
    for (const op of data.operations) cardBody.appendChild(lineRow(op, false));
  }
  if (data.suggestions.length) {
    cardBody.appendChild(sectionLabel("Öneriler (teklif)"));
    for (const s of data.suggestions) cardBody.appendChild(lineRow(s, true));
  }

  const total = document.createElement("div");
  total.className = "rp-total";
  total.innerHTML = `<span>Toplam</span><span>${formatTL(data.total)}</span>`;
  cardBody.appendChild(total);

  const foot = document.createElement("div");
  foot.className = "rp-foot";
  foot.textContent = "AUTOMOB İLE HAZIRLANDI";
  cardBody.appendChild(foot);

  root!.classList.add("open");
}

function sectionLabel(text: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "rp-section";
  el.textContent = text;
  return el;
}

export function hasReport(): boolean {
  return current !== null;
}

function close(): void {
  root?.classList.remove("open");
}
