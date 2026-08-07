export type Theme = "light" | "dark";

const STORAGE_KEY = "automob_theme";

function apply(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export const theme = {
  /** Sayfa açılışında en erken çağrılmalı (flaş önlemek için main.ts importundan önce). */
  init(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    // Varsayılan koyu: 3B sahne her zaman koyu olduğundan arayüzün geri kalanı da
    // aynı dilde başlasın. Açık tema kullanıcı seçerse saklanır.
    const current: Theme = stored === "light" ? "light" : "dark";
    apply(current);
    return current;
  },

  current(): Theme {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  },

  toggle(): Theme {
    const next: Theme = this.current() === "light" ? "dark" : "light";
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
    return next;
  },
};

// Modül import edilir edilmez uygulanır — ilk boyamadan önce doğru tema aktif olsun.
theme.init();
