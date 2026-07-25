/** Automob backend (Kotlin/Ktor) istemcisi. Backend kapalıysa çağıran taraf yerel tohuma düşer. */

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8080/api";
/** /uploads gibi /api dışındaki statik yollar için kök adres (http://localhost:8080) */
const ORIGIN = BASE.replace(/\/api\/?$/, "");

export interface ApiService {
  name: string;
  tagline: string;
  phone: string;
}

export interface ApiVehicle {
  plate: string;
  model: string;
  year: number;
  vin: string;
  bodyType: "sedan" | "hatchback" | "suv";
  km: number;
  nextServiceKm: number;
  lastServiceKm: number;
  owner: string;
  phone: string;
}

export interface ApiCatalogItem {
  title: string;
  price: number;
  group: "paket" | "parca" | "iscilik";
}

export interface ApiCatalog {
  regions: Record<string, ApiCatalogItem[]>;
  regionLabels: Record<string, string>;
}

export interface ApiRecordItem {
  region: string | null;
  title: string;
  price: number | null;
  photos?: string[] | null;
}

export interface ApiRecord {
  id: number;
  date: string;
  dateIso: string;
  km: number;
  items: ApiRecordItem[];
}

export type ApiReminderStatus = "guncel" | "yaklasiyor" | "gecikti" | "bilinmiyor";

export interface ApiReminder {
  id: string;
  title: string;
  region: string | null;
  status: ApiReminderStatus;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastKm: number | null;
  lastDate: string | null;
  dueKm: number | null;
  dueDate: string | null;
  remainingKm: number | null;
  remainingDays: number | null;
}

export type ApiPanelState = "orijinal" | "lokal-boyali" | "boyali" | "degisen";

export interface ApiPanelStatus {
  panelId: string;
  state: ApiPanelState;
  note: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export type ApiUserRole = "isletme" | "musteri";

export interface ApiLoginResponse {
  token: string;
  email: string;
  role: ApiUserRole;
  name: string;
}

export interface ApiMeResponse {
  email: string;
  role: ApiUserRole;
  name: string;
}

/** Backend'e ulaşıldı ama hata döndü (4xx/5xx) — network hatasından ayırt etmek için. */
export class ApiHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let token: string | null = null;

async function j<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiHttpError(res.status, body?.error ?? `API ${res.status} @ ${path}`);
  }
  return (await res.json()) as T;
}

export const api = {
  base: BASE,

  setToken(t: string | null): void {
    token = t;
  },

  async ping(timeoutMs = 1500): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(BASE + "/health", { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  },

  login: (email: string, password: string) =>
    j<ApiLoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => j<ApiMeResponse>("/auth/me"),

  getService: () => j<ApiService>("/service"),
  getCatalog: () => j<ApiCatalog>("/catalog"),
  getVehicle: (plate: string) => j<ApiVehicle>(`/vehicles/${encodeURIComponent(plate)}`),
  getRecords: (plate: string) => j<ApiRecord[]>(`/vehicles/${encodeURIComponent(plate)}/records`),
  getReminders: (plate: string) => j<ApiReminder[]>(`/vehicles/${encodeURIComponent(plate)}/reminders`),

  createRecord: (plate: string, body: { km: number; items: ApiRecordItem[] }) =>
    j<ApiRecord>(`/vehicles/${encodeURIComponent(plate)}/records`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getPanels: (plate: string) => j<ApiPanelStatus[]>(`/vehicles/${encodeURIComponent(plate)}/panels`),

  setPanel: (plate: string, panelId: string, body: { state: ApiPanelState; note?: string }) =>
    j<ApiPanelStatus>(`/vehicles/${encodeURIComponent(plate)}/panels/${encodeURIComponent(panelId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  /** Fotoğrafları yükler, tarayıcıda doğrudan kullanılabilir mutlak URL'ler döner. */
  async uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(BASE + "/uploads", { method: "POST", headers, body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new ApiHttpError(res.status, body?.error ?? `Yükleme başarısız (${res.status})`);
      }
      const data = (await res.json()) as { urls: string[] };
      urls.push(...data.urls.map((u) => ORIGIN + u));
    }
    return urls;
  },
};
