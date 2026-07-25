/**
 * Kasa tipine göre parametrik tel kafes araç geometrisi.
 *
 * Eksenler: x = uzunluk (burun +x), y = yükseklik, z = genişlik.
 * Çizgi sınıfları (tasarım §02): 1 = ana kontur, 2 = yapı, 3 = ince detay.
 * Bölge segmentleri (motor/fren/amortisör) ayrı dizilere yazılır; vurgu, malzeme
 * değişimiyle yapılır. Dış yüzey çizgileri ayrıca 4 "boya bölgesi"ne (kaput/kapılar/
 * bagaj/gövde) sınıflandırılır ki kullanıcı her birini ayrı renklendirebilsin —
 * iç mekan/mekanik çizgiler (koltuk, motor, süspansiyon...) bundan etkilenmez.
 */
export type RegionId = "motor" | "fren" | "amortisor";
export type BodyType = "sedan" | "hatchback" | "suv";
export type PaintZone = "hood" | "doors" | "trunk" | "body";

type P = [number, number, number];
type Cls = 1 | 2 | 3;

export interface BodyCfg {
  label: string;
  /** Yan profil: [x, y, yarıGenişlik] — kabin gövdeden dar */
  profile: [number, number, number][];
  /** Sağ-sol profili birleştiren enine çizgilerin profil indeksleri */
  cross2: number[];
  cross3: number[];
  frontX: number;
  rearX: number;
  wheelR: number;
  wheelY: number;
  archR: number;
  sillY: number;
  bodyHalfW: number;
  glassZ: number;
  /** Yan cam poligonu [x, y] */
  window: [number, number][];
  /** Cam içi dikey pilye x konumları */
  pillars: number[];
  doorSeams: number[];
  beltY: number;
  engine: { x0: number; x1: number; y0: number; y1: number; halfZ: number };
  /** SUV gibi yüksek tabanlı kasalarda iç mekânın y kaydırması */
  lift: number;
}

export const BODY_CONFIGS: Record<BodyType, BodyCfg> = {
  sedan: {
    label: "Sedan",
    profile: [
      [-2.2, 0.42, 0.78], [-2.2, 0.8, 0.78], [-1.6, 0.94, 0.76], [-0.9, 0.97, 0.74],
      [-0.42, 1.36, 0.58], [0.52, 1.39, 0.58], [1.05, 0.99, 0.72], [1.95, 0.9, 0.72],
      [2.2, 0.76, 0.68], [2.2, 0.44, 0.74],
    ],
    cross2: [1, 2, 4, 5, 6, 8],
    cross3: [0, 9],
    frontX: 1.35, rearX: -1.35,
    wheelR: 0.34, wheelY: 0.34, archR: 0.42, sillY: 0.32,
    bodyHalfW: 0.78, glassZ: 0.64,
    window: [[-0.82, 1.0], [-0.4, 1.3], [0.46, 1.32], [0.93, 1.02]],
    pillars: [0.03],
    doorSeams: [0.04, -0.86],
    beltY: 0.97,
    engine: { x0: 1.3, x1: 1.85, y0: 0.52, y1: 0.86, halfZ: 0.38 },
    lift: 0,
  },
  hatchback: {
    label: "Hatchback",
    profile: [
      [-1.95, 0.46, 0.76], [-1.95, 0.9, 0.76], [-1.72, 1.28, 0.6], [0.45, 1.38, 0.6],
      [1.0, 0.99, 0.72], [1.9, 0.9, 0.72], [2.15, 0.76, 0.68], [2.15, 0.44, 0.74],
    ],
    cross2: [1, 2, 3, 4, 6],
    cross3: [0, 7],
    frontX: 1.3, rearX: -1.28,
    wheelR: 0.34, wheelY: 0.34, archR: 0.42, sillY: 0.32,
    bodyHalfW: 0.76, glassZ: 0.62,
    window: [[-1.6, 1.02], [-1.66, 1.26], [0.4, 1.31], [0.86, 1.02]],
    pillars: [0.0],
    doorSeams: [0.0, -0.85],
    beltY: 0.97,
    engine: { x0: 1.25, x1: 1.8, y0: 0.52, y1: 0.86, halfZ: 0.38 },
    lift: 0,
  },
  suv: {
    label: "SUV",
    profile: [
      [-2.1, 0.55, 0.8], [-2.1, 1.05, 0.8], [-1.95, 1.52, 0.66], [0.6, 1.6, 0.66],
      [1.15, 1.15, 0.76], [2.0, 1.05, 0.76], [2.25, 0.9, 0.72], [2.25, 0.52, 0.78],
    ],
    cross2: [1, 2, 3, 4, 6],
    cross3: [0, 7],
    frontX: 1.45, rearX: -1.45,
    wheelR: 0.4, wheelY: 0.4, archR: 0.5, sillY: 0.42,
    bodyHalfW: 0.8, glassZ: 0.68,
    window: [[-1.85, 1.1], [-1.9, 1.48], [0.52, 1.53], [1.02, 1.18]],
    pillars: [0.1, -0.9],
    doorSeams: [0.1, -0.9],
    beltY: 1.08,
    engine: { x0: 1.38, x1: 1.98, y0: 0.62, y1: 1.0, halfZ: 0.4 },
    lift: 0.12,
  },
};

export interface CarWireframe {
  /** Boyanmayan çizgiler (iç mekan, mekanik parçalar) — sabit şema rengi */
  cls: Record<Cls, number[]>;
  /** Boyanabilir dış yüzey çizgileri, boya bölgesi × çizgi sınıfına göre */
  paint: Record<PaintZone, Record<Cls, number[]>>;
  regions: Record<RegionId, number[]>;
  cfg: BodyCfg;
}

export function buildCarWireframe(body: BodyType): CarWireframe {
  const cfg = BODY_CONFIGS[body];
  const cls: Record<Cls, number[]> = { 1: [], 2: [], 3: [] };
  const paint: Record<PaintZone, Record<Cls, number[]>> = {
    hood: { 1: [], 2: [], 3: [] },
    doors: { 1: [], 2: [], 3: [] },
    trunk: { 1: [], 2: [], 3: [] },
    body: { 1: [], 2: [], 3: [] },
  };
  const regions: Record<RegionId, number[]> = { motor: [], fren: [], amortisor: [] };

  // Boya bölgesi sınırları (kasa tipinden türetilir): kaput/gövde sınırı ön cam
  // tabanı (cowl), gövde/bagaj sınırı arka cam üstü; kabin X aralığında kemer
  // hizasının altı kapı, üstü gövde/tavan sayılır.
  const hoodEndX = cfg.window[cfg.window.length - 1][0];
  const trunkStartX = cfg.window[0][0];
  const doorSplitY = cfg.beltY - 0.05;

  function paintZoneOf(a: P, b: P): PaintZone {
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    if (mx >= hoodEndX) return "hood";
    if (mx <= trunkStartX) return "trunk";
    return my >= doorSplitY ? "body" : "doors";
  }

  function add(a: P, b: P, c: Cls, region: RegionId | null = null, paintable = false): void {
    if (region) { regions[region].push(a[0], a[1], a[2], b[0], b[1], b[2]); return; }
    const arr = paintable ? paint[paintZoneOf(a, b)][c] : cls[c];
    arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  function poly(pts: P[], c: Cls, region: RegionId | null = null, close = false, paintable = false): void {
    for (let i = 0; i < pts.length - 1; i++) add(pts[i], pts[i + 1], c, region, paintable);
    if (close) add(pts[pts.length - 1], pts[0], c, region, paintable);
  }
  function circle(
    cx: number, cy: number, cz: number, r: number,
    plane: "xy" | "xz", n: number, c: Cls, region: RegionId | null = null,
  ): void {
    const pts: P[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      if (plane === "xy") pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t), cz]);
      else pts.push([cx + r * Math.cos(t), cy, cz + r * Math.sin(t)]);
    }
    poly(pts, c, region, true);
  }
  function box(
    x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
    c: Cls, region: RegionId | null = null,
  ): void {
    const v: P[] = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const [i, j] of e) add(v[i], v[j], c, region);
  }

  // Gövde profili (iki yan) + enine bağlantılar — dış yüzey, boyanabilir
  const sideL: P[] = cfg.profile.map((p) => [p[0], p[1], p[2]]);
  const sideR: P[] = cfg.profile.map((p) => [p[0], p[1], -p[2]]);
  poly(sideL, 1, null, false, true);
  poly(sideR, 1, null, false, true);
  for (const i of cfg.cross2) add(sideL[i], sideR[i], 2, null, true);
  for (const i of cfg.cross3) add(sideL[i], sideR[i], 3, null, true);

  // Alt hat + davlumbazlar — dış yüzey, boyanabilir
  const rearBottom = cfg.profile[0];
  const noseBottom = cfg.profile[cfg.profile.length - 1];
  function bottomLine(z: number): void {
    const arch = (cx: number): P[] => {
      const pts: P[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI - (Math.PI * i) / 8;
        pts.push([cx + cfg.archR * Math.cos(a), cfg.sillY + cfg.archR * Math.sin(a), z]);
      }
      return pts;
    };
    const pts: P[] = [[rearBottom[0], rearBottom[1], z], [cfg.rearX - cfg.archR, cfg.sillY, z]];
    pts.push(...arch(cfg.rearX));
    pts.push([cfg.frontX - cfg.archR, cfg.sillY, z]);
    pts.push(...arch(cfg.frontX));
    pts.push([noseBottom[0], noseBottom[1], z]);
    poly(pts, 1, null, false, true);
  }
  bottomLine(cfg.bodyHalfW);
  bottomLine(-cfg.bodyHalfW);

  // Tekerlekler; önlerde fren diski + jant halkası = "fren" bölgesi (boyanmaz — lastik/jant)
  function wheel(cx: number, z: number, front: boolean): void {
    const cy = cfg.wheelY;
    const r = cfg.wheelR;
    circle(cx, cy, z, r, "xy", 20, 1);
    circle(cx, cy, z, r * 0.6, "xy", 14, 2);
    circle(cx, cy, z, r * 0.13, "xy", 8, 2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.5;
      add(
        [cx + r * 0.13 * Math.cos(a), cy + r * 0.13 * Math.sin(a), z],
        [cx + r * 0.6 * Math.cos(a), cy + r * 0.6 * Math.sin(a), z],
        2,
      );
    }
    const zi = z > 0 ? z - 0.16 : z + 0.16;
    circle(cx, cy, zi, r * 0.37, "xy", 12, front ? 2 : 3, front ? "fren" : null);
    if (front) circle(cx, cy, z, r * 0.6, "xy", 14, 2, "fren");
  }
  wheel(cfg.frontX, cfg.bodyHalfW, true);
  wheel(cfg.frontX, -cfg.bodyHalfW, true);
  wheel(cfg.rearX, cfg.bodyHalfW, false);
  wheel(cfg.rearX, -cfg.bodyHalfW, false);

  // Camlar (boyanmaz — cam) + pilyeler (gövde/tavan) + kapı dikişleri (kapı) + karakter çizgisi (gövde)
  for (const s of [1, -1]) {
    const z = cfg.glassZ * s;
    poly(cfg.window.map(([x, y]) => [x, y, z] as P), 2, null, true);
    const winTop = Math.max(...cfg.window.map((w) => w[1]));
    for (const px of cfg.pillars) add([px + 0.02, cfg.beltY + 0.04, z], [px, winTop, z], 3, null, true);
  }
  for (const s of [1, -1]) {
    const z = cfg.bodyHalfW * s;
    for (const sx of cfg.doorSeams) add([sx, cfg.beltY, z], [sx - 0.03, cfg.sillY + 0.02, z], 3, null, true);
    add([cfg.doorSeams[0] + 0.1, cfg.beltY - 0.09, z], [cfg.doorSeams[0] + 0.3, cfg.beltY - 0.09, z], 2, null, true);
    add([cfg.doorSeams[1] + 0.13, cfg.beltY - 0.09, z], [cfg.doorSeams[1] + 0.33, cfg.beltY - 0.09, z], 2, null, true);
    add([rearBottom[0] + 0.15, cfg.sillY + 0.3, z], [noseBottom[0] - 0.15, cfg.sillY + 0.34, z], 3, null, true);
  }

  // İç mekân: koltuklar (iki sıra) — boyanmaz
  const L = cfg.lift;
  for (const z of [0.34, -0.34]) {
    add([0.1, 0.55 + L, z], [-0.06, 1.02 + L, z], 2);
    add([0.1, 0.55 + L, z], [0.5, 0.57 + L, z], 2);
    circle(-0.08, 1.09 + L, z, 0.06, "xy", 8, 3);
    add([-0.72, 0.55 + L, z], [-0.85, 1.0 + L, z], 2);
    add([-0.72, 0.55 + L, z], [-0.3, 0.56 + L, z], 2);
  }

  // Direksiyon + kolon + torpido hattı — boyanmaz
  {
    const C: P = [0.72, 0.88 + L, 0.34];
    const r = 0.13;
    const u: P = [0, 0, 1];
    const v: P = [0.41, -0.912, 0];
    const pts: P[] = [];
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      pts.push([
        C[0] + r * (Math.cos(t) * u[0] + Math.sin(t) * v[0]),
        C[1] + r * (Math.cos(t) * u[1] + Math.sin(t) * v[1]),
        C[2] + r * (Math.cos(t) * u[2] + Math.sin(t) * v[2]),
      ]);
    }
    poly(pts, 2, null, true);
    add(C, [0.95, 0.8 + L, 0.34], 3);
    const dz = cfg.bodyHalfW - 0.08;
    add([0.98, 0.96 + L, dz], [0.98, 0.96 + L, -dz], 3);
  }

  // Motor bloğu + kanatçıklar + emme + akü — "motor" bölgesi (boyanmaz)
  const e = cfg.engine;
  box(e.x0, e.y0, -e.halfZ, e.x1, e.y1, e.halfZ, 2, "motor");
  const ex1 = e.x0 + (e.x1 - e.x0) * 0.33;
  const ex2 = e.x0 + (e.x1 - e.x0) * 0.66;
  add([ex1, e.y0, e.halfZ], [ex1, e.y1, e.halfZ], 3, "motor");
  add([ex2, e.y0, e.halfZ], [ex2, e.y1, e.halfZ], 3, "motor");
  circle((e.x0 + e.x1) / 2, e.y1, 0.12, 0.09, "xz", 8, 3, "motor");
  box(e.x0 - 0.2, e.y0 + 0.14, 0.42, e.x0 + 0.02, e.y0 + 0.32, 0.62, 3);

  // Süspansiyon yayları (helis) — arka ikisi "amortisor" bölgesi (boyanmaz)
  function spring(cx: number, cz: number, region: RegionId | null): void {
    const pts: P[] = [];
    const y0 = cfg.wheelY + 0.08;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const a = t * Math.PI * 7;
      pts.push([cx + 0.085 * Math.cos(a), y0 + t * 0.34, cz + 0.085 * Math.sin(a)]);
    }
    poly(pts, 2, region);
  }
  spring(cfg.frontX, 0.52, null);
  spring(cfg.frontX, -0.52, null);
  spring(cfg.rearX, 0.52, "amortisor");
  spring(cfg.rearX, -0.52, "amortisor");

  // Egzoz hattı + susturucu — boyanmaz
  const ey = cfg.sillY - 0.14;
  poly([[e.x0 - 0.05, ey + 0.02, -0.3], [cfg.rearX - 0.2, ey, -0.34]], 3);
  box(cfg.rearX - 0.55, ey - 0.07, -0.42, cfg.rearX - 0.2, ey + 0.05, -0.26, 3);
  add([cfg.rearX - 0.55, ey, -0.34], [rearBottom[0] + 0.02, ey, -0.4], 3);

  // ---------- Dış detaylar (tümü boyanabilir) ----------
  const noseTop = cfg.profile[cfg.profile.length - 2];
  const rearTop = cfg.profile[1];
  const noseX = noseBottom[0];
  const noseHW = noseBottom[2];
  const rX = rearBottom[0];
  const rearHW = rearBottom[2];
  const faceMidY = (noseTop[1] + noseBottom[1]) / 2;

  // Ön ızgara: dikey çubuklar + çerçeve — kaput bölgesi
  const grBot = cfg.sillY + 0.1;
  const grTop = faceMidY + 0.03;
  for (let i = -3; i <= 3; i++) {
    const z = (i / 3) * noseHW * 0.55;
    add([noseX, grBot, z], [noseX, grTop, z], 3, null, true);
  }
  add([noseX, grBot, -noseHW * 0.55], [noseX, grBot, noseHW * 0.55], 2, null, true);
  add([noseX, grTop, -noseHW * 0.55], [noseX, grTop, noseHW * 0.55], 2, null, true);

  // Farlar + stop lambaları (köşe dörtgenleri) — kaput/bagaj bölgesi
  function lamp(x: number, topY: number, hw: number, depth: number): void {
    for (const s of [1, -1]) {
      const zc = s * (hw * 0.78);
      poly([
        [x, topY - 0.02, zc - s * 0.02],
        [x, topY - 0.02, zc + s * 0.22],
        [x, topY - 0.02 - depth, zc + s * 0.2],
        [x, topY - 0.02 - depth, zc - s * 0.02],
      ], 2, null, true, true);
    }
  }
  lamp(noseX, noseTop[1], noseHW, 0.13);
  lamp(rX, rearTop[1], rearHW, 0.15);

  // Ön/arka tampon + plaka — kaput/bagaj bölgesi
  add([noseX, cfg.sillY + 0.02, -noseHW], [noseX, cfg.sillY + 0.02, noseHW], 3, null, true);
  add([rX, cfg.sillY + 0.02, -rearHW], [rX, cfg.sillY + 0.02, rearHW], 3, null, true);
  function plate(x: number): void {
    poly([
      [x, cfg.sillY + 0.13, -0.18], [x, cfg.sillY + 0.13, 0.18],
      [x, cfg.sillY + 0.25, 0.18], [x, cfg.sillY + 0.25, -0.18],
    ], 3, null, true, true);
  }
  plate(noseX + 0.002);
  plate(rX - 0.002);

  // Kaput karakter çizgileri
  const cowl = cfg.window[cfg.window.length - 1];
  for (const s of [0.45, -0.45]) {
    add(
      [noseX - 0.05, noseTop[1] - 0.01, s * noseHW * 0.9],
      [cowl[0] + 0.12, cowl[1] - 0.02, s * (cfg.bodyHalfW - 0.06)],
      3, null, true,
    );
  }

  // Yan aynalar (A sütunu civarı) — kapı bölgesi
  const mirrorX = cowl[0] - 0.05;
  for (const s of [1, -1]) {
    const z = s * cfg.bodyHalfW;
    const zo = s * (cfg.bodyHalfW + 0.13);
    poly([
      [mirrorX + 0.06, cfg.beltY - 0.02, z],
      [mirrorX + 0.02, cfg.beltY - 0.05, zo],
      [mirrorX - 0.06, cfg.beltY - 0.12, zo],
      [mirrorX - 0.02, cfg.beltY - 0.09, z],
    ], 3, null, true, true);
  }

  // Tavan kaburgaları (greenhouse enine bağları) — gövde/tavan
  for (const wp of cfg.window) {
    if (wp[1] > cfg.beltY + 0.15) {
      add([wp[0], wp[1], cfg.glassZ], [wp[0], wp[1], -cfg.glassZ], 3, null, true);
    }
  }

  // ---------- İç detaylar (boyanmaz) ----------
  // Orta konsol + vites + pedallar
  add([0.75, 0.62 + L, 0], [0.2, 0.6 + L, 0], 3);
  circle(0.5, 0.66 + L, 0, 0.03, "xy", 6, 3);
  for (const pz of [0.12, 0.22]) add([1.0, 0.5 + L, pz], [1.05, 0.44 + L, pz], 3);
  // Torpido üst hattı
  add([0.98, 0.92 + L, cfg.bodyHalfW - 0.12], [0.98, 0.92 + L, -(cfg.bodyHalfW - 0.12)], 3);

  // Motor bölgesi: radyatör peteği (motor bölgesine dahil)
  for (let i = 0; i <= 4; i++) {
    const yy = e.y0 + 0.05 + (i / 4) * (e.y1 - e.y0 - 0.1);
    add([e.x1 + 0.02, yy, -e.halfZ * 0.8], [e.x1 + 0.02, yy, e.halfZ * 0.8], 3, "motor");
  }

  // Ön tekerleklerde fren kaliperi (fren bölgesi)
  for (const s of [1, -1]) {
    const z = s * cfg.bodyHalfW;
    const zc = z - s * 0.02;
    box(cfg.frontX - 0.08, cfg.wheelY + cfg.wheelR * 0.32, zc - s * 0.05,
        cfg.frontX + 0.08, cfg.wheelY + cfg.wheelR * 0.55, zc - s * 0.12, 3, "fren");
  }

  return { cls, paint, regions, cfg };
}
