import type { Reminder } from "../domain/reminders";
import { STATUS_LABEL, remainingText } from "./reminderFormat";
import { sortBySeverity } from "../domain/reminders";

/**
 * Hatırlatma listesini `<ul>` içine render eder. `onRowClick` verilirse (ve bölgesi
 * varsa) satıra tıklamak o bölge için katalog modalını açmaya yarar — usta için
 * "hatırlatmayı gör → hemen işleme dök" kısayolu.
 */
export function renderReminderList(
  ul: HTMLElement,
  reminders: readonly Reminder[],
  opts: { limit?: number; onRowClick?: (regionId: string) => void } = {},
): void {
  const list = opts.limit ? sortBySeverity(reminders).slice(0, opts.limit) : reminders;
  ul.innerHTML = "";
  for (const r of list) {
    const li = document.createElement("li");
    li.className = `reminder-row status-${r.status}`;
    const clickable = !!(opts.onRowClick && r.region);
    if (clickable) li.classList.add("clickable");

    li.innerHTML =
      `<div class="top-line">` +
      `<span class="dot"></span>` +
      `<span class="rname">${r.title}</span>` +
      `<span class="chip">${STATUS_LABEL[r.status]}</span>` +
      `</div>` +
      `<span class="rrem">${remainingText(r)}</span>`;

    if (clickable) {
      li.addEventListener("click", () => opts.onRowClick!(r.region!));
    }
    ul.appendChild(li);
  }
  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "reminder-row static";
    li.textContent = "Takip edilen bakım kalemi yok.";
    ul.appendChild(li);
  }
}
