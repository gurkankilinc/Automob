import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import {
  buildCarWireframe, ALL_REGION_IDS,
  type BodyType, type RegionId, type PaintZone, type OpenablePart, type PartDef,
} from "./carWireframe";
import {
  getRegionDefs, createGlowTexture, MODE_COLOR, MODE_GLOW,
  type RegionDef, type RegionMode,
} from "./regions";
import { Callouts } from "./callouts";
import { PALETTE } from "./palette";
import { openCatalog } from "../ui/catalogModal";

export type ViewName = "yan" | "on" | "ust" | "orbit" | "motorBay";

const REGION_DIAGNOSTICS: Record<RegionId, { title: string; icon: string; desc: string }> = {
  motor: {
    title: "MOTOR & SOĞUTMA BLOKU",
    icon: "⚙️",
    desc: "Silindir kapağı, emme manifoldu ve radyatör bloğu 3B görünümü. Yağ seviyesi, triger kayışı ve soğutma suyu sıvı analizi.",
  },
  fren: {
    title: "FREN SİSTEMİ & HİDROLİK",
    icon: "🛑",
    desc: "Hava kanallı ön/arka fren diskleri, kaliper pabuçları ve fren hidroliği. Balata aşınma derinliği ve hidrolik basınç testi.",
  },
  amortisor: {
    title: "SÜSPANSİYON & YAYLAR",
    icon: "🌀",
    desc: "Ön kule takozları, arka amortisör kovanları ve helezon yaylar. Darbe sönümleme performansı ve yağ sızıntı denetimi.",
  },
  lastik: {
    title: "LASTİK & ALAŞIM JANTLAR",
    icon: "🛞",
    desc: "Performans kauçuk lastik kovanları ve hafif alaşım jantlar. Diş derinliği, hava basıncı ve rot-balans ayarı.",
  },
  elektrik: {
    title: "AKÜ & ŞARJ DEVRESİ",
    icon: "⚡",
    desc: "12V starter akü ünitesi, ana sigorta kutusu ve alternatör. Voltaj kararlılığı ve şarj kapasitesi analizi.",
  },
  egzoz: {
    title: "EGZOZ SİSTEMİ & EMİSYON",
    icon: "💨",
    desc: "Paslanmaz çelik egzoz manifold boruları, susturucu ve katalizör. Emisyon ve gaz kaçak denetimi.",
  },
  klima: {
    title: "KLİMA & İKLİMLENDİRME",
    icon: "❄️",
    desc: "R134a/R1234yf kompresör pompası, kondenser radyatörü ve polen filtresi. Soğutma verimi ve gaz devresi testi.",
  },
};

interface ViewDef {
  azimuth: number;
  polar: number;
  /** Verilmezse mevcut uzaklık korunur */
  radius?: number;
  /** Verilmezse aracın merkezi hedeflenir */
  target?: "car" | "bay";
  /** Bu görünüme geçerken kaputu otomatik aç */
  openHood?: boolean;
}

const VIEWS: Record<ViewName, ViewDef> = {
  yan: { azimuth: 0, polar: 1.51, target: "car" },
  on: { azimuth: Math.PI / 2, polar: 1.47, target: "car" },
  ust: { azimuth: -0.6, polar: 0.32, target: "car" },
  orbit: { azimuth: -0.6, polar: 1.27, target: "car" },
  // Kaput açıkken motor bölmesini üstten-önden inceleme modu
  motorBay: { azimuth: 1.02, polar: 0.76, radius: 5.6, target: "bay", openHood: true },
};

interface RegionRuntime {
  def: RegionDef;
  lines: LineSegments2;
  normalMat: LineMaterial;
  doneMat: LineMaterial;
  suggestMat: LineMaterial;
  glow: THREE.Sprite;
  hitMeshes: THREE.Mesh[];
}

interface PartRuntime {
  def: PartDef;
  group: THREE.Group;
  axis: THREE.Vector3;
  /** 0 = kapalı, 1 = tam açık (animasyonlu) */
  k: number;
  open: boolean;
}

export class AutomobScene {
  /** 3D'de bakım bölgesine tıklanınca — aç/kapat kararı dışarıda verilir. */
  onRegionClicked?: (id: RegionId) => void;
  /** Açılır parçaya (kaput/kapı/bagaj) tıklanınca — durum zaten değişmiş olur. */
  onPartToggled?: (id: OpenablePart, open: boolean) => void;
  onViewInterrupted?: () => void;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private callouts: Callouts;
  private carGroup: THREE.Group | null = null;
  private carMaterials: LineMaterial[] = [];
  private paintMaterials = new Map<PaintZone, LineMaterial[]>();
  private paintColors = new Map<PaintZone, number>();
  private regions = new Map<RegionId, RegionRuntime>();
  private partsRt = new Map<OpenablePart, PartRuntime>();
  private partHits: THREE.Mesh[] = [];
  private modes = new Map<RegionId, RegionMode>();
  private defs: RegionDef[] = [];
  private doneTex = createGlowTexture(MODE_GLOW.done);
  private suggestTex = createGlowTexture(MODE_GLOW.suggest);
  private raycaster = new THREE.Raycaster();
  private target = new THREE.Vector3(0, 0.72, 0);
  private carTarget = new THREE.Vector3(0, 0.72, 0);
  private bayTarget = new THREE.Vector3(1.6, 0.85, 0);
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private lastInteract = 0;
  private tween: {
    t0: number; dur: number;
    az0: number; pol0: number; az1: number; pol1: number;
    r0: number; r1: number;
    tg0: THREE.Vector3; tg1: THREE.Vector3;
  } | null = null;
  private downAt: { x: number; y: number } | null = null;

  private compGroups = new Map<RegionId, THREE.Group>();
  private wheelMeshGroups: THREE.Group[] = [];
  private activeInspectRegion: RegionId | null = null;
  public onInspectRegionChanged?: (id: RegionId | null) => void;
  public get activeRegion(): RegionId | null { return this.activeInspectRegion; }
  private hudCardEl: HTMLElement | null = null;
  private driveInAnim = { active: true, startTime: 0, duration: 2400, startX: -12.0 };
  private skidMesh: LineSegments2 | null = null;

  constructor(
    private container: HTMLElement,
    glCanvas: HTMLCanvasElement,
    overlayCanvas: HTMLCanvasElement,
    body: BodyType,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: glCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this.applySpherical(VIEWS.orbit.azimuth, VIEWS.orbit.polar, 7.2);

    this.controls = new OrbitControls(this.camera, glCanvas);
    this.controls.target.copy(this.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 11;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.6;
    this.controls.enablePan = false;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.addEventListener("start", () => {
      this.lastInteract = performance.now();
      this.tween = null;
      this.onViewInterrupted?.();
      glCanvas.classList.add("dragging");
    });
    this.controls.addEventListener("end", () => {
      this.lastInteract = performance.now();
      glCanvas.classList.remove("dragging");
    });

    const ambLight = new THREE.AmbientLight(0xffffff, 0.75);
    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.5);
    dirLight1.position.set(6, 12, 8);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.95);
    dirLight2.position.set(-8, 5, -8);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0f172a, 0.6);
    this.scene.add(ambLight, dirLight1, dirLight2, hemiLight);

    const grid = new THREE.GridHelper(8, 10, PALETTE.gridCenter, PALETTE.grid);
    const gm = grid.material as THREE.LineBasicMaterial;
    gm.transparent = true;
    gm.opacity = 0.55;
    this.scene.add(grid);

    // Zemin Gölge Düzlemi (Shadow Receiver)
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.01;
    shadowMesh.receiveShadow = true;
    this.scene.add(shadowMesh);

    this.callouts = new Callouts(container, overlayCanvas);
    this.initHudCard();
    this.buildCar(body);

    glCanvas.addEventListener("pointerdown", (e) => {
      this.downAt = { x: e.clientX, y: e.clientY };
    });
    glCanvas.addEventListener("pointerup", (e) => {
      if (!this.downAt) return;
      const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
      this.downAt = null;
      if (moved < 6) this.pick(e);
    });

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  // ---------- 3B Teşhis & Parça Yükseltme API ----------

  private initHudCard(): void {
    let card = this.container.querySelector<HTMLElement>(".inspect-hud-card");
    if (!card) {
      card = document.createElement("div");
      card.className = "inspect-hud-card hidden";
      card.innerHTML = `
        <div class="inspect-hud-header">
          <div class="inspect-hud-title">
            <span class="hud-icon">⚙️</span>
            <span class="hud-name">PARÇA TEŞHİSİ</span>
          </div>
          <button class="inspect-hud-close" type="button" title="Kapat">✕</button>
        </div>
        <div class="inspect-status-pill ok">● SAĞLIKLI</div>
        <div class="inspect-hud-body">Sistem teşhisi yapılıyor...</div>
        <div class="inspect-hud-actions">
          <button class="btn-cat" type="button">🛒 KATALOĞU AÇ</button>
          <button class="btn-drop" type="button">⬇ YERİNE İNDİR</button>
        </div>
      `;
      this.container.appendChild(card);

      card.querySelector(".inspect-hud-close")?.addEventListener("click", () => {
        this.inspectRegion(null);
      });
      card.querySelector(".btn-drop")?.addEventListener("click", () => {
        this.inspectRegion(null);
      });
      card.querySelector(".btn-cat")?.addEventListener("click", () => {
        if (this.activeInspectRegion) {
          openCatalog(this.activeInspectRegion);
        }
      });
    }
    this.hudCardEl = card;
  }

  public inspectRegion(id: RegionId | null): void {
    if (this.activeInspectRegion === id) {
      this.activeInspectRegion = null;
    } else {
      this.activeInspectRegion = id;
      if (id === "motor") this.setPartOpen("hood", true);
    }
    if (this.onInspectRegionChanged) this.onInspectRegionChanged(this.activeInspectRegion);
    this.updateHudCard();
  }

  public updateHudCard(): void {
    if (!this.hudCardEl) return;
    if (!this.activeInspectRegion) {
      this.hudCardEl.classList.add("hidden");
      return;
    }

    const diag = REGION_DIAGNOSTICS[this.activeInspectRegion];
    if (!diag) return;

    const iconEl = this.hudCardEl.querySelector(".hud-icon");
    const nameEl = this.hudCardEl.querySelector(".hud-name");
    const pillEl = this.hudCardEl.querySelector<HTMLElement>(".inspect-status-pill");
    const bodyEl = this.hudCardEl.querySelector(".inspect-hud-body");

    if (iconEl) iconEl.textContent = diag.icon;
    if (nameEl) nameEl.textContent = diag.title;
    if (bodyEl) bodyEl.textContent = diag.desc;

    const mode = this.getMode(this.activeInspectRegion);
    if (pillEl) {
      pillEl.className = "inspect-status-pill " + (mode === "done" ? "done" : mode === "suggest" ? "suggest" : "ok");
      pillEl.textContent = mode === "done" ? "● İŞLEM YAPILDI (DEĞİŞTİ)" : mode === "suggest" ? "⚠️ BAKIM ÖNERİLİYOR" : "✓ SİSTEM SAĞLIKLI";
    }

    this.hudCardEl.classList.remove("hidden");
  }

  private getCompGroup(id: RegionId, parentGroup: THREE.Group): THREE.Group {
    let cg = this.compGroups.get(id);
    if (!cg) {
      cg = new THREE.Group();
      const def = this.defs.find((d) => d.id === id);
      if (def) {
        cg.position.copy(def.anchor);
      }
      this.compGroups.set(id, cg);
      parentGroup.add(cg);
    }
    return cg;
  }

  // ---------- Dış API ----------

  private panelMeshes = new Map<string, THREE.Mesh>();

  public setPanelStateColors(panelStates: Record<string, { state: string }>): void {
    const COLOR_MAP: Record<string, number> = {
      degisen: 0xEF4444,     // Kırmızı
      boyali: 0xD2B48C,      // Hafif Açık Kahverengi (Tan / Light Brown)
      "lokal-boyali": 0xF59E0B, // Amber / Sarı
      orijinal: 0x475569,    // Nötr Gövde
    };

    for (const [panelId, mesh] of this.panelMeshes) {
      const info = panelStates[panelId];
      const st = info?.state ?? "orijinal";
      const hex = COLOR_MAP[st] ?? COLOR_MAP.orijinal;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(hex);
      mat.opacity = st === "orijinal" ? 0.45 : 0.88;
      mat.needsUpdate = true;
    }
  }

  getMode(id: RegionId): RegionMode {
    return this.modes.get(id) ?? "off";
  }

  setRegionMode(id: RegionId, mode: RegionMode): void {
    this.modes.set(id, mode);
    const rt = this.regions.get(id);
    if (!rt) return;
    rt.lines.material =
      mode === "done" ? rt.doneMat : mode === "suggest" ? rt.suggestMat : rt.normalMat;
    rt.glow.visible = mode !== "off";
    if (mode !== "off") {
      const m = rt.glow.material as THREE.SpriteMaterial;
      m.map = mode === "done" ? this.doneTex : this.suggestTex;
      m.opacity = 0.85;
      m.needsUpdate = true;
    }
  }

  setBodyType(body: BodyType): void {
    const savedModes = new Map(this.modes);
    const savedOpen = new Map<OpenablePart, boolean>();
    for (const [id, rt] of this.partsRt) savedOpen.set(id, rt.open);
    this.disposeCar();
    this.buildCar(body);
    for (const [id, m] of savedModes) this.setRegionMode(id, m);
    for (const [zone, color] of this.paintColors) this.applyPaintColor(zone, color);
    for (const [id, open] of savedOpen) if (open) this.setPartOpen(id, true);
    this.lastInteract = performance.now();
  }

  /** Bir kaporta bölgesinin (kaput/kapılar/bagaj/gövde) rengini değiştirir. */
  setPaintColor(zone: PaintZone, color: number): void {
    this.paintColors.set(zone, color);
    this.applyPaintColor(zone, color);
  }

  // ---- Açılır parçalar ----

  listParts(): PartDef[] {
    return [...this.partsRt.values()].map((rt) => rt.def);
  }

  isPartOpen(id: OpenablePart): boolean {
    return this.partsRt.get(id)?.open ?? false;
  }

  setPartOpen(id: OpenablePart, open: boolean): void {
    const rt = this.partsRt.get(id);
    if (!rt || rt.open === open) return;
    rt.open = open;
    this.lastInteract = performance.now();
  }

  togglePart(id: OpenablePart): boolean {
    const rt = this.partsRt.get(id);
    if (!rt) return false;
    this.setPartOpen(id, !rt.open);
    return rt.open;
  }

  setAllParts(open: boolean): void {
    for (const id of this.partsRt.keys()) this.setPartOpen(id, open);
  }

  setLabelText(id: RegionId, sub: string): void {
    this.callouts.setLabelText(id, sub);
  }

  setView(name: ViewName): void {
    const v = VIEWS[name];
    if (v.openHood) this.setPartOpen("hood", true);
    this.startTween(v);
  }

  /** Zaman çizelgesinden bölgeye kamera uçuşu. */
  flyToRegion(id: RegionId): void {
    const def = this.defs.find((d) => d.id === id);
    if (!def) return;
    // Motor bölgesi kaput altında — oraya uçarken kaputu da aç ki içi görünsün.
    if (id === "motor") this.setPartOpen("hood", true);
    this.startTween({ azimuth: def.view.azimuth, polar: def.view.polar, target: "car" });
  }

  /**
   * Rapor için sabit 3/4 açıdan anlık görüntü: verilen bölgeleri vurgulayıp
   * koyu zemini pişirir, PNG data URL döndürür, sonra sahneyi eski hâline getirir.
   */
  captureReport(modes: ReadonlyMap<RegionId, RegionMode>): string {
    const prevModes = new Map(this.modes);
    const prevPos = this.camera.position.clone();
    const prevTarget = this.target.clone();

    this.target.copy(this.carTarget);
    this.applySpherical(VIEWS.orbit.azimuth, VIEWS.orbit.polar, 7.4);
    for (const id of ALL_REGION_IDS) {
      this.setRegionMode(id, modes.get(id) ?? "off");
    }
    this.renderer.setClearColor(PALETTE.stageBg, 1);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL("image/png");

    // geri al
    this.renderer.setClearColor(0x000000, 0);
    for (const [id, m] of prevModes) this.setRegionMode(id, m);
    this.target.copy(prevTarget);
    this.camera.position.copy(prevPos);
    this.camera.lookAt(this.target);
    this.controls.target.copy(this.target);
    this.controls.update();
    return url;
  }

  // ---------- Kurulum ----------

  private applyPaintColor(zone: PaintZone, color: number): void {
    const mats = this.paintMaterials.get(zone);
    if (!mats) return;
    for (const m of mats) m.color.setHex(color);
  }

  private startTween(v: ViewDef): void {
    this.lastInteract = performance.now();
    const tg1 = v.target === "bay" ? this.bayTarget : this.carTarget;
    const r1 = v.radius ?? this.radius();
    if (this.reduced) {
      this.target.copy(tg1);
      this.controls.target.copy(tg1);
      this.applySpherical(v.azimuth, v.polar, r1);
      this.controls.update();
      return;
    }
    const az0 = this.controls.getAzimuthalAngle();
    const pol0 = this.controls.getPolarAngle();
    let d = v.azimuth - az0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.tween = {
      t0: performance.now(), dur: 750,
      az0, pol0, az1: az0 + d, pol1: v.polar,
      r0: this.radius(), r1,
      tg0: this.target.clone(), tg1: tg1.clone(),
    };
  }

  private radius(): number {
    return this.camera.position.distanceTo(this.target);
  }

  private applySpherical(azimuth: number, polar: number, radius: number): void {
    this.camera.position.set(
      this.target.x + radius * Math.sin(polar) * Math.sin(azimuth),
      this.target.y + radius * Math.cos(polar),
      this.target.z + radius * Math.sin(polar) * Math.cos(azimuth),
    );
    this.camera.lookAt(this.target);
  }

  private makeLines(
    positions: number[], color: number, widthPx: number, opacity: number, dashed: boolean,
  ): { obj: LineSegments2; mat: LineMaterial } {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(positions.length > 0 ? positions : [0, 0, 0, 0, 0, 0]);
    const mat = new LineMaterial({ color, linewidth: widthPx, transparent: true, opacity, dashed });
    if (dashed) {
      mat.dashSize = 0.09;
      mat.gapSize = 0.06;
    }
    mat.resolution.set(this.container.clientWidth || 1, this.container.clientHeight || 1);
    this.carMaterials.push(mat);
    const obj = new LineSegments2(geo, mat);
    obj.computeLineDistances();
    obj.visible = positions.length > 0;
    return { obj, mat };
  }

  private buildCar(body: BodyType): void {
    const car = buildCarWireframe(body);
    this.defs = getRegionDefs(car.cfg);
    const group = new THREE.Group();

    this.compGroups.clear();
    this.wheelMeshGroups = [];
    this.driveInAnim = {
      active: !this.reduced,
      startTime: performance.now(),
      duration: 2400,
      startX: -12.0,
    };
    if (this.driveInAnim.active) {
      group.position.x = -12.0;
    }

    // Skid marks on floor
    const skidPos = [
      -5.0, 0.005, -car.cfg.bodyHalfW, 0.1, 0.005, -car.cfg.bodyHalfW,
      -5.0, 0.005, car.cfg.bodyHalfW, 0.1, 0.005, car.cfg.bodyHalfW,
    ];
    const skidGeo = new LineSegmentsGeometry();
    skidGeo.setPositions(skidPos);
    const skidMat = new LineMaterial({
      color: 0x1e293b, linewidth: 3.5, transparent: true, opacity: 0,
    });
    skidMat.resolution.set(this.container.clientWidth || 1, this.container.clientHeight || 1);
    this.carMaterials.push(skidMat);
    const skidMesh = new LineSegments2(skidGeo, skidMat);
    skidMesh.computeLineDistances();
    group.add(skidMesh);
    this.skidMesh = skidMesh;

    // Motor bölmesi kamera hedefi (kaput açık inceleme modu için)
    const e = car.cfg.engine;
    this.bayTarget.set((e.x0 + e.x1) / 2 + 0.1, e.y1 + 0.05, 0);

    const clsStyle: Record<1 | 2 | 3, { w: number; a: number }> = {
      1: { w: 2.0, a: 1.0 },
      2: { w: 1.3, a: 0.6 },
      3: { w: 1.0, a: 0.32 },
    };

    // Sabit, boyanmayan çizgiler (iç mekân + mekanik)
    for (const c of [1, 2, 3] as const) {
      const { obj } = this.makeLines(car.cls[c], PALETTE.schema, clsStyle[c].w, clsStyle[c].a, false);
      group.add(obj);
    }

    // Boyanabilir sabit dış yüzey
    this.paintMaterials.clear();
    const zoneMats = (zone: PaintZone): LineMaterial[] => {
      let m = this.paintMaterials.get(zone);
      if (!m) { m = []; this.paintMaterials.set(zone, m); }
      return m;
    };
    for (const zone of ["hood", "doors", "trunk", "body"] as PaintZone[]) {
      const color = this.paintColors.get(zone) ?? PALETTE.schema;
      for (const c of [1, 2, 3] as const) {
        const { obj, mat } = this.makeLines(car.paint[zone][c], color, clsStyle[c].w, clsStyle[c].a, false);
        group.add(obj);
        zoneMats(zone).push(mat);
      }
    }

    // Açılır parçalar — her biri kendi pivotunda bir Group
    this.partsRt.clear();
    this.partHits = [];
    for (const def of Object.values(car.parts)) {
      const pg = new THREE.Group();
      pg.position.set(def.pivot[0], def.pivot[1], def.pivot[2]);
      const color = this.paintColors.get(def.paintZone) ?? PALETTE.schema;
      for (const c of [1, 2, 3] as const) {
        const { obj, mat } = this.makeLines(def.cls[c], color, clsStyle[c].w, clsStyle[c].a, false);
        pg.add(obj);
        zoneMats(def.paintZone).push(mat);
      }
      // Tıklama kutusu — parça ile birlikte döner
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(def.hit.half[0] * 2, def.hit.half[1] * 2, def.hit.half[2] * 2),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.position.set(def.hit.center[0], def.hit.center[1], def.hit.center[2]);
      hit.userData.part = def.id;
      pg.add(hit);
      this.partHits.push(hit);

      group.add(pg);
      this.partsRt.set(def.id, {
        def, group: pg, axis: new THREE.Vector3(...def.axis).normalize(), k: 0, open: false,
      });
    }

    // Bakım bölgeleri
    for (const def of this.defs) {
      const positions = car.regions[def.id];
      const normal = this.makeLines(positions, PALETTE.schema, 1.4, 0.55, false);
      const done = this.makeLines(positions, MODE_COLOR.done, 2.4, 0.95, false);
      const suggest = this.makeLines(positions, MODE_COLOR.suggest, 2.4, 0.95, true);
      done.obj.visible = false;
      suggest.obj.visible = false;

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.doneTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.85,
        }),
      );
      glow.position.copy(def.anchor);
      glow.scale.set(def.glowScale, def.glowScale, 1);
      glow.visible = false;

      const hitMeshes = def.hits.map((hd) => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(hd.radius, 8, 8),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        );
        m.position.copy(hd.center);
        m.userData.region = def.id;
        return m;
      });

      const compGroup = this.getCompGroup(def.id, group);
      normal.obj.position.sub(def.anchor);
      glow.position.sub(def.anchor);
      for (const hm of hitMeshes) hm.position.sub(def.anchor);

      compGroup.add(normal.obj, glow, ...hitMeshes);

      this.regions.set(def.id, {
        def,
        lines: normal.obj,
        normalMat: normal.mat,
        doneMat: done.mat,
        suggestMat: suggest.mat,
        glow,
        hitMeshes,
      });
      if (!this.modes.has(def.id)) this.modes.set(def.id, "off");
    }

    this.buildVolumetricSolidMeshes(body, car, group);

    this.scene.add(group);
    this.carGroup = group;
  }

  private buildVolumetricSolidMeshes(body: BodyType, car: ReturnType<typeof buildCarWireframe>, group: THREE.Group): void {
    const cfg = car.cfg;
    const L = cfg.lift;
    const e = cfg.engine;

    // 1. MOTOR (Solid Metallic Blue Engine Block + Head + Radiator)
    const motorGroup = this.getCompGroup("motor", group);
    const mAnchor = motorGroup.position.clone();

    const engineGeo = new THREE.BoxGeometry(e.x1 - e.x0, e.y1 - e.y0, e.halfZ * 1.8);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, metalness: 0.75, roughness: 0.2, transparent: true, opacity: 0.92,
    });
    const engineMesh = new THREE.Mesh(engineGeo, engineMat);
    engineMesh.castShadow = true;
    engineMesh.position.set((e.x0 + e.x1) / 2 - mAnchor.x, (e.y0 + e.y1) / 2 - mAnchor.y, 0 - mAnchor.z);
    motorGroup.add(engineMesh);

    const headGeo = new THREE.BoxGeometry((e.x1 - e.x0) * 0.85, 0.12, e.halfZ * 1.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.castShadow = true;
    headMesh.position.set((e.x0 + e.x1) / 2 - mAnchor.x, e.y1 + 0.06 - mAnchor.y, 0 - mAnchor.z);
    motorGroup.add(headMesh);

    const radX = Math.min(cfg.frontX - 0.1, e.x1 + 0.22);
    const radGeo = new THREE.BoxGeometry(0.08, e.y1 - e.y0 + 0.1, e.halfZ * 1.8);
    const radMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.5 });
    const radMesh = new THREE.Mesh(radGeo, radMat);
    radMesh.position.set(radX - mAnchor.x, (e.y0 + e.y1) / 2 - mAnchor.y, 0 - mAnchor.z);
    motorGroup.add(radMesh);

    // 2. ŞANZIMAN (Solid Titanium Gearbox Casing)
    const gboxGeo = new THREE.BoxGeometry(0.55, 0.38, e.halfZ * 1.2);
    const gboxMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0.9,
    });
    const gboxMesh = new THREE.Mesh(gboxGeo, gboxMat);
    gboxMesh.position.set(e.x0 - 0.28 - mAnchor.x, e.y0 + 0.08 - mAnchor.y, 0 - mAnchor.z);
    motorGroup.add(gboxMesh);

    // 3. ŞASİ (Solid Steel Subframe Rails & Crossmembers)
    const railLen = Math.abs(cfg.frontX - cfg.rearX) + 1.0;
    const railGeo = new THREE.BoxGeometry(railLen, 0.12, 0.12);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.4 });

    const railL = new THREE.Mesh(railGeo, chassisMat);
    railL.position.set((cfg.frontX + cfg.rearX) / 2, cfg.sillY - 0.04, -(cfg.bodyHalfW - 0.16));
    const railR = new THREE.Mesh(railGeo, chassisMat);
    railR.position.set((cfg.frontX + cfg.rearX) / 2, cfg.sillY - 0.04, +(cfg.bodyHalfW - 0.16));
    group.add(railL, railR);

    for (const xPos of [cfg.frontX - 0.2, (cfg.frontX + cfg.rearX) / 2, cfg.rearX + 0.2]) {
      const crossGeo = new THREE.BoxGeometry(0.12, 0.1, (cfg.bodyHalfW - 0.16) * 2);
      const crossMesh = new THREE.Mesh(crossGeo, chassisMat);
      crossMesh.position.set(xPos, cfg.sillY - 0.04, 0);
      group.add(crossMesh);
    }

    // 4. AMORTİSÖRLER & SÜSPANSİYON
    const shockGroup = this.getCompGroup("amortisor", group);
    const sAnchor = shockGroup.position.clone();
    const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.42, 12);
    const strutMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const coilGeo = new THREE.TorusGeometry(0.07, 0.015, 8, 16);
    const coilMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7, roughness: 0.3 });

    for (const sx of [cfg.frontX, cfg.rearX]) {
      for (const sz of [-cfg.bodyHalfW + 0.12, cfg.bodyHalfW - 0.12]) {
        const strut = new THREE.Mesh(strutGeo, strutMat);
        strut.position.set(sx - sAnchor.x, cfg.wheelY + 0.22 - sAnchor.y, sz - sAnchor.z);
        const coil = new THREE.Mesh(coilGeo, coilMat);
        coil.rotation.x = Math.PI / 2;
        coil.position.set(sx - sAnchor.x, cfg.wheelY + 0.22 - sAnchor.y, sz - sAnchor.z);
        shockGroup.add(strut, coil);
      }
    }

    // 5. AKÜ & ELEKTRİK SİSTEMİ
    const elecGroup = this.getCompGroup("elektrik", group);
    const elAnchor = elecGroup.position.clone();
    const battGeo = new THREE.BoxGeometry(0.28, 0.22, 0.32);
    const battMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const battMesh = new THREE.Mesh(battGeo, battMat);
    battMesh.position.set(e.x0 + 0.13 - elAnchor.x, e.y0 + 0.25 - elAnchor.y, -(e.halfZ + 0.2) - elAnchor.z);
    const termGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8);
    const termMatR = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const termMatB = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const termR = new THREE.Mesh(termGeo, termMatR);
    termR.position.set(e.x0 + 0.08 - elAnchor.x, e.y0 + 0.38 - elAnchor.y, -(e.halfZ + 0.28) - elAnchor.z);
    const termB = new THREE.Mesh(termGeo, termMatB);
    termB.position.set(e.x0 + 0.18 - elAnchor.x, e.y0 + 0.38 - elAnchor.y, -(e.halfZ + 0.12) - elAnchor.z);
    elecGroup.add(battMesh, termR, termB);

    // 6. KLİMA KONDENSERİ & KOMPRESÖR
    const acGroup = this.getCompGroup("klima", group);
    const acAnchor = acGroup.position.clone();
    const compGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12);
    const compMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const compMesh = new THREE.Mesh(compGeo, compMat);
    compMesh.rotation.z = Math.PI / 2;
    compMesh.position.set(e.x1 + 0.02 - acAnchor.x, e.y0 + 0.12 - acAnchor.y, -0.32 - acAnchor.z);
    acGroup.add(compMesh);

    // 7. EGZOZ SİSTEMİ
    const exhGroup = this.getCompGroup("egzoz", group);
    const exAnchor = exhGroup.position.clone();
    const pipeGeo = new THREE.CylinderGeometry(0.035, 0.035, Math.abs(cfg.frontX - cfg.rearX), 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.3 });
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    pipeMesh.rotation.z = Math.PI / 2;
    pipeMesh.position.set((cfg.frontX + cfg.rearX) / 2 - exAnchor.x, cfg.sillY - 0.1 - exAnchor.y, -0.34 - exAnchor.z);

    const mufGeo = new THREE.BoxGeometry(0.48, 0.2, 0.32);
    const mufMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.25 });
    const mufMesh = new THREE.Mesh(mufGeo, mufMat);
    mufMesh.position.set(cfg.rearX - 0.375 - exAnchor.x, cfg.sillY - 0.12 - exAnchor.y, -0.34 - exAnchor.z);
    exhGroup.add(pipeMesh, mufMesh);

    // 8. KABİN İÇİ & KOLTUKLAR (Kasa tipine göre özel: Motosiklet/Otobüs/Tır/Otomobil)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });

    if (body === "motor") {
      // Motosiklet: Tekerlekler Z=0 üzerinde 2 adet inline; sele + yakıt deposu
      const seatGroup = new THREE.Group();
      seatGroup.position.set(-0.2, 0.62 + L, 0);
      const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.22), seatMat);
      const tankMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.26), chassisMat);
      tankMesh.position.set(0.45, 0.1, 0);
      seatGroup.add(seatMesh, tankMesh);
      group.add(seatGroup);
    } else {
      // Vites
      const bootGeo = new THREE.ConeGeometry(0.075, 0.06, 6);
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
      const bootMesh = new THREE.Mesh(bootGeo, bootMat);
      bootMesh.position.set(0.58, cfg.sillY + 0.07 + L, 0);

      const leverGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 12);
      const leverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
      const leverMesh = new THREE.Mesh(leverGeo, leverMat);
      leverMesh.position.set(0.56, cfg.sillY + 0.16 + L, 0);
      leverMesh.rotation.z = -0.15;

      const knobGeo = new THREE.SphereGeometry(0.042, 16, 16);
      const knobMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const knobMesh = new THREE.Mesh(knobGeo, knobMat);
      knobMesh.position.set(0.545, cfg.sillY + 0.245 + L, 0);
      group.add(bootMesh, leverMesh, knobMesh);

      // Direksiyon
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(0.72, 0.88 + L, -0.34);
      wheelGroup.rotation.z = -0.42;

      const rimGeo = new THREE.TorusGeometry(0.135, 0.018, 12, 24);
      const stMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const rimMesh = new THREE.Mesh(rimGeo, stMat);

      const hubGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 16);
      const hubMesh = new THREE.Mesh(hubGeo, stMat);
      hubMesh.rotation.x = Math.PI / 2;

      const colGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.24, 12);
      const colMesh = new THREE.Mesh(colGeo, stMat);
      colMesh.position.set(0.1, -0.06, 0);
      colMesh.rotation.z = 0.5;

      wheelGroup.add(rimMesh, hubMesh, colMesh);
      group.add(wheelGroup);

      // Koltuk Düzeni
      const makeSeat = (cx: number, cz: number) => {
        const sGroup = new THREE.Group();
        sGroup.position.set(cx, 0.52 + L, cz);
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.42), seatMat);
        cushion.position.set(0.18, 0, 0);
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.42), seatMat);
        backrest.position.set(-0.06, 0.27, 0);
        backrest.rotation.z = -0.12;
        const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.2), seatMat);
        headrest.position.set(-0.1, 0.6, 0);
        sGroup.add(cushion, backrest, headrest);
        group.add(sGroup);
      };

      if (body === "otobus") {
        // Otobüs: Koridor boyunca çoklu yolcu koltukları
        for (let sx = -2.4; sx <= 1.4; sx += 0.65) {
          makeSeat(sx, -0.44);
          makeSeat(sx, 0.44);
        }
      } else if (body === "tir") {
        // Tır: Çekici kupa içinde sadece 2 ön koltuk (Sürücü & Yolcu)
        makeSeat(1.0, -0.38);
        makeSeat(1.0, 0.38);
      } else {
        // Otomobil / Minibüs / Kamyon koltukları (4 koltuk)
        makeSeat(0.1, -0.34);
        makeSeat(0.1, 0.34);
        makeSeat(-0.72, -0.34);
        makeSeat(-0.72, 0.34);
      }

      // Torpido
      const dashX = 0.98;
      const dashGeo = new THREE.BoxGeometry(0.24, 0.28, (cfg.bodyHalfW - 0.1) * 2);
      const dashMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const dashMesh = new THREE.Mesh(dashGeo, dashMat);
      dashMesh.position.set(dashX, 0.83 + L, 0);
      group.add(dashMesh);
    }

    // Tır dorse kaldırıldı (çıplak çekici)


    // 9. TEKERLEKLER & FREN DİSKLERİ
    const brakeGroup = this.getCompGroup("fren", group);
    const lastikGroup = this.getCompGroup("lastik", group);
    const bAnchor = brakeGroup.position.clone();
    const lAnchor = lastikGroup.position.clone();

    const wheelXList = body === "motor"
      ? [{ x: cfg.frontX, z: 0 }, { x: cfg.rearX, z: 0 }]
      : [
        { x: cfg.frontX, z: cfg.bodyHalfW },
        { x: cfg.frontX, z: -cfg.bodyHalfW },
        { x: cfg.rearX, z: cfg.bodyHalfW },
        { x: cfg.rearX, z: -cfg.bodyHalfW },
      ];
    const wW = cfg.wheelR * 0.62;
    const tireGeo = new THREE.CylinderGeometry(cfg.wheelR, cfg.wheelR, wW, 28, 1, true);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x0b1220, roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide,
    });
    const barrelGeo = new THREE.CylinderGeometry(cfg.wheelR * 0.64, cfg.wheelR * 0.64, wW * 0.86, 20, 1, true);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x1b2432, metalness: 0.65, roughness: 0.45, side: THREE.DoubleSide,
    });
    const discGeo = new THREE.CylinderGeometry(cfg.wheelR * 0.57, cfg.wheelR * 0.57, 0.024, 24);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.2 });
    const calGeo = new THREE.BoxGeometry(0.1, 0.12, 0.08);
    const calMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });

    for (const w of wheelXList) {
      const side = w.z > 0 ? 1 : w.z < 0 ? -1 : 0;
      const wGroup = new THREE.Group();
      wGroup.position.set(w.x - lAnchor.x, cfg.wheelY - lAnchor.y, w.z - (side * wW) / 2 - lAnchor.z);
      wGroup.rotation.x = Math.PI / 2;

      const tire = new THREE.Mesh(tireGeo, tireMat);
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      wGroup.add(tire, barrel);
      lastikGroup.add(wGroup);
      this.wheelMeshGroups.push(wGroup);

      const dGroup = new THREE.Group();
      dGroup.position.set(w.x - bAnchor.x, cfg.wheelY - bAnchor.y, w.z - (side * wW) / 2 - bAnchor.z);
      dGroup.rotation.x = Math.PI / 2;
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.y = (side || 1) * wW * 0.08;
      const cal = new THREE.Mesh(calGeo, calMat);
      cal.position.set(0.08, (side || 1) * wW * 0.08, 0.04);
      dGroup.add(disc, cal);
      brakeGroup.add(dGroup);
    }

    // 10. KAPORTA HACMİ (Solid Volumetric Panels)
    this.panelMeshes.clear();
    const makePanelMesh = (id: string, geo: THREE.BufferGeometry, parent: THREE.Group, pos?: [number, number, number]) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x475569, metalness: 0.35, roughness: 0.3, transparent: true, opacity: 0.65,
      });
      const mesh = new THREE.Mesh(geo, mat);
      if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
      parent.add(mesh);
      this.panelMeshes.set(id, mesh);
    };

    const hoodDef = this.partsRt.get("hood");
    if (hoodDef) {
      const hx0 = cfg.profile[cfg.hoodIdx[0]][0];
      const hx1 = cfg.profile[cfg.hoodIdx[cfg.hoodIdx.length - 1]][0];
      const hW = cfg.bodyHalfW * 0.82;
      const hGeo = new THREE.BoxGeometry(Math.abs(hx1 - hx0), 0.05, hW * 2);
      makePanelMesh("kaput", hGeo, hoodDef.group, [0, 0, 0]);
    }

    const trunkDef = this.partsRt.get("trunk");
    if (trunkDef) {
      const tx0 = cfg.profile[cfg.tailIdx[0]][0];
      const tx1 = cfg.profile[cfg.tailIdx[cfg.tailIdx.length - 1]][0];
      const tW = cfg.bodyHalfW * 0.84;
      const tGeo = new THREE.BoxGeometry(Math.abs(tx1 - tx0), 0.05, tW * 2);
      makePanelMesh("bagaj", tGeo, trunkDef.group, [0, 0, 0]);
    }

    const winXMax = Math.max(...cfg.window.map((p) => p[0]));
    const frontDoorLen = Math.abs(cfg.doorSeams[0] - winXMax);
    const rearDoorLen = Math.abs(cfg.doorSeams[1] - cfg.doorSeams[0]);

    const doorFL = this.partsRt.get("doorFL");
    if (doorFL && frontDoorLen > 0.1) {
      const dGeo = new THREE.BoxGeometry(frontDoorLen, (cfg.beltY - cfg.sillY), 0.05);
      makePanelMesh("sol-on-kapi", dGeo, doorFL.group, [frontDoorLen / 2, (cfg.beltY - cfg.sillY) / 2, 0]);
    }

    const doorFR = this.partsRt.get("doorFR");
    if (doorFR && frontDoorLen > 0.1) {
      const dGeo = new THREE.BoxGeometry(frontDoorLen, (cfg.beltY - cfg.sillY), 0.05);
      makePanelMesh("sag-on-kapi", dGeo, doorFR.group, [frontDoorLen / 2, (cfg.beltY - cfg.sillY) / 2, 0]);
    }

    const doorRL = this.partsRt.get("doorRL");
    if (doorRL && rearDoorLen > 0.35) {
      const dGeo = new THREE.BoxGeometry(rearDoorLen, (cfg.beltY - cfg.sillY), 0.05);
      makePanelMesh("sol-arka-kapi", dGeo, doorRL.group, [rearDoorLen / 2, (cfg.beltY - cfg.sillY) / 2, 0]);
    }

    const doorRR = this.partsRt.get("doorRR");
    if (doorRR && rearDoorLen > 0.35) {
      const dGeo = new THREE.BoxGeometry(rearDoorLen, (cfg.beltY - cfg.sillY), 0.05);
      makePanelMesh("sag-arka-kapi", dGeo, doorRR.group, [rearDoorLen / 2, (cfg.beltY - cfg.sillY) / 2, 0]);
    }

    const roofWinMaxY = Math.max(...cfg.window.map((p) => p[1])) + 0.02;
    const roofWinMinX = Math.min(...cfg.window.map((p) => p[0]));
    const roofWinMaxX = Math.max(...cfg.window.map((p) => p[0]));
    const roofCenterX = (roofWinMinX + roofWinMaxX) / 2;
    const roofLenX = Math.max(roofWinMaxX - roofWinMinX + 0.18, 0.5);
    const roofGeo = new THREE.BoxGeometry(roofLenX, 0.04, cfg.glassZ * 2);
    makePanelMesh("tavan", roofGeo, group, [roofCenterX, roofWinMaxY, 0]);

    const frontBumperGeo = new THREE.BoxGeometry(0.3, 0.4, cfg.bodyHalfW * 2);
    makePanelMesh("on-tampon", frontBumperGeo, group, [cfg.frontX + 0.5, cfg.sillY + 0.15, 0]);

    const rearBumperGeo = new THREE.BoxGeometry(0.3, 0.4, cfg.bodyHalfW * 2);
    makePanelMesh("arka-tampon", rearBumperGeo, group, [cfg.rearX - 0.5, cfg.sillY + 0.15, 0]);

    const fenderFrontGeo = new THREE.BoxGeometry(0.6, 0.45, 0.06);
    makePanelMesh("sol-on-camurluk", fenderFrontGeo, group, [cfg.frontX, cfg.sillY + 0.25, -cfg.bodyHalfW]);
    makePanelMesh("sag-on-camurluk", fenderFrontGeo, group, [cfg.frontX, cfg.sillY + 0.25, cfg.bodyHalfW]);

    const fenderRearGeo = new THREE.BoxGeometry(0.6, 0.45, 0.06);
    makePanelMesh("sol-arka-camurluk", fenderRearGeo, group, [cfg.rearX, cfg.sillY + 0.25, -cfg.bodyHalfW]);
    makePanelMesh("sag-arka-camurluk", fenderRearGeo, group, [cfg.rearX, cfg.sillY + 0.25, cfg.bodyHalfW]);
  }

  private disposeCar(): void {
    if (!this.carGroup) return;
    this.carGroup.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof LineSegments2) o.geometry.dispose();
      if (o instanceof THREE.Sprite) o.material.dispose();
      if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
    });
    for (const m of this.carMaterials) m.dispose();
    this.carMaterials = [];
    this.paintMaterials.clear();
    this.scene.remove(this.carGroup);
    this.carGroup = null;
    this.regions.clear();
    this.partsRt.clear();
    this.partHits = [];
    this.compGroups.clear();
    this.wheelMeshGroups = [];
  }

  private pick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const regionMeshes = [...this.regions.values()].flatMap((r) => r.hitMeshes);
    const partHit = this.raycaster.intersectObjects(this.partHits, false)[0];
    const regionHit = this.raycaster.intersectObjects(regionMeshes, false)[0];

    if (partHit) {
      const partId = partHit.object.userData.part as OpenablePart;
      const closedCoversAll = !this.isPartOpen(partId);
      if (closedCoversAll || !regionHit || partHit.distance <= regionHit.distance) {
        const open = this.togglePart(partId);
        this.onPartToggled?.(partId, open);
        return;
      }
    }
    if (regionHit) {
      const rId = regionHit.object.userData.region as RegionId;
      this.inspectRegion(rId);
      this.onRegionClicked?.(rId);
    }
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const m of this.carMaterials) m.resolution.set(w, h);
    this.callouts.resize(w, h, dpr);
  }

  private frame(t: number): void {
    if (this.tween) {
      const k = Math.min(1, (t - this.tween.t0) / this.tween.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.target.lerpVectors(this.tween.tg0, this.tween.tg1, e);
      this.controls.target.copy(this.target);
      this.applySpherical(
        this.tween.az0 + (this.tween.az1 - this.tween.az0) * e,
        this.tween.pol0 + (this.tween.pol1 - this.tween.pol0) * e,
        this.tween.r0 + (this.tween.r1 - this.tween.r0) * e,
      );
      if (k >= 1) this.tween = null;
    }

    // 1. Araba giriş (Drive-In) animasyonu
    if (this.driveInAnim.active && this.carGroup) {
      const elapsed = (t - this.driveInAnim.startTime) / this.driveInAnim.duration;
      if (elapsed >= 1) {
        this.driveInAnim.active = false;
        this.carGroup.position.x = 0;
        this.carGroup.rotation.z = 0;
        if (this.skidMesh) (this.skidMesh.material as LineMaterial).opacity = 0;
      } else {
        const e = 1 - Math.pow(1 - elapsed, 3.5);
        const currX = this.driveInAnim.startX * (1 - e);
        const deltaX = currX - this.carGroup.position.x;
        this.carGroup.position.x = currX;

        for (const wg of this.wheelMeshGroups) {
          wg.rotateY(deltaX * 2.2);
        }

        if (this.skidMesh && elapsed > 0.35) {
          (this.skidMesh.material as LineMaterial).opacity = Math.sin(((elapsed - 0.35) / 0.65) * Math.PI) * 0.6;
        }

        if (elapsed > 0.5) {
          this.carGroup.rotation.z = Math.sin((elapsed - 0.5) * Math.PI * 2) * -0.018 * (1 - elapsed);
        }
      }
    }

    // 2. Yükselen 3B parça inceleme animasyonu (Full 360° Continuous In-Place Rotation)
    for (const [rId, cGroup] of this.compGroups) {
      const isTarget = this.activeInspectRegion === rId;
      const def = this.defs.find((d) => d.id === rId);
      const anchorY = def ? def.anchor.y : 0;
      const targetY = isTarget ? anchorY + 1.8 : anchorY;

      // Smooth Y elevation
      cGroup.position.y += (targetY - cGroup.position.y) * 0.12;

      if (isTarget) {
        // Tam 360 derece yerinde (in-place) kesintisiz sonsuz dönüş!
        cGroup.rotation.y += 0.014;
      } else {
        // Yerine inince açıyı yumuşakça varsayılana getir
        cGroup.rotation.y += (0 - cGroup.rotation.y) * 0.12;
      }
    }

    // Açılır parçaların menteşe animasyonu
    for (const rt of this.partsRt.values()) {
      const goal = rt.open ? 1 : 0;
      if (Math.abs(rt.k - goal) > 0.0015) {
        rt.k += (goal - rt.k) * (this.reduced ? 1 : 0.14);
        if (Math.abs(rt.k - goal) <= 0.0015) rt.k = goal;
        const s = rt.k * rt.k * (3 - 2 * rt.k); // smoothstep
        rt.group.setRotationFromAxisAngle(rt.axis, rt.def.maxAngle * s);
      }
    }

    this.controls.autoRotate =
      !this.reduced && !this.tween && !this.activeInspectRegion && t - this.lastInteract > 4000;
    this.controls.update();

    // öneri durumundaki bölgelerde nabız
    for (const rt of this.regions.values()) {
      if ((this.modes.get(rt.def.id) ?? "off") !== "suggest") continue;
      const a = this.reduced ? 0.85 : 0.6 + 0.35 * (0.5 + 0.5 * Math.sin(t / 350));
      rt.suggestMat.opacity = a;
      (rt.glow.material as THREE.SpriteMaterial).opacity = this.reduced ? 0.7 : a * 0.9;
    }

    this.renderer.render(this.scene, this.camera);
    this.callouts.update(this.camera, this.defs, this.modes);
  }
}
