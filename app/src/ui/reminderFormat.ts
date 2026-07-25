import type { Reminder } from "../domain/reminders";

export const STATUS_LABEL: Record<Reminder["status"], string> = {
  gecikti: "Gecikti",
  yaklasiyor: "Yaklaşıyor",
  guncel: "Güncel",
  bilinmiyor: "Kayıt yok",
};

/** Sağ tarafta gösterilecek kısa kalan-mesafe/gün metni. */
export function remainingText(r: Reminder): string {
  if (r.status === "bilinmiyor") return "henüz kayıt yok";
  if (r.status === "gecikti") {
    if (r.remainingKm != null && r.remainingKm <= 0) return `${Math.abs(r.remainingKm).toLocaleString("tr-TR")} km aşıldı`;
    if (r.remainingDays != null && r.remainingDays <= 0) return `${Math.abs(r.remainingDays)} gün gecikti`;
    return "gecikti";
  }
  if (r.remainingKm != null) return `${r.remainingKm.toLocaleString("tr-TR")} km kaldı`;
  if (r.remainingDays != null) return `${r.remainingDays} gün kaldı`;
  return "";
}

/** Sağlık kartı için tek satırlık uyarı cümlesi. */
export function chipText(r: Reminder): string {
  if (r.status === "gecikti") return `${r.title} gecikti`;
  if (r.status === "yaklasiyor") return `${r.title}: ${remainingText(r)}`;
  return r.title;
}
