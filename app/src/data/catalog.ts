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
    { title: "Antifriz / soğutma sıvısı değişimi", price: 950, group: "paket" },
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
  lastik: [
    { title: "4 lastik değişimi", price: 6800, group: "paket" },
    { title: "2 lastik değişimi (ön)", price: 3600, group: "parca" },
    { title: "2 lastik değişimi (arka)", price: 3400, group: "parca" },
    { title: "Lastik rotasyonu", price: 350, group: "iscilik" },
    { title: "Lastik tamiri (yama)", price: 250, group: "iscilik" },
    { title: "Jant düzeltme / balans", price: 500, group: "iscilik" },
  ],
  elektrik: [
    { title: "Akü değişimi", price: 2800, group: "parca" },
    { title: "Akü kontrolü (yük testi)", price: 150, group: "iscilik" },
    { title: "Alternatör tamiri / değişimi", price: 3200, group: "parca" },
    { title: "Marş motoru değişimi", price: 2600, group: "parca" },
    { title: "Sigorta / kablo demeti onarımı", price: 400, group: "iscilik" },
  ],
  egzoz: [
    { title: "Susturucu değişimi", price: 3100, group: "parca" },
    { title: "Egzoz manifoldu contası", price: 650, group: "parca" },
    { title: "Egzoz askı takozu", price: 220, group: "parca" },
    { title: "Katalitik konvertör değişimi", price: 7800, group: "parca" },
    { title: "Egzoz kaynak / onarım", price: 900, group: "iscilik" },
  ],
  klima: [
    { title: "Klima gazı dolumu (freon)", price: 1200, group: "iscilik" },
    { title: "Klima kompresörü değişimi", price: 5200, group: "parca" },
    { title: "Klima kondenseri değişimi", price: 2400, group: "parca" },
    { title: "Kabin filtresi değişimi", price: 350, group: "parca" },
    { title: "Klima bakımı (dezenfeksiyon)", price: 600, group: "iscilik" },
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
  amortisor: "Amortisör / süspansiyon",
  lastik: "Lastik / Jant",
  elektrik: "Elektrik / Akü",
  egzoz: "Egzoz",
  klima: "Klima",
};
