import { api, type ApiUserRole } from "../api/client";

export interface AuthUser {
  email: string;
  role: ApiUserRole;
  name: string;
}

const STORAGE_KEY = "automob_token";

export const auth = {
  user: null as AuthUser | null,

  /** Sayfa açılışında saklı token'ı doğrular. true = oturum geçerli. */
  async restore(): Promise<boolean> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    api.setToken(stored);
    try {
      const me = await api.me();
      this.user = me;
      return true;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      api.setToken(null);
      return false;
    }
  },

  async login(email: string, password: string): Promise<void> {
    const res = await api.login(email, password);
    localStorage.setItem(STORAGE_KEY, res.token);
    api.setToken(res.token);
    this.user = { email: res.email, role: res.role, name: res.name };
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    api.setToken(null);
    this.user = null;
  },
};
