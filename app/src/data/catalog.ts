import type { RegionId } from "../scene/carWireframe";

/** Bölge → bakım kalemi kataloğu (KONSEPT §5 "Detay seviyesi"). */
export interface CatalogItem {
  title: string;
  price: number;
  /** parça / işçilik / paket — modalda gruplanır */
  group: "parca" | "iscilik" | "paket";
}

export const CATALOG: Record<RegionId, CatalogItem[]> = {
  motor: [
    { title: "Motor yağı + 3 filtre", price: 2450, group: "paket" },
    { title: "Triger seti + devirdaim", price: 4900, group: "paket" },
    { title: "Buji seti (4)", price: 900, group: "parca" },
    { title: "V kayışı", price: 650, group: "parca" },
    { title: "Motor takozu", price: 1250, group: "parca" },
    { title: "Enjektör temizliği", price: 800, group: "iscilik" },
  ],
  fren: [
    { title: "Balata seti (ön)", price: 1870, group: "parca" },
    { title: "Balata seti (arka)", price: 1650, group: "parca" },
    { title: "Fren diski (ön çift)", price: 2600, group: "parca" },
    { title: "Fren diski (arka çift)", price: 2400, group: "parca" },
    { title: "Fren hidroliği", price: 480, group: "iscilik" },
    { title: "ABS sensörü", price: 1100, group: "parca" },
  ],
  amortisor: [
    { title: "Amortisör (arka çift)", price: 3200, group: "parca" },
    { title: "Amortisör (ön çift)", price: 3400, group: "parca" },
    { title: "Amortisör takozu", price: 550, group: "parca" },
    { title: "Salıncak (alt çift)", price: 2100, group: "parca" },
    { title: "Rotil + z-rot", price: 1300, group: "parca" },
    { title: "Rot balans ayarı", price: 700, group: "iscilik" },
  ],
};

export const GROUP_LABELS: Record<CatalogItem["group"], string> = {
  paket: "Bakım paketleri",
  parca: "Parça değişimi",
  iscilik: "İşçilik",
};

/** Tek tıkla eklenen hazır işlem paketi (tasarım §03 "sepet metaforu"). */
export const TEMPLATE_10K: { region: RegionId; title: string; price: number }[] = [
  { region: "motor", title: "Motor yağı + 3 filtre", price: 2450 },
  { region: "fren", title: "Fren hidroliği", price: 480 },
];

export const REGION_LABELS: Record<RegionId, string> = {
  motor: "Motor bölgesi",
  fren: "Ön fren",
  amortisor: "Arka süspansiyon",
};
