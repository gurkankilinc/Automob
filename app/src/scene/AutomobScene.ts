import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { buildCarWireframe, type BodyType, type RegionId, type PaintZone } from "./carWireframe";
import {
  getRegionDefs, createGlowTexture, MODE_COLOR, MODE_GLOW,
  type RegionDef, type RegionMode,
} from "./regions";
import { Callouts } from "./callouts";
import { PALETTE } from "./palette";

export type ViewName = "yan" | "on" | "ust" | "orbit";

const VIEWS: Record<ViewName, { azimuth: number; polar: number }> = {
  yan: { azimuth: 0, polar: 1.51 },
  on: { azimuth: Math.PI / 2, polar: 1.47 },
  ust: { azimuth: -0.6, polar: 0.32 },
  orbit: { azimuth: -0.6, polar: 1.27 },
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

export class AutomobScene {
  /** 3D'de bölgeye tıklanınca çağrılır — aç/kapat kararı dışarıda verilir. */
  onRegionClicked?: (id: RegionId) => void;
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
  private modes = new Map<RegionId, RegionMode>();
  private defs: RegionDef[] = [];
  private doneTex = createGlowTexture(MODE_GLOW.done);
  private suggestTex = createGlowTexture(MODE_GLOW.suggest);
  private raycaster = new THREE.Raycaster();
  private target = new THREE.Vector3(0, 0.72, 0);
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private lastInteract = 0;
  private tween: {
    t0: number; dur: number;
    az0: number; pol0: number; az1: number; pol1: number;
  } | null = null;
  private downAt: { x: number; y: number } | null = null;

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

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this.applySpherical(VIEWS.orbit.azimuth, VIEWS.orbit.polar, 7.2);

    this.controls = new OrbitControls(this.camera, glCanvas);
    this.controls.target.copy(this.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4.2;
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

    const grid = new THREE.GridHelper(8, 10, PALETTE.gridCenter, PALETTE.grid);
    const gm = grid.material as THREE.LineBasicMaterial;
    gm.transparent = true;
    gm.opacity = 0.55;
    this.scene.add(grid);

    this.callouts = new Callouts(container, overlayCanvas);
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

  // ---------- Dış API ----------

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
    const saved = new Map(this.modes);
    this.disposeCar();
    this.buildCar(body);
    for (const [id, m] of saved) this.setRegionMode(id, m);
    for (const [zone, color] of this.paintColors) this.applyPaintColor(zone, color);
    this.lastInteract = performance.now();
  }

  /** Bir kaporta bölgesinin (kaput/kapılar/bagaj/gövde) rengini değiştirir. */
  setPaintColor(zone: PaintZone, color: number): void {
    this.paintColors.set(zone, color);
    this.applyPaintColor(zone, color);
  }

  private applyPaintColor(zone: PaintZone, color: number): void {
    const mats = this.paintMaterials.get(zone);
    if (!mats) return;
    for (const m of mats) m.color.setHex(color);
  }

  setLabelText(id: RegionId, sub: string): void {
    this.callouts.setLabelText(id, sub);
  }

  setView(name: ViewName): void {
    const v = VIEWS[name];
    this.startTween(v.azimuth, v.polar);
  }

  /** Zaman çizelgesinden bölgeye kamera uçuşu. */
  flyToRegion(id: RegionId): void {
    const def = this.defs.find((d) => d.id === id);
    if (def) this.startTween(def.view.azimuth, def.view.polar);
  }

  /**
   * Rapor için sabit 3/4 açıdan anlık görüntü: verilen bölgeleri vurgulayıp
   * koyu zemini pişirir, PNG data URL döndürür, sonra sahneyi eski hâline getirir.
   */
  captureReport(modes: ReadonlyMap<RegionId, RegionMode>): string {
    const prevModes = new Map(this.modes);
    const prevPos = this.camera.position.clone();

    this.applySpherical(VIEWS.orbit.azimuth, VIEWS.orbit.polar, 7.4);
    for (const id of ["motor", "fren", "amortisor"] as RegionId[]) {
      this.setRegionMode(id, modes.get(id) ?? "off");
    }
    this.renderer.setClearColor(PALETTE.stageBg, 1);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL("image/png");

    // geri al
    this.renderer.setClearColor(0x000000, 0);
    for (const [id, m] of prevModes) this.setRegionMode(id, m);
    this.camera.position.copy(prevPos);
    this.camera.lookAt(this.target);
    this.controls.update();
    return url;
  }

  // ---------- Kurulum ----------

  private startTween(azimuth: number, polar: number): void {
    this.lastInteract = performance.now();
    if (this.reduced) {
      this.applySpherical(azimuth, polar, this.radius());
      this.controls.update();
      return;
    }
    const az0 = this.controls.getAzimuthalAngle();
    const pol0 = this.controls.getPolarAngle();
    let d = azimuth - az0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.tween = { t0: performance.now(), dur: 650, az0, pol0, az1: az0 + d, pol1: polar };
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
    geo.setPositions(positions);
    const mat = new LineMaterial({ color, linewidth: widthPx, transparent: true, opacity, dashed });
    if (dashed) {
      mat.dashSize = 0.09;
      mat.gapSize = 0.06;
    }
    mat.resolution.set(this.container.clientWidth || 1, this.container.clientHeight || 1);
    this.carMaterials.push(mat);
    const obj = new LineSegments2(geo, mat);
    obj.computeLineDistances();
    return { obj, mat };
  }

  private buildCar(body: BodyType): void {
    const car = buildCarWireframe(body);
    this.defs = getRegionDefs(car.cfg);
    const group = new THREE.Group();

    const clsStyle: Record<1 | 2 | 3, { w: number; a: number }> = {
      1: { w: 2.0, a: 1.0 },
      2: { w: 1.3, a: 0.6 },
      3: { w: 1.0, a: 0.32 },
    };
    for (const c of [1, 2, 3] as const) {
      const { obj } = this.makeLines(car.cls[c], PALETTE.schema, clsStyle[c].w, clsStyle[c].a, false);
      group.add(obj);
    }

    // Boyanabilir dış yüzey — her bölge (kaput/kapılar/bagaj/gövde) kendi rengiyle
    this.paintMaterials.clear();
    for (const zone of ["hood", "doors", "trunk", "body"] as PaintZone[]) {
      const color = this.paintColors.get(zone) ?? PALETTE.schema;
      const mats: LineMaterial[] = [];
      for (const c of [1, 2, 3] as const) {
        const { obj, mat } = this.makeLines(car.paint[zone][c], color, clsStyle[c].w, clsStyle[c].a, false);
        group.add(obj);
        mats.push(mat);
      }
      this.paintMaterials.set(zone, mats);
    }

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

      group.add(normal.obj, glow, ...hitMeshes);
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

    this.scene.add(group);
    this.carGroup = group;
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
  }

  private pick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = [...this.regions.values()].flatMap((r) => r.hitMeshes);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (hit) this.onRegionClicked?.(hit.object.userData.region as RegionId);
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
      this.applySpherical(
        this.tween.az0 + (this.tween.az1 - this.tween.az0) * e,
        this.tween.pol0 + (this.tween.pol1 - this.tween.pol0) * e,
        this.radius(),
      );
      if (k >= 1) this.tween = null;
    }

    this.controls.autoRotate =
      !this.reduced && !this.tween && t - this.lastInteract > 4000;
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
