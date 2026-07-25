import type { RegionId } from "../scene/carWireframe";
import { MAINTENANCE_RULES } from "../data/maintenanceRules";

/** store.ServiceRecord'un yapısal alt kümesi — döngüsel içe aktarımdan kaçınmak için. */
export interface HistoryRecord {
  dateIso: string;
  km: number;
  items: { title: string }[];
}

export type ReminderStatus = "guncel" | "yaklasiyor" | "gecikti" | "bilinmiyor";

export interface Reminder {
  id: string;
  title: string;
  region: RegionId | null;
  status: ReminderStatus;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastKm: number | null;
  lastDate: string | null;
  dueKm: number | null;
  dueDate: string | null;
  remainingKm: number | null;
  remainingDays: number | null;
}

const SEVERITY: Record<ReminderStatus, number> = {
  gecikti: 3, yaklasiyor: 2, guncel: 1, bilinmiyor: 0,
};

function kmStatus(remainingKm: number | null): ReminderStatus | null {
  if (remainingKm == null) return null;
  if (remainingKm <= 0) return "gecikti";
  if (remainingKm <= 1000) return "yaklasiyor";
  return "guncel";
}

function dateStatus(remainingDays: number | null): ReminderStatus | null {
  if (remainingDays == null) return null;
  if (remainingDays <= 0) return "gecikti";
  if (remainingDays <= 30) return "yaklasiyor";
  return "guncel";
}

function combineStatus(remainingKm: number | null, remainingDays: number | null): ReminderStatus {
  const candidates = [kmStatus(remainingKm), dateStatus(remainingDays)].filter(
    (s): s is ReminderStatus => s !== null,
  );
  if (candidates.length === 0) return "bilinmiyor";
  return candidates.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a));
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const MS_PER_DAY = 86_400_000;
  const from = new Date(fromIso + "T00:00:00").getTime();
  const to = new Date(toIso + "T00:00:00").getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

/**
 * Backend'in Repository.reminders() ile birebir aynı mantık: her kural için
 * servis geçmişindeki (yeniden eskiye sıralı) en yeni eşleşen kalem baseline olur.
 * Bu, backend çevrimdışıyken tarayıcıda kullanılır.
 */
export function computeReminders(
  history: readonly HistoryRecord[],
  currentKm: number,
  today: string = new Date().toISOString().slice(0, 10),
): Reminder[] {
  return MAINTENANCE_RULES.map((rule) => {
    let match: { rec: HistoryRecord } | null = null;
    for (const rec of history) {
      if (rec.items.some((it) => it.title.toLowerCase().includes(rule.matchKeyword.toLowerCase()))) {
        match = { rec };
        break; // history yeniden eskiye sıralı — ilk eşleşme en yenisi
      }
    }

    if (!match) {
      return {
        id: rule.id, title: rule.title, region: rule.region, status: "bilinmiyor",
        intervalKm: rule.intervalKm, intervalMonths: rule.intervalMonths,
        lastKm: null, lastDate: null, dueKm: null, dueDate: null,
        remainingKm: null, remainingDays: null,
      };
    }

    const { rec } = match;
    const dueKm = rule.intervalKm != null ? rec.km + rule.intervalKm : null;
    const dueDate = rule.intervalMonths != null ? addMonths(rec.dateIso, rule.intervalMonths) : null;
    const remainingKm = dueKm != null ? dueKm - currentKm : null;
    const remainingDays = dueDate != null ? daysBetween(today, dueDate) : null;

    return {
      id: rule.id, title: rule.title, region: rule.region,
      status: combineStatus(remainingKm, remainingDays),
      intervalKm: rule.intervalKm, intervalMonths: rule.intervalMonths,
      lastKm: rec.km, lastDate: rec.dateIso, dueKm, dueDate,
      remainingKm, remainingDays,
    };
  });
}

/** Bölgeye göre en acil hatırlatma yoksa null. Servis paneli/müşteri kartlarında sıralama için. */
export function sortBySeverity(reminders: readonly Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status]);
}
