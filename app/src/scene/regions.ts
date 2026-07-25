import * as THREE from "three";
import type { BodyCfg, RegionId } from "./carWireframe";
import { PALETTE } from "./palette";

/** Bölge durumu: kapalı / işlem yapıldı (dolu koyu sarı) / öneri (amber, kesikli, nabız) */
export type RegionMode = "off" | "done" | "suggest";

export interface RegionDef {
  id: RegionId;
  anchor: THREE.Vector3;
  glowScale: number;
  hits: { center: THREE.Vector3; radius: number }[];
  /** Zaman çizelgesinden bölgeye uçuş için kamera açısı */
  view: { azimuth: number; polar: number };
}

/** Kasa konfigürasyonundan bölge tanımlarını türetir. */
export function getRegionDefs(cfg: BodyCfg): RegionDef[] {
  const e = cfg.engine;
  const emx = (e.x0 + e.x1) / 2;
  return [
    {
      id: "motor",
      anchor: new THREE.Vector3(emx + 0.05, e.y1 - 0.12, 0),
      glowScale: 1.9,
      hits: [{ center: new THREE.Vector3(emx, (e.y0 + e.y1) / 2, 0), radius: 0.58 }],
      view: { azimuth: 0.85, polar: 1.12 },
    },
    {
      id: "fren",
      anchor: new THREE.Vector3(cfg.frontX, cfg.wheelY, 0.5),
      glowScale: 1.6,
      hits: [
        { center: new THREE.Vector3(cfg.frontX, cfg.wheelY, cfg.bodyHalfW), radius: cfg.wheelR + 0.12 },
        { center: new THREE.Vector3(cfg.frontX, cfg.wheelY, -cfg.bodyHalfW), radius: cfg.wheelR + 0.12 },
      ],
      view: { azimuth: 0.5, polar: 1.35 },
    },
    {
      id: "amortisor",
      anchor: new THREE.Vector3(cfg.rearX, cfg.wheelY + 0.28, 0),
      glowScale: 1.6,
      hits: [
        { center: new THREE.Vector3(cfg.rearX, cfg.wheelY + 0.2, 0.55), radius: 0.42 },
        { center: new THREE.Vector3(cfg.rearX, cfg.wheelY + 0.2, -0.55), radius: 0.42 },
      ],
      view: { azimuth: 2.55, polar: 1.25 },
    },
  ];
}

export const MODE_COLOR: Record<Exclude<RegionMode, "off">, number> = {
  done: PALETTE.changed,
  suggest: PALETTE.fault,
};

export const MODE_GLOW: Record<Exclude<RegionMode, "off">, string> = {
  done: "201,138,11",
  suggest: "232,161,61",
};

/** Bölge parlaması için radyal degrade dokusu. */
export function createGlowTexture(glowRgb: string): THREE.CanvasTexture {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${glowRgb},0.55)`);
  g.addColorStop(0.5, `rgba(${glowRgb},0.16)`);
  g.addColorStop(1, `rgba(${glowRgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}
