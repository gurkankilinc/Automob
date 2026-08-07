// Tema, ilk boyamadan önce uygulanmalı (flaş önlemek için en üstte)
import { theme } from "./state/theme";

// Yazı tipleri — projeye gömülü (@fontsource), çalışma anında dış bağımlılık yok
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/exo-2/400.css";
import "@fontsource/exo-2/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "./style.css";
import "./styles/auth.css";

import { AutomobScene, type ViewName } from "./scene/AutomobScene";
import type { BodyType, RegionId, OpenablePart } from "./scene/carWireframe";
import { BODY_CONFIGS, ALL_REGION_IDS } from "./scene/carWireframe";
import { demoVehicle } from "./data/demoVehicle";
import { service } from "./data/service";
import { CATALOG, REGION_LABELS, type CatalogItem } from "./data/catalog";
import { store } from "./state/store";
import { auth } from "./state/auth";
import type { RegionMode } from "./scene/regions";
import { computeReminders, type Reminder } from "./domain/reminders";
import { api, ApiHttpError, type ApiReminder } from "./api/client";
import { initServicePanel } from "./ui/servicePanel";
import { initCustomerView } from "./ui/customerView";
import { initCustomerSearch } from "./ui/customerSearch";
import { initPanelDiagram } from "./ui/panelDiagram";
import { PANEL_STATE_ORDER, PANEL_STATE_LABEL } from "./data/bodyPanels";
import type { PanelState } from "./data/bodyPanels";
import { openCatalog } from "./ui/catalogModal";
import { openReport, type ReportData } from "./ui/report";
import { showToast } from "./ui/toast";
import { initLoginStage, setAuthBusy, playLaunch } from "./ui/loginStage";
import { runSplash } from "./ui/splash";
import { initChrome, syncTabIndicator } from "./ui/chrome";

let apiOnline = false;
let started = false;

const ROLE_LABEL: Record<string, string> = { isletme: "İşletme", musteri: "Müşteri" };

// ---------- Giriş ekranı ----------

function showLogin(): void {
  document.getElementById("login-screen")!.classList.remove("hidden");
  document.getElementById("app-root")!.classList.add("hidden");
}

function showApp(): void {
  document.getElementById("login-screen")!.classList.add("hidden");
  const root = document.getElementById("app-root")!;
  root.classList.remove("hidden");
  root.classList.add("entering");
  const user = auth.user!;
  document.getElementById("user-name")!.textContent = user.name;
  document.getElementById("user-role")!.textContent = ROLE_LABEL[user.role] ?? user.role;
}

/**
 * Panele geçiş. Ağır kurulum (3B sahne + ilk veri çekimi) açılış ekranının
 * arkasında koşar, böylece yarım kurulmuş panel görünmez.
 */
async function enterApp(): Promise<void> {
  showApp();
  initChrome();
  if (started) return;
  started = true;
  await runSplash(() => start());
}

function setLoginError(msg: string | null): void {
  const el = document.getElementById("login-error")!;
  el.hidden = !msg;
  el.textContent = msg ?? "";
  if (!msg) return;
  el.classList.remove("shake");
  void el.offsetWidth; // reflow — aynı hata tekrarlansa da animasyon yeniden oynasın
  el.classList.add("shake");
}

async function attemptLogin(email: string, password: string): Promise<void> {
  const btn = document.getElementById("login-submit") as HTMLButtonElement;
  btn.disabled = true;
  setAuthBusy(true);
  setLoginError(null);

  try {
    await auth.login(email, password);
  } catch (e) {
    // Yalnızca kimlik doğrulama hataları buraya düşsün; panel kurulumundaki bir
    // hata "şifre yanlış" diye raporlanmasın.
    setLoginError(
      e instanceof ApiHttpError
        ? "E-posta veya şifre hatalı."
        : "Sunucuya ulaşılamıyor. Backend'in çalıştığından emin olun.",
    );
    btn.disabled = false;
    setAuthBusy(false);
    return;
  }

  await playLaunch();
  await enterApp();
  setAuthBusy(false);
  btn.disabled = false;
}

function initLoginScreen(): void {
  initLoginStage();

  document.getElementById("login-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (document.getElementById("login-email") as HTMLInputElement).value.trim();
    const password = (document.getElementById("login-password") as HTMLInputElement).value;
    void attemptLogin(email, password);
  });

  const demoCreds: Record<string, [string, string]> = {
    isletme: ["servis@ustamotors.com", "servis123"],
    musteri: ["musteri@example.com", "musteri123"],
  };
  for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-demo]")) {
    btn.addEventListener("click", () => {
      const [email, password] = demoCreds[btn.dataset.demo!];
      (document.getElementById("login-email") as HTMLInputElement).value = email;
      (document.getElementById("login-password") as HTMLInputElement).value = password;
      void attemptLogin(email, password);
    });
  }

  document.getElementById("logout-btn")!.addEventListener("click", () => {
    auth.logout();
    location.reload();
  });

  // Hem giriş ekranındaki hem header'daki tema düğmesi — ikisi de her zaman DOM'da var
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".theme-toggle")) {
    btn.addEventListener("click", () => theme.toggle());
  }
}

// ---------- Backend veri yükleme ----------

/** Bir aracın dosyasını (veri + geçmiş + kaporta) backend'den çekip yerel duruma yazar. */
async function loadVehicleByPlate(plate: string): Promise<boolean> {
  if (!apiOnline) return false;
  try {
    const [veh, recs, panels] = await Promise.all([
      api.getVehicle(plate),
      api.getRecords(plate),
      api.getPanels(plate),
    ]);
    Object.assign(demoVehicle, veh);
    store.replacePanelStatus(panels.map((p) => ({
      panelId: p.panelId,
      state: p.state as PanelState,
      note: p.note ?? undefined,
    })));
    store.history.splice(0, store.history.length, ...recs.map((r) => ({
      date: r.date,
      dateIso: r.dateIso,
      km: r.km,
      items: r.items.map((it) => ({
        region: it.region as RegionId | null,
        title: it.title,
        price: it.price,
        photos: it.photos ?? undefined,
      })),
    })));
    return true;
  } catch (e) {
    console.warn("Araç verisi alınamadı:", e);
    return false;
  }
}

/** Açılışta backend'den statik yapılandırmayı (servis, katalog) ve ilk aracı yükler. */
async function bootstrap(): Promise<void> {
  apiOnline = await api.ping();
  setBadge(apiOnline);
  if (!apiOnline) return;
  try {
    const [svc, cat] = await Promise.all([api.getService(), api.getCatalog()]);
    Object.assign(service, svc);
    for (const [region, items] of Object.entries(cat.regions)) {
      (CATALOG as Record<string, CatalogItem[]>)[region] = items.map((i) => ({
        title: i.title,
        price: i.price,
        group: i.group as CatalogItem["group"],
      }));
    }
    Object.assign(REGION_LABELS, cat.regionLabels);
  } catch (e) {
    apiOnline = false;
    setBadge(false);
    console.warn("Backend verisi alınamadı, yerel tohuma dönüldü:", e);
    return;
  }
  if (!(await loadVehicleByPlate(demoVehicle.plate))) {
    apiOnline = false;
    setBadge(false);
  }
}

function setBadge(online: boolean): void {
  const b = document.getElementById("api-badge")!;
  b.classList.toggle("online", online);
  b.classList.toggle("offline", !online);
  b.querySelector(".api-text")!.textContent = online ? "API bağlı" : "çevrimdışı";
}

function mapApiReminder(r: ApiReminder): Reminder {
  return {
    id: r.id, title: r.title, region: r.region as RegionId | null, status: r.status,
    intervalKm: r.intervalKm, intervalMonths: r.intervalMonths,
    lastKm: r.lastKm, lastDate: r.lastDate, dueKm: r.dueKm, dueDate: r.dueDate,
    remainingKm: r.remainingKm, remainingDays: r.remainingDays,
  };
}

/**
 * Bakım hatırlatmalarını tazeler: backend açıksa oradan (tek doğruluk kaynağı),
 * kapalıysa store.history + demoVehicle.km üzerinden yerel olarak hesaplar
 * (aynı kural seti — bkz. data/maintenanceRules.ts).
 */
async function refreshReminders(): Promise<void> {
  if (apiOnline) {
    try {
      const list = await api.getReminders(demoVehicle.plate);
      store.setReminders(list.map(mapApiReminder));
      return;
    } catch (e) {
      console.warn("Hatırlatmalar API'den alınamadı, yerel hesaba dönüldü:", e);
    }
  }
  store.setReminders(computeReminders(store.history, demoVehicle.km));
}

// ---------- Uygulama ----------

async function start(): Promise<void> {
  await bootstrap();

  // Derin bağlantı: ?body=sedan|hatchback|suv (API'yi elle geçersiz kılar, test için)
  const bodyParam = new URLSearchParams(location.search).get("body");
  if (bodyParam && bodyParam in BODY_CONFIGS) demoVehicle.bodyType = bodyParam as BodyType;

  await refreshReminders();

  // ---------- Sahne ----------
  const viewport = document.getElementById("viewport")!;
  const gl = document.getElementById("gl") as HTMLCanvasElement;
  const overlay = document.getElementById("overlay") as HTMLCanvasElement;
  const scene = new AutomobScene(viewport, gl, overlay, demoVehicle.bodyType);
  // Geliştirme derlemesinde sahneyi konsoldan incelenebilir yap (hata ayıklama).
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__scene = scene;

  // Kullanıcının elle gizlediği bölgeler (veri durumundan bağımsız görünürlük)
  const hidden = new Set<RegionId>();

  function syncScene(): void {
    for (const id of ALL_REGION_IDS) {
      const mode = hidden.has(id) ? "off" : store.regionMode(id);
      scene.setRegionMode(id, mode);
      const first = store.cart.find((i) => i.region === id);
      scene.setLabelText(
        id,
        first
          ? first.kind === "oneri"
            ? `${first.title} — önerildi`
            : `${first.title} · ${demoVehicle.km.toLocaleString("tr-TR")} km`
          : REGION_LABELS[id],
      );
    }
    const done = store.cart.filter((i) => i.kind === "islem").length;
    const suggest = store.cart.filter((i) => i.kind === "oneri").length;
    document.getElementById("op-summary")!.textContent = `${done} işlem · ${suggest} öneri`;
  }

  function toggleRegion(id: RegionId): void {
    if (hidden.has(id)) hidden.delete(id);
    else if (store.regionMode(id) !== "off") hidden.add(id);
    syncScene();
  }

  scene.onRegionClicked = toggleRegion;
  for (const el of document.querySelectorAll<HTMLButtonElement>(".colabel")) {
    el.addEventListener("click", () => toggleRegion(el.dataset.region as RegionId));
  }

  // Otomatik vurgulama: bir bölgeye kalem eklenince görünür yap + kamerayı oraya uçur
  store.onAdd((region) => {
    hidden.delete(region);
    scene.flyToRegion(region); // motor bölgesi ise kaputu da açar
    syncPartButtons();
  });

  // ---------- Üst bar: kimlik + kasa tipi ----------
  const metaEl = document.getElementById("car-meta")!;
  function renderMeta(body: BodyType): void {
    metaEl.textContent =
      `${demoVehicle.model} · ${BODY_CONFIGS[body].label} · ${demoVehicle.km.toLocaleString("tr-TR")} km`;
  }
  document.getElementById("plate")!.textContent = demoVehicle.plate;
  renderMeta(demoVehicle.bodyType);

  const bodySeg = [...document.querySelectorAll<HTMLButtonElement>("#body-seg button")];
  function setActiveBody(body: BodyType): void {
    for (const b of bodySeg) b.classList.toggle("active", b.dataset.body === body);
  }
  setActiveBody(demoVehicle.bodyType);
  for (const b of bodySeg) {
    b.addEventListener("click", () => {
      const body = b.dataset.body as BodyType;
      demoVehicle.bodyType = body;
      scene.setBodyType(body);
      syncScene();
      renderMeta(body);
      setActiveBody(body);
    });
  }

  // ---------- Açılır parçalar (kaput / kapılar / bagaj) ----------
  // Sahnede sol tık ile de açılır; buradaki düğmeler hem kısayol hem de
  // "hangi parça açık" göstergesi olarak çalışır.
  const PART_SHORT: Record<OpenablePart, string> = {
    hood: "Kaput", doorFL: "Sol Ön", doorFR: "Sağ Ön",
    doorRL: "Sol Arka", doorRR: "Sağ Arka", trunk: "Bagaj",
  };
  const PART_ORDER: OpenablePart[] = ["hood", "doorFL", "doorFR", "doorRL", "doorRR", "trunk"];
  const partsBtnWrap = document.getElementById("parts-btns")!;
  const partsAllBtn = document.getElementById("parts-all") as HTMLButtonElement;
  const partBtns = new Map<OpenablePart, HTMLButtonElement>();
  for (const id of PART_ORDER) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = PART_SHORT[id];
    b.addEventListener("click", () => {
      scene.togglePart(id);
      syncPartButtons();
    });
    partsBtnWrap.appendChild(b);
    partBtns.set(id, b);
  }
  function syncPartButtons(): void {
    let anyOpen = false;
    for (const [id, b] of partBtns) {
      const open = scene.isPartOpen(id);
      if (open) anyOpen = true;
      b.classList.toggle("open", open);
      b.setAttribute("aria-pressed", open ? "true" : "false");
      b.title = `${PART_SHORT[id]} — ${open ? "açık (kapatmak için tıkla)" : "kapalı (açmak için tıkla)"}`;
    }
    partsAllBtn.textContent = anyOpen ? "Tümünü kapat" : "Tümünü aç";
  }
  partsAllBtn.addEventListener("click", () => {
    const anyOpen = PART_ORDER.some((id) => scene.isPartOpen(id));
    scene.setAllParts(!anyOpen);
    syncPartButtons();
  });
  scene.onPartToggled = () => syncPartButtons();
  syncPartButtons();

  // ---------- Kamera ön ayarları ----------
  const camButtons = [...document.querySelectorAll<HTMLButtonElement>(".cam")];
  function setActiveCam(name: string | null): void {
    for (const b of camButtons) b.classList.toggle("active", b.dataset.view === name);
  }
  for (const b of camButtons) {
    b.addEventListener("click", () => {
      scene.setView(b.dataset.view as ViewName);
      setActiveCam(b.dataset.view!);
      syncPartButtons(); // "Motor Bölmesi" görünümü kaputu otomatik açar
    });
  }
  scene.onViewInterrupted = () => setActiveCam("orbit");

  // ---------- Görünümler (sekme + hash) ----------
  const isMusteri = auth.user?.role === "musteri";
  type Tab = "servis" | "musteriler" | "musteri" | "kaporta";
  const tabButtons = [...document.querySelectorAll<HTMLButtonElement>(".tab")];
  if (isMusteri) {
    document.querySelector('.tab[data-tab="servis"]')!.classList.add("hidden");
    document.querySelector('.tab[data-tab="musteriler"]')!.classList.add("hidden");
  }

  function parseTab(hash: string): Tab {
    if (hash === "#kaporta") return "kaporta";
    if (hash === "#musteri") return "musteri";
    if (hash === "#musteriler") return "musteriler";
    return "servis";
  }

  function switchTab(tab: Tab): void {
    const effective: Tab = isMusteri && (tab === "servis" || tab === "musteriler") ? "musteri" : tab;
    for (const b of tabButtons) b.classList.toggle("active", b.dataset.tab === effective);
    syncTabIndicator();
    document.getElementById("view-servis")!.classList.toggle("hidden", effective !== "servis");
    document.getElementById("view-musteriler")!.classList.toggle("hidden", effective !== "musteriler");
    document.getElementById("view-musteri")!.classList.toggle("hidden", effective !== "musteri");
    document.getElementById("view-kaporta")!.classList.toggle("hidden", effective !== "kaporta");
    if (effective === "servis" || effective === "musteri" || effective === "kaporta") {
      const slotId = effective === "servis" ? "slot-servis" : effective === "musteri" ? "slot-musteri" : "slot-kaporta";
      const slot = document.getElementById(slotId)!;
      slot.appendChild(viewport); // tek sahne örneği görünümler arasında taşınır
      viewport.classList.remove("viewport-detached");
    }
    if (location.hash !== `#${effective}`) history.replaceState(null, "", `#${effective}`);
  }

  for (const b of tabButtons) {
    b.addEventListener("click", () => switchTab(b.dataset.tab as Tab));
  }
  window.addEventListener("hashchange", () => switchTab(parseTab(location.hash)));

  // ---------- Rapor ----------
  let lastReport: ReportData | null = null;

  function buildReportData(): ReportData {
    const done = store.cart.filter((i) => i.kind === "islem");
    const suggest = store.cart.filter((i) => i.kind === "oneri");
    const modes = new Map<RegionId, RegionMode>();
    for (const i of suggest) modes.set(i.region, "suggest");
    for (const i of done) modes.set(i.region, "done"); // işlem, öneriyi ezer
    return {
      serviceName: service.name,
      date: new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }),
      km: demoVehicle.km,
      plate: demoVehicle.plate,
      model: demoVehicle.model,
      bodyLabel: BODY_CONFIGS[demoVehicle.bodyType].label,
      snapshot: scene.captureReport(modes),
      operations: done.map((i) => ({ title: i.title, price: i.price, photos: i.photos })),
      suggestions: suggest.map((i) => ({ title: i.title, price: i.price, photos: i.photos })),
      total: store.totalDone(),
    };
  }

  async function saveAndReport(): Promise<void> {
    const done = store.cart.filter((i) => i.kind === "islem");
    const data = buildReportData(); // kayıttan önce (fotoğraflı işlemler sepette)
    const record = store.save(demoVehicle.km);
    if (!record) return;
    lastReport = data;
    openReport(data);
    if (apiOnline) {
      try {
        await api.createRecord(demoVehicle.plate, {
          km: demoVehicle.km,
          items: done.map((i) => ({ region: i.region, title: i.title, price: i.price, photos: i.photos ?? null })),
        });
        showToast("Servis kaydı backend'e işlendi.");
      } catch {
        showToast("Backend'e yazılamadı — yerel kayıt tutuldu.");
      }
    }
    await refreshReminders();
  }

  document.getElementById("report-btn")!.addEventListener("click", () => {
    openReport(lastReport ?? buildReportData());
  });

  // ---------- Paneller ----------
  initServicePanel({
    onRegionRowClick: toggleRegion,
    onCartChanged: syncScene,
    onSaveAndReport: saveAndReport,
  });
  initCustomerView({
    onTimelineRegionClick: (id) => {
      hidden.delete(id);
      syncScene();
      scene.flyToRegion(id);
      syncPartButtons();
    },
  });

  // ---------- Müşteriler (arama) — yalnızca işletme rolü ----------
  // Bir müşteri seçilince tüm panolar (3D şema, servis geçmişi, kaporta durumu,
  // hatırlatmalar) o müşterinin aracına geçer; önceki müşterinin devam eden
  // sepeti (henüz kaydedilmemiş işlem/öneri) yeni müşteriye taşınmasın diye temizlenir.
  async function switchToCustomer(customerId: string): Promise<void> {
    if (!apiOnline) {
      showToast("Müşteri seçimi için backend bağlantısı gerekli.");
      return;
    }
    let plate: string;
    try {
      plate = (await api.getCustomerVehicle(customerId)).plate;
    } catch {
      showToast("Müşteri bilgisi alınamadı.");
      return;
    }
    store.cart = [];
    hidden.clear();
    scene.setAllParts(false);
    syncPartButtons();
    if (!(await loadVehicleByPlate(plate))) {
      showToast("Araç verisi yüklenemedi.");
      return;
    }
    scene.setBodyType(demoVehicle.bodyType);
    setActiveBody(demoVehicle.bodyType);
    renderMeta(demoVehicle.bodyType);
    document.getElementById("plate")!.textContent = demoVehicle.plate;
    await refreshReminders();
    syncScene();
    switchTab("servis");
    showToast(`${demoVehicle.owner} yüklendi — ${demoVehicle.plate}`);
  }

  if (!isMusteri) {
    initCustomerSearch({
      isOnline: () => apiOnline,
      onSelect: (customerId) => void switchToCustomer(customerId),
    });
  }

  const legendEl = document.getElementById("panel-legend")!;
  legendEl.innerHTML = PANEL_STATE_ORDER.map((s: PanelState) => {
    const color = { "orijinal": "var(--panel-orijinal)", "lokal-boyali": "var(--panel-lokal)", "boyali": "var(--panel-boyali)", "degisen": "var(--panel-degisen)" }[s];
    return `<span class="panel-legend-item"><span class="sw" style="background:${color}"></span>${PANEL_STATE_LABEL[s]}</span>`;
  }).join("");
  document.getElementById("panel-hint")!.textContent = isMusteri ? "görüntüleme" : "tıkla / durum seç";
  initPanelDiagram({
    svgContainer: document.getElementById("panel-svg-wrap")!,
    listContainer: document.getElementById("panel-list")!,
    canEdit: !isMusteri,
    // İyimser güncelleme: arayüz anında değişir, yazma arka planda gider.
    // Hata olursa sunucudaki gerçek durumu geri yükleyip kullanıcıyı uyarırız.
    onChange: (panelId, state, note) => {
      if (!apiOnline) {
        showToast("Çevrimdışı — kaporta durumu yalnızca bu oturumda saklandı.");
        return;
      }
      void api.setPanel(demoVehicle.plate, panelId, { state, note })
        .catch(async (err) => {
          console.warn("Kaporta durumu kaydedilemedi:", err);
          showToast("Kaporta durumu kaydedilemedi — sunucudaki hâline dönüldü.");
          try {
            const fresh = await api.getPanels(demoVehicle.plate);
            store.replacePanelStatus(fresh.map((p) => ({
              panelId: p.panelId, state: p.state as PanelState, note: p.note ?? undefined,
            })));
          } catch { /* sunucuya hiç ulaşılamıyor — yerel durum kalsın */ }
        });
    },
  });

  store.subscribe(() => {
    scene.setPanelStateColors(store.panelStatus);
  });
  scene.setPanelStateColors(store.panelStatus);

  switchTab(parseTab(location.hash));
  syncScene();

  // Derin bağlantı: ?catalog=motor|fren|amortisor ile kalem ekleme penceresini aç
  const catParam = new URLSearchParams(location.search).get("catalog");
  if (catParam === "motor" || catParam === "fren" || catParam === "amortisor") {
    openCatalog(catParam);
  }
  // Derin bağlantı: ?report ile mevcut durumdan raporu aç
  if (new URLSearchParams(location.search).has("report")) {
    openReport(buildReportData());
  }

  // Geliştirme kolaylığı: ?open=hood,doorFL ve ?view=motorBay ile sahneyi hazırla
  // (yalnızca dev derlemesinde — görsel doğrulama/demo için).
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search);
    const open = q.get("open");
    if (open) {
      for (const id of open.split(",")) {
        if (PART_ORDER.includes(id as OpenablePart)) scene.setPartOpen(id as OpenablePart, true);
      }
      syncPartButtons();
    }
    const view = q.get("view");
    if (view) {
      scene.setView(view as ViewName);
      setActiveCam(view);
      syncPartButtons();
    }
  }
}

// ---------- Giriş ----------

async function boot(): Promise<void> {
  initLoginScreen();
  let authed = await auth.restore();

  // Geliştirme kolaylığı: ?demo=isletme|musteri ile demo hesabına otomatik giriş.
  // Yalnızca dev derlemesinde çalışır — üretim paketine dahil edilmez.
  if (!authed && import.meta.env.DEV) {
    const demo = new URLSearchParams(location.search).get("demo");
    const creds: Record<string, [string, string]> = {
      isletme: ["servis@ustamotors.com", "servis123"],
      musteri: ["musteri@example.com", "musteri123"],
    };
    if (demo && creds[demo]) {
      try {
        await auth.login(creds[demo][0], creds[demo][1]);
        authed = true;
      } catch { /* backend kapalı olabilir — normal giriş ekranına düş */ }
    }
  }

  if (authed) {
    await enterApp();
  } else {
    showLogin();
  }
}

void boot();
