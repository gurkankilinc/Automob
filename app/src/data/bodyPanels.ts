/**
 * Kaporta/boya durumu — klasik "ekspertiz" üstten görünüm paneli.
 * KONSEPT.md'deki "Kaporta panelleri" bölge kategorisinin somutlaştırılmış hâli;
 * motor/fren/amortisör gibi mekanik bakım bölgelerinden ayrı bir alan (gövde/boya).
 */
export type PanelId =
  | "on-tampon" | "kaput" | "tavan" | "bagaj" | "arka-tampon"
  | "sol-on-camurluk" | "sag-on-camurluk" | "sol-arka-camurluk" | "sag-arka-camurluk"
  | "sol-on-kapi" | "sag-on-kapi" | "sol-arka-kapi" | "sag-arka-kapi";

/** Sahibinden/ekspertiz raporlarındaki klasik 4 durum — renkler bizim amber/sarı ailemize uyarlanmıştır. */
export type PanelState = "orijinal" | "lokal-boyali" | "boyali" | "degisen";

export interface PanelDef {
  id: PanelId;
  label: string;
}

export const BODY_PANELS: PanelDef[] = [
  { id: "on-tampon", label: "Ön Tampon" },
  { id: "kaput", label: "Kaput" },
  { id: "sol-on-camurluk", label: "Sol Ön Çamurluk" },
  { id: "sag-on-camurluk", label: "Sağ Ön Çamurluk" },
  { id: "sol-on-kapi", label: "Sol Ön Kapı" },
  { id: "sag-on-kapi", label: "Sağ Ön Kapı" },
  { id: "tavan", label: "Tavan" },
  { id: "sol-arka-kapi", label: "Sol Arka Kapı" },
  { id: "sag-arka-kapi", label: "Sağ Arka Kapı" },
  { id: "sol-arka-camurluk", label: "Sol Arka Çamurluk" },
  { id: "sag-arka-camurluk", label: "Sağ Arka Çamurluk" },
  { id: "bagaj", label: "Bagaj" },
  { id: "arka-tampon", label: "Arka Tampon" },
];

export const PANEL_STATE_ORDER: PanelState[] = ["orijinal", "lokal-boyali", "boyali", "degisen"];

export const PANEL_STATE_LABEL: Record<PanelState, string> = {
  "orijinal": "Orijinal",
  "lokal-boyali": "Lokal Boyalı",
  "boyali": "Boyalı",
  "degisen": "Değişen",
};
