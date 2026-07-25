import type { RegionId } from "../scene/carWireframe";
import { CATALOG, GROUP_LABELS, REGION_LABELS, type CatalogItem } from "../data/catalog";
import { store, formatTL, type ItemKind } from "../state/store";
import { api } from "../api/client";
import { showToast } from "./toast";
import { openLightbox } from "./lightbox";

/**
 * Katalog seçim penceresi: bir bölgeye ait kalemleri gruplu listeler,
 * çoklu seçim + durum (işlem/öneri) + not + fotoğraf ile sepete ekler.
 *
 * Fotoğraflar seçilir seçilmez arka planda backend'e yüklenir (kalıcı /uploads
 * URL'i için); önizleme anında yerel blob URL'iyle gösterilir, yükleme bitince
 * sessizce kalıcı URL'e geçilir. Backend kapalıysa veya yükleme başarısız olursa
 * kalem yine de yerel önizleme URL'iyle sepete eklenir (bu oturumda görünür kalır).
 */

interface PhotoEntry {
  previewUrl: string;
  serverUrl: string | null;
  settled: boolean;
  uploading: Promise<void>;
}

let root: HTMLElement | null = null;
let titleEl: HTMLElement;
let bodyEl: HTMLElement;
let noteInput: HTMLInputElement;
let addBtn: HTMLButtonElement;
let photoBtn: HTMLButtonElement;
let fileInput: HTMLInputElement;
let stripEl: HTMLElement;

let current: RegionId | null = null;
const selected = new Set<string>();
let kind: ItemKind = "islem";
let entries: PhotoEntry[] = [];

const GROUP_ORDER: CatalogItem["group"][] = ["paket", "parca", "iscilik"];

function build(): void {
  root = document.createElement("div");
  root.className = "modal-backdrop";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = `
    <div class="modal">
      <header class="modal-head">
        <div>
          <div class="modal-eyebrow">Kalem ekle</div>
          <h2 class="modal-title" id="cat-title"></h2>
        </div>
        <button class="modal-close" id="cat-close" aria-label="Kapat">×</button>
      </header>
      <div class="modal-body" id="cat-body"></div>
      <footer class="modal-foot">
        <div class="foot-row">
          <div class="durum-toggle" role="group" aria-label="Kalem durumu">
            <button data-kind="islem" class="active">İşlem yapıldı</button>
            <button data-kind="oneri">Öneri</button>
          </div>
          <button id="cat-photo" class="chip-btn" type="button">📷 Fotoğraf ekle</button>
          <input id="cat-file" type="file" accept="image/*" multiple hidden />
        </div>
        <div class="photo-strip" id="cat-photos" hidden></div>
        <input id="cat-note" class="note-input" placeholder="Not (opsiyonel) — örn. aşınma %80" />
        <button id="cat-add" class="cta" type="button">Sepete ekle</button>
      </footer>
    </div>`;
  document.body.appendChild(root);

  titleEl = root.querySelector("#cat-title")!;
  bodyEl = root.querySelector("#cat-body")!;
  noteInput = root.querySelector("#cat-note") as HTMLInputElement;
  addBtn = root.querySelector("#cat-add") as HTMLButtonElement;
  photoBtn = root.querySelector("#cat-photo") as HTMLButtonElement;
  fileInput = root.querySelector("#cat-file") as HTMLInputElement;
  stripEl = root.querySelector("#cat-photos")!;

  root.querySelector("#cat-close")!.addEventListener("click", () => close(false));
  root.addEventListener("click", (e) => {
    if (e.target === root) close(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root!.classList.contains("open")) close(false);
  });

  for (const b of root.querySelectorAll<HTMLButtonElement>(".durum-toggle button")) {
    b.addEventListener("click", () => {
      kind = b.dataset.kind as ItemKind;
      for (const x of root!.querySelectorAll(".durum-toggle button")) x.classList.remove("active");
      b.classList.add("active");
    });
  }

  photoBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    for (const file of Array.from(fileInput.files ?? [])) addPhoto(file);
    fileInput.value = "";
  });

  addBtn.addEventListener("click", () => void commit());
}

function addPhoto(file: File): void {
  const entry: PhotoEntry = {
    previewUrl: URL.createObjectURL(file),
    serverUrl: null,
    settled: false,
    uploading: Promise.resolve(),
  };
  entry.uploading = api.uploadPhotos([file])
    .then((urls) => {
      entry.serverUrl = urls[0] ?? null;
    })
    .catch(() => {
      // backend kapalı, yetkisiz veya ağ hatası — yerel önizlemeyle devam edilir
    })
    .finally(() => {
      entry.settled = true;
      renderStrip();
    });
  entries.push(entry);
  renderStrip();
}

function renderStrip(): void {
  stripEl.hidden = entries.length === 0;
  photoBtn.classList.toggle("has", entries.length > 0);
  photoBtn.textContent = entries.length > 0 ? `📷 ${entries.length} fotoğraf` : "📷 Fotoğraf ekle";
  stripEl.innerHTML = "";
  const previewUrls = entries.map((e) => e.previewUrl);
  entries.forEach((entry, i) => {
    const thumb = document.createElement("div");
    thumb.className = "photo-thumb" + (!entry.settled ? " uploading" : "");
    const img = document.createElement("img");
    img.src = entry.previewUrl;
    img.alt = `Fotoğraf ${i + 1}`;
    img.addEventListener("click", () => openLightbox(previewUrls, i));
    const rm = document.createElement("button");
    rm.className = "photo-rm";
    rm.type = "button";
    rm.textContent = "×";
    rm.setAttribute("aria-label", `Fotoğraf ${i + 1} kaldır`);
    rm.addEventListener("click", () => {
      URL.revokeObjectURL(entry.previewUrl);
      entries.splice(i, 1);
      renderStrip();
    });
    thumb.append(img, rm);
    stripEl.appendChild(thumb);
  });
}

function renderBody(): void {
  const region = current!;
  bodyEl.innerHTML = "";
  for (const group of GROUP_ORDER) {
    const items = CATALOG[region].filter((i) => i.group === group);
    if (items.length === 0) continue;
    const gh = document.createElement("div");
    gh.className = "cat-group-label";
    gh.textContent = GROUP_LABELS[group];
    bodyEl.appendChild(gh);
    for (const item of items) {
      const inCart = store.cart.some((c) => c.region === region && c.title === item.title);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cat-row" + (inCart ? " in-cart" : "");
      row.disabled = inCart;
      row.classList.toggle("selected", selected.has(item.title));
      row.innerHTML = `
        <span class="cat-check" aria-hidden="true"></span>
        <span class="cat-name">${item.title}</span>
        <span class="cat-price">${inCart ? "Sepette" : formatTL(item.price)}</span>`;
      if (!inCart) {
        row.addEventListener("click", () => {
          if (selected.has(item.title)) selected.delete(item.title);
          else selected.add(item.title);
          renderBody();
          updateAddBtn();
        });
      }
      bodyEl.appendChild(row);
    }
  }
}

function updateAddBtn(): void {
  addBtn.textContent = selected.size > 0 ? `Sepete ekle (${selected.size})` : "Sepete ekle";
  addBtn.disabled = selected.size === 0;
}

async function commit(): Promise<void> {
  const region = current!;
  const note = noteInput.value.trim();
  const pending = entries.filter((e) => !e.settled);

  addBtn.disabled = true;
  if (pending.length > 0) addBtn.textContent = "Yükleniyor…";
  await Promise.all(entries.map((e) => e.uploading));

  const finalPhotos = entries.map((e) => e.serverUrl ?? e.previewUrl);
  let added = 0;
  for (const item of CATALOG[region]) {
    if (!selected.has(item.title)) continue;
    if (store.addItem(region, item.title, item.price, kind, note || undefined, finalPhotos.slice())) added++;
  }
  showToast(
    added > 0
      ? `${REGION_LABELS[region]}: ${added} kalem ${kind === "oneri" ? "öneri olarak " : ""}eklendi.`
      : "Kalem eklenemedi.",
  );
  entries = []; // sahiplik kalemlere geçti; blob URL'leri revoke etme (küçük kalemler, oturum sonunda GC)
  close(true);
}

export function openCatalog(region: RegionId): void {
  if (!root) build();
  current = region;
  selected.clear();
  kind = "islem";
  entries = [];

  titleEl.textContent = REGION_LABELS[region];
  noteInput.value = "";
  addBtn.disabled = false;
  for (const b of root!.querySelectorAll(".durum-toggle button")) {
    b.classList.toggle("active", (b as HTMLElement).dataset.kind === "islem");
  }
  renderStrip();
  renderBody();
  updateAddBtn();
  root!.classList.add("open");
  noteInput.focus({ preventScroll: true });
}

function close(committed: boolean): void {
  if (!committed) for (const e of entries) URL.revokeObjectURL(e.previewUrl);
  entries = [];
  root?.classList.remove("open");
}
