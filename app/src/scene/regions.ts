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
  const wR = cfg.wheelR;
  const noseX = cfg.profile[cfg.profile.length - 1][0];
  const radX = Math.min(noseX - 0.1, e.x1 + 0.24);

  return [
    {
      id: "motor",
      anchor: new THREE.Vector3(emx + 0.05, e.y1 - 0.12, 0),
      glowScale: 1.9,
      // Motor bloğu küresi bilinçli olarak dar tutulur: geniş tutulursa çevresine
      // yerleştirilen akü/alternatör/klima kompresörü-kondenseri gibi alt bileşenlerin
      // kendi hit-kürelerini yutar (aynı merkezli olmasa da mesafe+yarıçap örtüşmesi).
      hits: [
        { center: new THREE.Vector3(emx, (e.y0 + e.y1) / 2, 0), radius: 0.34 },
        // soğutma suyu deposu
        { center: new THREE.Vector3(e.x1 + 0.1, e.y0 + 0.2, e.halfZ + 0.2), radius: 0.14 },
      ],
      view: { azimuth: 0.85, polar: 1.12 },
    },
    {
      id: "fren",
      anchor: new THREE.Vector3(cfg.frontX, cfg.wheelY, 0.5),
      glowScale: 1.6,
      hits: [
        { center: new THREE.Vector3(cfg.frontX, cfg.wheelY, cfg.bodyHalfW), radius: wR + 0.12 },
        { center: new THREE.Vector3(cfg.frontX, cfg.wheelY, -cfg.bodyHalfW), radius: wR + 0.12 },
        // fren hidroliği deposu
        { center: new THREE.Vector3(e.x0 - 0.1, e.y1 - 0.02, 0.24), radius: 0.13 },
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
        // ön kule takozları (strut kuleleri) — tekerlek/fren/lastik'ten çok daha yüksekte, çakışmıyor
        { center: new THREE.Vector3(cfg.frontX - 0.05, e.y1 + 0.04, cfg.bodyHalfW - 0.18), radius: 0.2 },
        { center: new THREE.Vector3(cfg.frontX - 0.05, e.y1 + 0.04, -(cfg.bodyHalfW - 0.18)), radius: 0.2 },
      ],
      view: { azimuth: 2.55, polar: 1.25 },
    },
    {
      // Ön tekerlekte "fren"in hit-küresiyle iç içe (concentric) olmasın diye lastik
      // hit-küresi teker merkezinden dışa (gövdenin dışına doğru) kaydırılmıştır:
      // merkeze/göbeğe yakın tıklama fren'i, dış lastik yüzeyine yakın tıklama lastik'i
      // seçer. Arka tekerlekte fren bölgesi yok, çakışma söz konusu değil.
      id: "lastik",
      anchor: new THREE.Vector3(cfg.frontX, cfg.wheelY, cfg.bodyHalfW + wR * 0.3),
      glowScale: 1.5,
      hits: [
        { center: new THREE.Vector3(cfg.frontX, cfg.wheelY, cfg.bodyHalfW + wR * 0.6), radius: wR * 0.8 },
        { center: new THREE.Vector3(cfg.frontX, cfg.wheelY, -(cfg.bodyHalfW + wR * 0.6)), radius: wR * 0.8 },
        { center: new THREE.Vector3(cfg.rearX, cfg.wheelY, cfg.bodyHalfW), radius: wR + 0.12 },
        { center: new THREE.Vector3(cfg.rearX, cfg.wheelY, -cfg.bodyHalfW), radius: wR + 0.12 },
      ],
      view: { azimuth: 0.5, polar: 1.35 },
    },
    {
      id: "elektrik",
      anchor: new THREE.Vector3(e.x0 + 0.13, e.y0 + 0.25, -(e.halfZ + 0.2)),
      glowScale: 1.3,
      hits: [
        { center: new THREE.Vector3(e.x0 + 0.13, e.y0 + 0.25, -(e.halfZ + 0.2)), radius: 0.2 }, // akü
        { center: new THREE.Vector3(e.x0 - 0.06, e.y0 + 0.36, -(e.halfZ + 0.11)), radius: 0.14 }, // sigorta kutusu
        { center: new THREE.Vector3(e.x1 + 0.02, e.y0 + 0.28, 0.3), radius: 0.09 }, // alternatör
      ],
      view: { azimuth: 0.85, polar: 1.12 },
    },
    {
      id: "egzoz",
      anchor: new THREE.Vector3(cfg.rearX - 0.375, cfg.sillY - 0.15, -0.34),
      glowScale: 1.3,
      hits: [
        { center: new THREE.Vector3(cfg.rearX - 0.375, cfg.sillY - 0.15, -0.34), radius: 0.22 },
      ],
      view: { azimuth: 2.8, polar: 1.4 },
    },
    {
      id: "klima",
      anchor: new THREE.Vector3(radX - 0.075, (e.y0 + e.y1) / 2, 0),
      glowScale: 1.4,
      hits: [
        { center: new THREE.Vector3(radX - 0.075, (e.y0 + e.y1) / 2, 0), radius: 0.09 }, // kondenser
        { center: new THREE.Vector3(e.x1 + 0.02, e.y0 + 0.12, -0.32), radius: 0.065 }, // kompresör
      ],
      view: { azimuth: 0.85, polar: 1.12 },
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
