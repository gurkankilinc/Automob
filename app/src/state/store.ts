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
  /** ISO 8601 (yyyy-MM-dd). Ekrandaki biçim formatDate() ile üretilir. */
  dateIso: string;
  km: number;
  items: { region: RegionId | null; title: string; price: number | null; photos?: string[] }[];
}

let nextId = 1;
const listeners = new Set<() => void>();
const addListeners = new Set<(region: RegionId) => void>();

/**
 * Devam eden servis sepeti araç başına tarayıcıda saklanır: sayfa yenilense,
 * sekme kapansa ya da usta başka müşteriye geçip geri dönse yarım kalan iş kaybolmaz.
 * Kayıt tamamlanınca işlem kalemleri taslaktan düşer; karar bekleyen öneriler kalır.
 */
const DRAFT_PREFIX = "automob_draft_";

function draftKey(plate: string): string {
  return DRAFT_PREFIX + plate.replace(/\s+/g, "").toUpperCase();
}

/** Aktif araç — taslağın hangi anahtara yazılacağını belirler. */
let draftPlate: string | null = null;

/**
 * blob: URL'leri yalnızca o oturum boyunca geçerlidir (fotoğraf yüklenemediğinde
 * sepete böyle bir önizleme düşebiliyor). Taslağa yazarken elenir; aksi hâlde
 * yenilemeden sonra kırık görsel olarak geri gelirler.
 */
function durablePhotos(photos?: string[]): string[] | undefined {
  const kept = photos?.filter((p) => !p.startsWith("blob:"));
  return kept?.length ? kept : undefined;
}

function persistCart(): void {
  if (!draftPlate) return;
  try {
    const payload = store.cart.map((i) => ({ ...i, photos: durablePhotos(i.photos) }));
    localStorage.setItem(draftKey(draftPlate), JSON.stringify(payload));
  } catch {
    // kota dolu / gizli sekme — kalıcılık kaybı kritik değil, akış sürsün
  }
}

function readDraft(plate: string): CartItem[] | null {
  try {
    const raw = localStorage.getItem(draftKey(plate));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface PanelStatus {
  state: PanelState;
  note?: string;
}

export const store = {
  cart: [] as CartItem[],
  history: [] as ServiceRecord[],
  reminders: [] as Reminder[],
  /** Kaporta/boya durumu — backend'den yüklenir, değişiklik oraya yazılır. */
  panelStatus: {} as Partial<Record<PanelId, PanelStatus>>,

  setPanelState(id: PanelId, state: PanelState, note?: string): void {
    this.panelStatus[id] = { state, note };
    this.notify();
  },

  /** Sunucudan gelen tam listeyle değiştirir (kayıtsız panel = orijinal). */
  replacePanelStatus(list: { panelId: string; state: PanelState; note?: string }[]): void {
    this.panelStatus = {};
    for (const p of list) this.panelStatus[p.panelId as PanelId] = { state: p.state, note: p.note };
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

  /**
   * Aktif aracın sepetini yükler. Saklı taslak varsa ondan devam edilir; hiç
   * taslak yazılmamışsa (ilk açılış) demo aracı için tanıtım sepeti kurulur ve
   * hemen taslağa yazılır — sonraki ziyarette yeniden üretilmez.
   *
   * `useDraft: false` (müşteri rolü): taslak ne okunur ne yazılır; yalnızca
   * tanıtım sepeti gösterilir. Taslaklar işletmenin kaydedilmemiş işidir.
   */
  loadCartFor(plate: string, { useDraft = true }: { useDraft?: boolean } = {}): void {
    draftPlate = useDraft ? plate : null;
    const saved = useDraft ? readDraft(plate) : null;
    this.cart = saved ?? (draftKey(plate) === draftKey(DEMO_PLATE) ? demoCart() : []);
    if (saved === null && this.cart.length > 0) persistCart();
    // Saklı kalemlerin id'leri yeniden kullanılmasın
    nextId = Math.max(nextId, ...this.cart.map((i) => i.id + 1), 1);
    this.notify();
  },

  addItem(
    region: RegionId, title: string, price: number,
    kind: ItemKind = "islem", note?: string, photos?: string[],
  ): boolean {
    if (this.cart.some((i) => i.region === region && i.title === title)) return false;
    this.cart.push({ id: nextId++, region, title, price, kind, note, photos });
    persistCart();
    for (const fn of addListeners) fn(region); // notify öncesi: syncScene güncel hidden görsün
    this.notify();
    return true;
  },

  removeItem(id: number): void {
    this.cart = this.cart.filter((i) => i.id !== id);
    persistCart();
    this.notify();
  },

  /** İşlem kalemleri kayda geçer; öneriler sepette kalır (karar bekliyor). */
  save(km: number): ServiceRecord | null {
    const done = this.cart.filter((i) => i.kind === "islem");
    if (done.length === 0) return null;
    const now = new Date();
    const record: ServiceRecord = {
      dateIso: now.toISOString().slice(0, 10),
      km,
      items: done.map((i) => ({ region: i.region, title: i.title, price: i.price, photos: i.photos })),
    };
    this.history.unshift(record);
    this.cart = this.cart.filter((i) => i.kind === "oneri");
    persistCart(); // kaydedilen kalemler düştü; karar bekleyen öneriler taslakta kalır
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

/** Tanıtım sepetinin bağlı olduğu araç — yalnızca bu araçta ve ilk açılışta kurulur. */
const DEMO_PLATE = "34 ABC 123";

/** Demo aracın tanıtım sepeti. Kullanıcı bir kez dokununca yerini taslak alır. */
function demoCart(): CartItem[] {
  return [
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
}

store.history = [
  {
    dateIso: "2026-03-12",
    km: 78200,
    items: [
      { region: "fren", title: "Fren diski (ön çift)", price: 2600 },
      { region: null, title: "Rot balans + lastik rotasyonu", price: 700 },
    ],
  },
  {
    dateIso: "2025-11-10",
    km: 71000,
    items: [{ region: "motor", title: "Periyodik bakım — yağ + 3 filtre", price: 2200 }],
  },
];

export function formatTL(v: number): string {
  return `${v.toLocaleString("tr-TR")}₺`;
}

/**
 * yyyy-MM-dd → "12 Mar 2026". Tarih yerel gün olarak kurulur; `new Date(iso)`
 * UTC gece yarısı sayar ve batı saat dilimlerinde bir önceki güne kayar.
 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
