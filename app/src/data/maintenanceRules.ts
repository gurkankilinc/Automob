import type { RegionId } from "../scene/carWireframe";

/**
 * Km/tarih bazlı bakım hatırlatma kuralları.
 *
 * `matchKeyword`, servis geçmişindeki kalem başlıklarıyla (büyük/küçük harf duyarsız,
 * içerir eşleşmesi) karşılaştırılır; en yeni eşleşme "son yapılan" baseline'ı olur.
 *
 * NOT: server/.../MaintenanceRules.kt ile birebir eşleşmelidir — backend çevrimdışıyken
 * tarayıcı aynı kuralları burada yerel olarak uygular.
 */
export interface MaintenanceRule {
  id: string;
  title: string;
  region: RegionId | null;
  matchKeyword: string;
  intervalKm: number | null;
  intervalMonths: number | null;
}

export const MAINTENANCE_RULES: MaintenanceRule[] = [
  { id: "yag-filtre", title: "Motor yağı + filtre değişimi", region: "motor", matchKeyword: "yağ", intervalKm: 10_000, intervalMonths: 12 },
  { id: "triger", title: "Triger seti + devirdaim", region: "motor", matchKeyword: "triger", intervalKm: 60_000, intervalMonths: 60 },
  { id: "balata", title: "Balata kontrolü", region: "fren", matchKeyword: "balata", intervalKm: 20_000, intervalMonths: 24 },
  { id: "fren-hidrolik", title: "Fren hidroliği değişimi", region: "fren", matchKeyword: "fren hidroliği", intervalKm: 40_000, intervalMonths: 24 },
  { id: "amortisor", title: "Amortisör kontrolü", region: "amortisor", matchKeyword: "amortisör", intervalKm: 40_000, intervalMonths: 48 },
  { id: "rot-balans", title: "Rot balans ayarı", region: "amortisor", matchKeyword: "rot balans", intervalKm: 10_000, intervalMonths: 12 },
];
