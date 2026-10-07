import type { RegionId } from "../scene/carWireframe";
import { store, formatTL, formatDate } from "../state/store";
import { REGION_LABELS } from "../data/catalog";
import { renderThumbs } from "./photos";
import { renderReminderList } from "./reminderList";
import { chipText } from "./reminderFormat";

/** Müşteri görünümü: sağlık halkası + bakım takvimi + tıklanabilir zaman çizelgesi (tasarım §04). */
export function initCustomerView(opts: {
  onTimelineRegionClick: (id: RegionId) => void;
}): void {
  const healthEl = document.getElementById("health")!;
  const chipsEl = document.getElementById("health-chips")!;
  const reminderListEl = document.getElementById("cust-reminder-list")!;
  const timelineEl = document.getElementById("timeline")!;

  function render(): void {
    const pending = store.cart.filter((i) => i.kind === "oneri").length;
    const overdue = store.reminders.filter((r) => r.status === "gecikti").length;
    const dueSoon = store.reminders.filter((r) => r.status === "yaklasiyor").length;
    const score = Math.max(0, 10 - overdue * 2 - dueSoon - pending);
    const frac = score / 10;
    const circ = 2 * Math.PI * 22;
    healthEl.innerHTML =
      `<svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
         <circle cx="30" cy="30" r="22" fill="none" stroke="var(--line)" stroke-width="6"/>
         <circle cx="30" cy="30" r="22" fill="none" stroke="var(--schema)" stroke-width="6"
                 stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}"
                 stroke-linecap="round" transform="rotate(-90 30 30)"/>
       </svg>
       <div>
         <div class="num">${score}/10</div>
         <div class="lbl">bakım kalemi güncel</div>
       </div>`;

    const urgent = store.reminders.filter((r) => r.status === "gecikti" || r.status === "yaklasiyor");
    const chips: string[] = [];
    for (const r of urgent) chips.push(`<span class="hchip warn"><span class="d"></span>${chipText(r)}</span>`);
    if (pending > 0) chips.push(`<span class="hchip warn"><span class="d"></span>${pending} öneri karar bekliyor</span>`);
    if (chips.length === 0) chips.push(`<span class="hchip ok"><span class="d"></span>Tüm bakımlar güncel</span>`);
    chipsEl.innerHTML = chips.join("");

    renderReminderList(reminderListEl, store.reminders, {
      onRowClick: (region) => opts.onTimelineRegionClick(region as RegionId),
    });

    timelineEl.innerHTML = "";

    const suggestions = store.cart.filter((i) => i.kind === "oneri");
    if (suggestions.length > 0) {
      const rec = document.createElement("div");
      rec.className = "tl-record pending";
      rec.innerHTML = `<div class="tl-head"><span>Karar bekleyen</span><span>öneri</span></div>`;
      for (const s of suggestions) {
        const row = document.createElement("div");
        row.className = "tl-item oneri linked";
        const txt = document.createElement("span");
        txt.className = "txt";
        txt.textContent = `${s.title} — önerildi${s.note ? ` (${s.note})` : ""}`;
        row.innerHTML = `<span class="tdot"></span>`;
        row.appendChild(txt);
        if (s.photos?.length) txt.appendChild(renderThumbs(s.photos));
        const p = document.createElement("span");
        p.className = "p";
        p.textContent = formatTL(s.price);
        row.appendChild(p);
        row.addEventListener("click", () => opts.onTimelineRegionClick(s.region));
        rec.appendChild(row);
      }
      timelineEl.appendChild(rec);
    }

    for (const rec of store.history) {
      const wrap = document.createElement("div");
      wrap.className = "tl-record";
      const head = document.createElement("div");
      head.className = "tl-head";
      head.innerHTML =
        `<span>${formatDate(rec.dateIso)}</span><span>${rec.km.toLocaleString("tr-TR")} km</span>`;
      wrap.appendChild(head);
      for (const item of rec.items) {
        const row = document.createElement("div");
        row.className = `tl-item${item.region ? " linked" : ""}`;
        const txt = document.createElement("span");
        txt.className = "txt";
        txt.textContent = item.title;
        row.innerHTML = `<span class="tdot"></span>`;
        row.appendChild(txt);
        if (item.photos?.length) txt.appendChild(renderThumbs(item.photos));
        if (item.price != null) {
          const p = document.createElement("span");
          p.className = "p";
          p.textContent = formatTL(item.price);
          row.appendChild(p);
        }
        if (item.region) {
          const region = item.region;
          row.title = `${REGION_LABELS[region]} bölgesini sahnede göster`;
          row.addEventListener("click", () => opts.onTimelineRegionClick(region));
        }
        wrap.appendChild(row);
      }
      timelineEl.appendChild(wrap);
    }
  }

  store.subscribe(render);
  render();
}
