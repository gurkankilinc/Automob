import type { RegionId } from "../scene/carWireframe";
import type { RegionMode } from "../scene/regions";
import type { Reminder } from "../domain/reminders";
import type { PanelId, PanelState } from "../data/bodyPanels";

/**
 * Faz 1 durum deposu: işlem sepeti + servis geçmişi.
 * Gerçek üründe API'ye bağlanır; arayüzler yalnızca subscribe/notify görür.
 */
export type ItemKind = "islem" | "oneri";

export interface CartItem {
  id: number;
  region: RegionId;
  title: string;
  price: number;
  kind: ItemKind;
  note?: string;
  /** Object URL'leri — fotoğraf önizlemesi */
  photos?: string[];
}

export interface ServiceRecord {
  date: string;
  /** ISO 8601 (yyyy-MM-dd) — bakım hatırlatma hesaplarında kullanılır */
  dateIso: string;
  km: number;
  items: { region: RegionId | null; title: string; price: number | null; photos?: string[] }[];
}

let nextId = 1;
const listeners = new Set<() => void>();
const addListeners = new Set<(region: RegionId) => void>();

export interface PanelStatus {
  state: PanelState;
  note?: string;
}

export const store = {
  cart: [] as CartItem[],
  history: [] as ServiceRecord[],
  reminders: [] as Reminder[],
  /** Kaporta/boya durumu — Faz 1'de yerel (oturum içi); bkz. ui/panelDiagram.ts */
  panelStatus: {} as Partial<Record<PanelId, PanelStatus>>,

  setPanelState(id: PanelId, state: PanelState, note?: string): void {
    this.panelStatus[id] = { state, note };
    this.notify();
  },

  setReminders(list: Reminder[]): void {
    this.reminders = list;
    this.notify();
  },

  subscribe(fn: () => void): void {
    listeners.add(fn);
  },
  notify(): void {
    for (const fn of listeners) fn();
  },
  /** Bir bölgeye kalem eklendiğinde tetiklenir (otomatik vurgulama için). */
  onAdd(fn: (region: RegionId) => void): void {
    addListeners.add(fn);
  },

  addItem(
    region: RegionId, title: string, price: number,
    kind: ItemKind = "islem", note?: string, photos?: string[],
  ): boolean {
    if (this.cart.some((i) => i.region === region && i.title === title)) return false;
    this.cart.push({ id: nextId++, region, title, price, kind, note, photos });
    for (const fn of addListeners) fn(region); // notify öncesi: syncScene güncel hidden görsün
    this.notify();
    return true;
  },

  removeItem(id: number): void {
    this.cart = this.cart.filter((i) => i.id !== id);
    this.notify();
  },

  /** İşlem kalemleri kayda geçer; öneriler sepette kalır (karar bekliyor). */
  save(km: number): ServiceRecord | null {
    const done = this.cart.filter((i) => i.kind === "islem");
    if (done.length === 0) return null;
    const now = new Date();
    const record: ServiceRecord = {
      date: now.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }),
      dateIso: now.toISOString().slice(0, 10),
      km,
      items: done.map((i) => ({ region: i.region, title: i.title, price: i.price, photos: i.photos })),
    };
    this.history.unshift(record);
    this.cart = this.cart.filter((i) => i.kind === "oneri");
    this.notify();
    return record;
  },

  /** Sepetten türetilen bölge durumu: işlem > öneri > kapalı. */
  regionMode(region: RegionId): RegionMode {
    if (this.cart.some((i) => i.region === region && i.kind === "islem")) return "done";
    if (this.cart.some((i) => i.region === region && i.kind === "oneri")) return "suggest";
    return "off";
  },

  totalDone(): number {
    return this.cart.filter((i) => i.kind === "islem").reduce((s, i) => s + i.price, 0);
  },
  totalSuggest(): number {
    return this.cart.filter((i) => i.kind === "oneri").reduce((s, i) => s + i.price, 0);
  },
};

// Demo yer tutucu fotoğrafı (gerçek üründe usta telefonla çeker)
function placeholderPhoto(label: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='165'>` +
    `<rect width='220' height='165' fill='#171c25'/>` +
    `<rect x='1' y='1' width='218' height='163' fill='none' stroke='#2a3140'/>` +
    `<g stroke='#f5c93e' stroke-width='2' fill='none' opacity='0.85' stroke-linejoin='round'>` +
    `<rect x='54' y='52' width='112' height='46' rx='7'/>` +
    `<line x1='66' y1='64' x2='154' y2='64'/><line x1='66' y1='86' x2='154' y2='86'/>` +
    `<circle cx='42' cy='75' r='8'/><circle cx='178' cy='75' r='8'/></g>` +
    `<text x='110' y='134' fill='#8b92a2' font-family='monospace' font-size='12' text-anchor='middle'>${label}</text>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// ---- Demo başlangıç verisi ----
store.cart = [
  { id: nextId++, region: "motor", title: "Motor yağı + 3 filtre", price: 2450, kind: "islem" },
  {
    id: nextId++, region: "fren", title: "Balata seti (ön)", price: 1870, kind: "islem",
    note: "aşınma sınırında",
    photos: [placeholderPhoto("BALATA-ON-01"), placeholderPhoto("BALATA-ON-02")],
  },
  {
    id: nextId++, region: "amortisor", title: "Amortisör (arka çift)", price: 3200, kind: "oneri",
    note: "sızıntı gözlendi",
    photos: [placeholderPhoto("AMORTISOR-01")],
  },
];

store.history = [
  {
    date: "12 Mar 2026",
    dateIso: "2026-03-12",
    km: 78200,
    items: [
      { region: "fren", title: "Fren diski (ön çift)", price: 2600 },
      { region: null, title: "Rot balans + lastik rotasyonu", price: 700 },
    ],
  },
  {
    date: "10 Kas 2025",
    dateIso: "2025-11-10",
    km: 71000,
    items: [{ region: "motor", title: "Periyodik bakım — yağ + 3 filtre", price: 2200 }],
  },
];

export function formatTL(v: number): string {
  return `${v.toLocaleString("tr-TR")}₺`;
}
