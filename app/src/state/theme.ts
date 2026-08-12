export type Theme = "light" | "dark";

const STORAGE_KEY = "automob_theme";

function apply(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme === "dark");
  window.dispatchEvent(new CustomEvent("automob-theme-change", { detail: { theme } }));
}

export const theme = {
  /** Sayfa açılışında en erken çağrılmalı (flaş önlemek için main.ts importundan önce). */
  init(): Theme {
    const stored = typeof localStorage !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Theme | null) : null;
    const current: Theme = stored === "light" ? "light" : "dark";
    apply(current);
    return current;
  },

  current(): Theme {
    if (typeof document === "undefined") return "dark";
    const attr = document.documentElement.getAttribute("data-theme") || document.body.getAttribute("data-theme");
    if (attr) return attr === "light" ? "light" : "dark";
    return document.documentElement.classList.contains("theme-light") ? "light" : "dark";
  },

  toggle(): Theme {
    const next: Theme = this.current() === "light" ? "dark" : "light";
    apply(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
    return next;
  },
};

// Modül import edilir edilmez uygulanır
theme.init();
