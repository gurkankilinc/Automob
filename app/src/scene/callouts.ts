import * as THREE from "three";
import type { RegionId } from "./carWireframe";
import type { RegionDef, RegionMode } from "./regions";
import { MODE_COLOR } from "./regions";
import { PALETTE } from "./palette";

/**
 * Ekran uzayı etiket katmanı: köşelere sabit HTML etiketler + WebGL tuvalinin
 * üstündeki 2D tuvale çizilen dirsekli kılavuz çizgileri (tasarım §02 "ok anatomisi").
 */
export class Callouts {
  private ctx: CanvasRenderingContext2D;
  private labels = new Map<RegionId, HTMLElement>();
  private v = new THREE.Vector3();

  constructor(
    private container: HTMLElement,
    private overlay: HTMLCanvasElement,
  ) {
    this.ctx = overlay.getContext("2d")!;
    for (const id of ["motor", "fren", "amortisor"] as RegionId[]) {
      const el = document.getElementById(`lab-${id}`);
      if (el) this.labels.set(id, el);
    }
  }

  setLabelText(id: RegionId, sub: string): void {
    const el = this.labels.get(id)?.querySelector(".s");
    if (el) el.textContent = sub;
  }

  resize(width: number, height: number, dpr: number): void {
    this.overlay.width = Math.round(width * dpr);
    this.overlay.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update(
    camera: THREE.Camera,
    defs: ReadonlyArray<RegionDef>,
    modes: ReadonlyMap<RegionId, RegionMode>,
  ): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    const crect = this.container.getBoundingClientRect();

    for (const def of defs) {
      const el = this.labels.get(def.id);
      if (!el) continue;
      const mode = modes.get(def.id) ?? "off";
      el.classList.toggle("off", mode === "off");
      el.classList.toggle("suggest", mode === "suggest");
      if (mode === "off") continue;

      this.v.copy(def.anchor).project(camera);
      if (this.v.z > 1) continue; // kameranın arkasında
      const sx = ((this.v.x + 1) / 2) * w;
      const sy = ((1 - this.v.y) / 2) * h;

      const r = el.getBoundingClientRect();
      const rx0 = r.left - crect.left;
      const rx1 = r.right - crect.left;
      const ry = r.top - crect.top + r.height / 2;
      const [edgeX, midX] = sx < (rx0 + rx1) / 2 ? [rx0, rx0 - 16] : [rx1, rx1 + 16];

      ctx.strokeStyle = PALETTE.leader;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(midX, ry);
      ctx.lineTo(edgeX, ry);
      ctx.stroke();

      ctx.fillStyle = `#${MODE_COLOR[mode].toString(16).padStart(6, "0")}`;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
