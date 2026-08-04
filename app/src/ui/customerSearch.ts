import { api, type ApiCustomerSummary } from "../api/client";

/** "Müşteriler" sekmesi: müşteri ID/ad/plaka ile arama + tıklanabilir sonuç listesi. */
export function initCustomerSearch(opts: {
  isOnline: () => boolean;
  onSelect: (customerId: string) => void;
}): { refresh: () => void } {
  const input = document.getElementById("customer-search-input") as HTMLInputElement;
  const listEl = document.getElementById("customer-list")!;
  const countEl = document.getElementById("customer-count")!;

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  // Ağ gecikmesi isteklerin dönüş sırasını bozabilir (örn. "00" sorgusu "007"den sonra
  // dönebilir) — yalnızca en son gönderilen isteğin sonucu ekrana yazılsın diye sayaç.
  let latestRequest = 0;

  function renderResults(results: ApiCustomerSummary[]): void {
    countEl.textContent = `${results.length} müşteri`;
    listEl.innerHTML = "";
    if (results.length === 0) {
      listEl.innerHTML = `<div class="customer-empty">Sonuç bulunamadı.</div>`;
      return;
    }
    for (const c of results) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "customer-row";
      row.innerHTML =
        `<span class="avatar">${c.owner.charAt(0)}</span>` +
        `<span class="cr-body">` +
        `<span class="cr-top"><span class="cr-name">${c.owner}</span><span class="cr-id">${c.customerId}</span></span>` +
        `<span class="cr-sub"><span class="plate">${c.plate}</span><span>${c.model}</span>` +
        `<span>${c.km.toLocaleString("tr-TR")} km</span></span>` +
        `</span>`;
      row.addEventListener("click", () => opts.onSelect(c.customerId));
      listEl.appendChild(row);
    }
  }

  async function search(q: string): Promise<void> {
    const requestId = ++latestRequest;
    if (!opts.isOnline()) {
      countEl.textContent = "";
      listEl.innerHTML = `<div class="customer-empty">Müşteri listesi backend bağlantısı gerektirir — şu an çevrimdışı.</div>`;
      return;
    }
    try {
      const results = await api.searchCustomers(q);
      if (requestId !== latestRequest) return; // daha yeni bir arama başladı — bu yanıt eskidi
      renderResults(results);
    } catch {
      if (requestId !== latestRequest) return;
      countEl.textContent = "";
      listEl.innerHTML = `<div class="customer-empty">Müşteri listesi alınamadı.</div>`;
    }
  }

  input.addEventListener("input", () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void search(input.value), 150);
  });

  void search("");
  return { refresh: () => void search(input.value) };
}
