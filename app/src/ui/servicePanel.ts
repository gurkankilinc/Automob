import type { RegionId } from "../scene/carWireframe";
import { store, formatTL } from "../state/store";
import { TEMPLATE_10K, REGION_LABELS } from "../data/catalog";
import { demoVehicle } from "../data/demoVehicle";
import { openCatalog } from "./catalogModal";
import { showToast } from "./toast";
import { renderThumbs } from "./photos";
import { renderReminderList } from "./reminderList";

const MODE_CHIP: Record<string, string> = { done: "Değişti", suggest: "Öneri", off: "—" };

/** Servis paneli: araç kartı + bölge listesi (sol) ve işlem sepeti (sağ). */
export function initServicePanel(opts: {
  onRegionRowClick: (id: RegionId) => void;
  onCartChanged: () => void;
  onSaveAndReport: () => void;
}): void {
  const regionList = document.getElementById("region-list")!;
  const regionCount = document.getElementById("region-count")!;
  const cartList = document.getElementById("cart-list")!;
  const cartKm = document.getElementById("cart-km")!;
  const cartCount = document.getElementById("cart-count")!;
  const totalsEl = document.getElementById("totals")!;
  const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
  const reminderListEl = document.getElementById("reminder-list")!;

  const interactive: RegionId[] = ["motor", "fren", "amortisor"];
  const staticRegions = ["Elektrik / akü", "Egzoz", "Kaporta", "Klima", "Lastik / jant"];

  function renderRegions(): void {
    regionList.innerHTML = "";
    let active = 0;
    for (const id of interactive) {
      const mode = store.regionMode(id);
      if (mode !== "off") active++;
      const li = document.createElement("li");
      li.className = `interactive mode-${mode}`;
      li.innerHTML =
        `<span class="dot"></span><span class="name">${REGION_LABELS[id]}</span>` +
        `<span class="chip">${MODE_CHIP[mode]}</span>`;
      li.addEventListener("click", () => opts.onRegionRowClick(id));
      const add = document.createElement("button");
      add.className = "add";
      add.textContent = "+";
      add.title = "Bu bölgeye kalem ekle";
      add.setAttribute("aria-label", `${REGION_LABELS[id]} bölgesine kalem ekle`);
      add.addEventListener("click", (e) => {
        e.stopPropagation();
        openCatalog(id);
      });
      li.appendChild(add);
      regionList.appendChild(li);
    }
    for (const name of staticRegions) {
      const li = document.createElement("li");
      li.className = "static";
      li.innerHTML = `<span class="dot"></span><span class="name">${name}</span>`;
      regionList.appendChild(li);
    }
    regionCount.textContent = `${active} aktif`;
  }

  function renderCart(): void {
    cartKm.textContent = `Servis girişi · ${demoVehicle.km.toLocaleString("tr-TR")} km`;
    cartList.innerHTML = "";
    for (const item of store.cart) {
      const div = document.createElement("div");
      div.className = `cart-item ${item.kind}`;
      const metaParts = [
        item.kind === "oneri" ? "Öneri — karar bekliyor" : REGION_LABELS[item.region],
        item.note,
      ].filter(Boolean);
      const body = document.createElement("div");
      body.className = "body";
      body.innerHTML =
        `<div class="title"><span class="name">${item.title}</span><span class="price">${formatTL(item.price)}</span></div>` +
        (metaParts.length ? `<div class="meta">${metaParts.join(" · ")}</div>` : "");
      if (item.photos?.length) body.appendChild(renderThumbs(item.photos));
      div.appendChild(body);
      const rm = document.createElement("button");
      rm.className = "rm";
      rm.textContent = "×";
      rm.setAttribute("aria-label", `${item.title} kalemini kaldır`);
      rm.addEventListener("click", () => store.removeItem(item.id));
      div.appendChild(rm);
      cartList.appendChild(div);
    }
    if (store.cart.length === 0) {
      cartList.innerHTML =
        `<div class="cart-empty">Sepet boş — 3D'de bölgeye dokunun ya da listeden ＋ ile kalem ekleyin.</div>`;
    }
    cartCount.textContent = `${store.cart.length} kalem`;

    const done = store.totalDone();
    const suggest = store.totalSuggest();
    totalsEl.innerHTML =
      `<div class="row"><span>İşlemler</span><span class="val">${formatTL(done)}</span></div>` +
      (suggest > 0
        ? `<div class="row suggest"><span>Öneriler (teklif)</span><span class="val">${formatTL(suggest)}</span></div>`
        : "") +
      `<div class="row grand"><span>Toplam</span><span class="val">${formatTL(done)}</span></div>`;

    saveBtn.disabled = !store.cart.some((i) => i.kind === "islem");
  }

  function render(): void {
    renderVehicleCard();
    renderRegions();
    renderCart();
    renderReminderList(reminderListEl, store.reminders, {
      limit: 3,
      onRowClick: (region) => openCatalog(region as RegionId),
    });
    opts.onCartChanged();
  }

  document.getElementById("template-btn")!.addEventListener("click", () => {
    let added = 0;
    for (const t of TEMPLATE_10K) if (store.addItem(t.region, t.title, t.price)) added++;
    showToast(added > 0 ? `Şablon uygulandı: ${added} kalem eklendi.` : "Şablon kalemleri zaten sepette.");
  });

  saveBtn.addEventListener("click", () => opts.onSaveAndReport());

  store.subscribe(render);
  render();
}

function renderVehicleCard(): void {
  const v = demoVehicle;
  document.getElementById("veh-avatar")!.textContent = v.owner.charAt(0);
  document.getElementById("veh-owner")!.textContent = v.owner;
  document.getElementById("veh-phone")!.textContent = v.phone;
  document.getElementById("veh-grid")!.innerHTML =
    cell("Model", v.model) + cell("Yıl", String(v.year)) +
    cell("Şasi", v.vin) + cell("Km", v.km.toLocaleString("tr-TR"));
}

function cell(k: string, val: string): string {
  return `<div><span class="mini-k">${k}</span><span class="mini-v">${val}</span></div>`;
}
