/**
 * Kasa tipine göre parametrik tel kafes araç geometrisi.
 *
 * Eksenler: x = uzunluk (burun +x), y = yükseklik, z = genişlik.
 * Çizgi sınıfları (tasarım §02): 1 = ana kontur, 2 = yapı, 3 = ince detay.
 *
 * Üç ayrı çıktı kümesi üretilir:
 *  - `cls`     : sabit, boyanmayan çizgiler (iç mekân, mekanik aksam)
 *  - `paint`   : sabit dış yüzey, boya bölgesine göre (kaput/kapı/bagaj/gövde)
 *  - `parts`   : menteşeli açılan panolar (kaput, bagaj, 4 kapı) — her biri kendi
 *                pivotuna GÖRE (relative) koordinatlarla, sahnede ayrı bir Group'a
 *                konup eksen etrafında döndürülebilsin diye.
 *  - `regions` : bakım bölgeleri (motor/fren/amortisör) — vurgu için ayrı malzeme.
 */
export type RegionId = "motor" | "fren" | "amortisor" | "lastik" | "elektrik" | "egzoz" | "klima";

/** Bölge listesi — sahne raycast/rapor/senkron döngülerinde tek kaynak. */
export const ALL_REGION_IDS: RegionId[] = [
  "motor", "fren", "amortisor", "lastik", "elektrik", "egzoz", "klima",
];
export type BodyType = "sedan" | "hatchback" | "suv" | "minibus" | "kamyon" | "otobus" | "tir" | "motor";
export type PaintZone = "hood" | "doors" | "trunk" | "body";
export type OpenablePart = "hood" | "trunk" | "doorFL" | "doorFR" | "doorRL" | "doorRR";

type P = [number, number, number];
type Cls = 1 | 2 | 3;

export interface PartDef {
  id: OpenablePart;
  label: string;
  /** Menteşe noktası (dünya koordinatı) */
  pivot: P;
  /** Dönme ekseni (birim vektör) */
  axis: P;
  /** Tam açık durumdaki açı (radyan, işaretli) */
  maxAngle: number;
  paintZone: PaintZone;
  /** Çizgiler — pivota GÖRE koordinatlar */
  cls: Record<Cls, number[]>;
  /** Tıklama kutusu — pivota göre merkez + yarı boyutlar */
  hit: { center: P; half: P };
}

export interface BodyCfg {
  label: string;
  /** Yan profil: [x, y, yarıGenişlik] — kabin gövdeden dar */
  profile: [number, number, number][];
  /** Sağ-sol profili birleştiren enine çizgilerin profil indeksleri */
  cross2: number[];
  cross3: number[];
  /** Kaput panosunun izlediği profil indeksleri — ilki menteşe (cowl) */
  hoodIdx: number[];
  /** Bagaj/bagaj kapağı panosunun izlediği indeksler — ilki menteşe */
  tailIdx: number[];
  frontX: number;
  rearX: number;
  wheelR: number;
  wheelY: number;
  archR: number;
  sillY: number;
  bodyHalfW: number;
  glassZ: number;
  /** Yan cam poligonu [x, y] — x_min'den x_max'a giden üst sınır */
  window: [number, number][];
  /** Cam içi dikey pilye x konumları */
  pillars: number[];
  doorSeams: number[];
  beltY: number;
  engine: { x0: number; x1: number; y0: number; y1: number; halfZ: number };
  /** SUV gibi yüksek tabanlı kasalarda iç mekânın y kaydirması */
  lift: number;
  /** Motosiklet gibi kapalı kabini olmayan kasalarda iç mekân geometrisi üretilmez */
  noInterior?: boolean;
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
    hoodIdx: [6, 7, 8],
    tailIdx: [3, 2, 1],
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
    hoodIdx: [4, 5, 6],
    tailIdx: [2, 1, 0],
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
    hoodIdx: [4, 5, 6],
    tailIdx: [2, 1, 0],
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
  minibus: {
    label: "Minibüs",
    profile: [
      [-2.6, 0.5, 0.88], [-2.6, 1.82, 0.88], [-2.4, 1.95, 0.72], [0.8, 1.95, 0.72],
      [1.4, 1.25, 0.84], [2.2, 1.1, 0.84], [2.4, 0.85, 0.8], [2.4, 0.5, 0.86],
    ],
    cross2: [1, 2, 3, 4, 6],
    cross3: [0, 7],
    hoodIdx: [4, 5, 6],
    tailIdx: [2, 1, 0],
    frontX: 1.6, rearX: -1.7,
    wheelR: 0.38, wheelY: 0.38, archR: 0.48, sillY: 0.36,
    bodyHalfW: 0.88, glassZ: 0.74,
    window: [[-2.3, 1.25], [-2.35, 1.9], [0.75, 1.9], [1.32, 1.28]],
    pillars: [0.1, -0.8, -1.6],
    doorSeams: [0.1, -0.9],
    beltY: 1.15,
    engine: { x0: 1.45, x1: 2.1, y0: 0.58, y1: 0.98, halfZ: 0.42 },
    lift: 0.1,
  },
  kamyon: {
    label: "Kamyon",
    profile: [
      [-3.0, 0.6, 0.96], [-3.0, 1.9, 0.96], [-1.0, 1.9, 0.96], [-1.0, 0.7, 0.96],
      [0.6, 0.7, 0.9], [0.6, 2.1, 0.84], [1.6, 2.1, 0.84], [2.1, 1.3, 0.88],
      [2.3, 0.6, 0.92],
    ],
    cross2: [1, 2, 5, 6, 7],
    cross3: [0, 8],
    hoodIdx: [6, 7, 8],
    tailIdx: [2, 1, 0],
    frontX: 1.6, rearX: -2.0,
    wheelR: 0.46, wheelY: 0.46, archR: 0.58, sillY: 0.44,
    bodyHalfW: 0.96, glassZ: 0.8,
    window: [[0.65, 1.35], [0.65, 2.05], [1.55, 2.05], [2.02, 1.35]],
    pillars: [1.1],
    doorSeams: [1.5, 0.6],
    beltY: 1.28,
    engine: { x0: 1.5, x1: 2.15, y0: 0.65, y1: 1.1, halfZ: 0.45 },
    lift: 0.2,
  },
  otobus: {
    label: "Büyük Otobüs",
    profile: [
      [-3.8, 0.55, 1.0], [-3.8, 2.3, 1.0], [-3.6, 2.45, 0.85], [1.8, 2.45, 0.85],
      [2.7, 2.3, 0.85], [3.2, 1.4, 0.94], [3.3, 0.55, 0.98],
    ],
    cross2: [1, 2, 3, 4, 5],
    cross3: [0, 6],
    hoodIdx: [4, 5, 6],
    tailIdx: [2, 1, 0],
    frontX: 2.3, rearX: -2.6,
    wheelR: 0.48, wheelY: 0.48, archR: 0.6, sillY: 0.42,
    bodyHalfW: 1.0, glassZ: 0.86,
    window: [[-3.5, 1.35], [-3.5, 2.4], [1.75, 2.4], [2.65, 2.25]],
    pillars: [1.2, 0.2, -0.8, -1.8, -2.8],
    doorSeams: [2.1, 1.0],
    beltY: 1.3,
    engine: { x0: -3.6, x1: -2.8, y0: 0.6, y1: 1.1, halfZ: 0.48 },
    lift: 0.25,
  },
  tir: {
    label: "Tır",
    profile: [
      [-1.8, 0.65, 0.95], [-1.8, 0.75, 0.95], [0.4, 0.75, 0.95],
      [0.4, 2.4, 0.92], [1.6, 2.4, 0.92], [2.2, 1.45, 0.96],
      [2.4, 0.65, 1.0],
    ],
    cross2: [3, 4, 5],
    cross3: [0, 1, 6],
    hoodIdx: [4, 5, 6],
    tailIdx: [2, 1, 0],
    frontX: 1.7, rearX: -1.0,
    wheelR: 0.5, wheelY: 0.5, archR: 0.62, sillY: 0.46,
    bodyHalfW: 0.98, glassZ: 0.88,
    // Tır kabin penceresi — sadece ön kısım
    window: [[0.45, 1.45], [0.45, 2.35], [1.55, 2.35], [2.12, 1.48]],
    pillars: [1.0],
    // Tırda kabin kapıları sadece kabin bölümünde (0.4 ile 1.7 arası)
    doorSeams: [1.55, 0.48],
    beltY: 1.35,
    engine: { x0: 1.55, x1: 2.25, y0: 0.7, y1: 1.2, halfZ: 0.48 },
    lift: 0.22,
  },
  motor: {
    label: "Motosiklet",
    // 2 tekerlekli, dar gövde — sele, depo, arka fanórluk
    profile: [
      // arka → öne: [x, y, yarı-gen. (z)]
      [-1.05, 0.30, 0.14], // arka alt
      [-1.05, 0.55, 0.14], // arka sele altı
      [-0.55, 0.76, 0.13], // sele arka
      [0.05, 0.82, 0.12], // yakıt deposu
      [0.40, 0.76, 0.11], // depo ön
      [0.62, 0.68, 0.10], // diřek başı
      [1.05, 0.60, 0.10], // ön çatal orta
      [1.30, 0.32, 0.10], // ön alt
    ],
    cross2: [1, 3, 5],
    cross3: [0, 7],
    // Kapot/bagaj: ön fanarlık (küçük) ve arka kaporta
    hoodIdx: [5, 6, 7],    // ön fanarlık/far
    tailIdx: [2, 1, 0],    // arka kaporta
    frontX: 1.20, rearX: -0.85,
    wheelR: 0.30, wheelY: 0.30, archR: 0.36, sillY: 0.22,
    bodyHalfW: 0.13, glassZ: 0.10,
    // Küçük rüzgarüstü penceresi (camın olmadığı alanlar saydam)
    window: [[0.40, 0.56], [0.38, 0.66], [0.65, 0.66], [0.65, 0.56]],
    pillars: [],
    // doorSeams: doorX[0]=winXMax=0.65, doorX[1]=doorSeams[0]=0.65 → 0 genişlik → kapı yok
    doorSeams: [0.65, 0.65],
    beltY: 0.62,
    // Motosiklet motoru: akşam blok boyutları gerçekçi
    engine: { x0: -0.05, x1: 0.52, y0: 0.22, y1: 0.58, halfZ: 0.12 },
    lift: 0,
    noInterior: true,
  },
};

export interface CarWireframe {
  /** Boyanmayan çizgiler (iç mekan, mekanik parçalar) — sabit şema rengi */
  cls: Record<Cls, number[]>;
  /** Boyanabilir sabit dış yüzey çizgileri */
  paint: Record<PaintZone, Record<Cls, number[]>>;
  /** Menteşeli açılan panolar */
  parts: Record<OpenablePart, PartDef>;
  regions: Record<RegionId, number[]>;
  cfg: BodyCfg;
}

/** Çizgi biriktirici — hedefi (sabit / boyalı / parça / bölge) çağıran belirler. */
interface Emitter {
  add(a: P, b: P, c: Cls): void;
  poly(pts: P[], c: Cls, close?: boolean): void;
  circle(cx: number, cy: number, cz: number, r: number, plane: "xy" | "xz" | "yz", n: number, c: Cls): void;
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: Cls): void;
  /** Silindir: iki halka + n adet dikey bağ */
  cyl(cx: number, cy: number, cz: number, r: number, h: number, axis: "x" | "y", n: number, c: Cls): void;
}

function makeEmitter(sink: (a: P, b: P, c: Cls) => void): Emitter {
  const add = (a: P, b: P, c: Cls) => sink(a, b, c);
  const poly = (pts: P[], c: Cls, close = false): void => {
    for (let i = 0; i < pts.length - 1; i++) add(pts[i], pts[i + 1], c);
    if (close && pts.length > 2) add(pts[pts.length - 1], pts[0], c);
  };
  const ring = (
    cx: number, cy: number, cz: number, r: number, plane: "xy" | "xz" | "yz", n: number,
  ): P[] => {
    const pts: P[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      if (plane === "xy") pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t), cz]);
      else if (plane === "xz") pts.push([cx + r * Math.cos(t), cy, cz + r * Math.sin(t)]);
      else pts.push([cx, cy + r * Math.cos(t), cz + r * Math.sin(t)]);
    }
    return pts;
  };
  const circle: Emitter["circle"] = (cx, cy, cz, r, plane, n, c) => poly(ring(cx, cy, cz, r, plane, n), c, true);
  const box: Emitter["box"] = (x0, y0, z0, x1, y1, z1, c) => {
    const v: P[] = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const [i, j] of e) add(v[i], v[j], c);
  };
  const cyl: Emitter["cyl"] = (cx, cy, cz, r, h, axis, n, c) => {
    const plane = axis === "x" ? "yz" : "xz";
    const a = ring(cx, cy, cz, r, plane, n);
    const bOff: P = axis === "x" ? [h, 0, 0] : [0, h, 0];
    const b = a.map((p) => [p[0] + bOff[0], p[1] + bOff[1], p[2] + bOff[2]] as P);
    poly(a, c, true);
    poly(b, c, true);
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 6))) add(a[i], b[i], c);
  };
  return { add, poly, circle, box, cyl };
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
  const regions: Record<RegionId, number[]> = {
    motor: [], fren: [], amortisor: [], lastik: [], elektrik: [], egzoz: [], klima: [],
  };
  const parts = {} as Record<OpenablePart, PartDef>;

  const L = cfg.lift;
  const e = cfg.engine;
  const rearBottom = cfg.profile[0];
  const noseBottom = cfg.profile[cfg.profile.length - 1];
  const noseTop = cfg.profile[cfg.profile.length - 2];
  const rearTop = cfg.profile[1];
  const noseX = noseBottom[0];
  const noseHW = noseBottom[2];
  const rX = rearBottom[0];
  const rearHW = rearBottom[2];

  // Boya bölgesi sınırları: kaput/gövde sınırı ön cam tabanı, gövde/bagaj sınırı
  // arka cam tabanı; kabin aralığında kemer hizasının altı kapı, üstü gövde/tavan.
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

  /** Sabit, boyanmayan (iç mekân + mekanik) */
  const S = makeEmitter((a, b, c) => { cls[c].push(a[0], a[1], a[2], b[0], b[1], b[2]); });
  /** Sabit dış yüzey — boya bölgesi otomatik */
  const B = makeEmitter((a, b, c) => {
    const arr = paint[paintZoneOf(a, b)][c];
    arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  });
  const R = (region: RegionId): Emitter => makeEmitter((a, b, c) => {
    void c;
    regions[region].push(a[0], a[1], a[2], b[0], b[1], b[2]);
  });
  const Rmotor = R("motor");
  const Rfren = R("fren");
  const Ramort = R("amortisor");
  const Rlastik = R("lastik");
  const Relektrik = R("elektrik");
  const Regzoz = R("egzoz");
  const Rklima = R("klima");

  /** Menteşeli parça tanımlar; dönen emitter pivota göre koordinat yazar. */
  function definePart(
    id: OpenablePart, label: string, pivot: P, axis: P, maxAngle: number,
    paintZone: PaintZone, hitCenter: P, hitHalf: P,
  ): Emitter {
    const def: PartDef = {
      id, label, pivot, axis, maxAngle, paintZone,
      cls: { 1: [], 2: [], 3: [] },
      hit: {
        center: [hitCenter[0] - pivot[0], hitCenter[1] - pivot[1], hitCenter[2] - pivot[2]],
        half: hitHalf,
      },
    };
    parts[id] = def;
    return makeEmitter((a, b, c) => {
      def.cls[c].push(
        a[0] - pivot[0], a[1] - pivot[1], a[2] - pivot[2],
        b[0] - pivot[0], b[1] - pivot[1], b[2] - pivot[2],
      );
    });
  }

  // ---------- Yan cam sınır yardımcıları ----------
  const winPts = cfg.window;
  const winXMin = Math.min(...winPts.map((p) => p[0]));
  const winXMax = Math.max(...winPts.map((p) => p[0]));
  /** Cam poligonunun verilen x'teki üst (max) ve alt (min) y sınırı. */
  function windowEdgeAt(x: number, edge: "top" | "bottom"): number {
    let best = edge === "top" ? -Infinity : Infinity;
    for (let i = 0; i < winPts.length; i++) {
      const p = winPts[i];
      const q = winPts[(i + 1) % winPts.length];
      const lo = Math.min(p[0], q[0]);
      const hi = Math.max(p[0], q[0]);
      if (x < lo - 1e-6 || x > hi + 1e-6) continue;
      const t = Math.abs(q[0] - p[0]) < 1e-6 ? 0 : (x - p[0]) / (q[0] - p[0]);
      const y = p[1] + (q[1] - p[1]) * t;
      best = edge === "top" ? Math.max(best, y) : Math.min(best, y);
    }
    if (!isFinite(best)) return edge === "top" ? cfg.beltY + 0.3 : cfg.beltY;
    return best;
  }
  /** x0→x1 arası üst cam kenarını, poligon köşelerinden de geçerek örnekler. */
  function windowTopPath(x0: number, x1: number, z: number): P[] {
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    const xs = new Set<number>([lo, hi]);
    for (const p of winPts) if (p[0] > lo && p[0] < hi) xs.add(p[0]);
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted.map((x) => [x, windowEdgeAt(x, "top"), z] as P);
  }

  // ================= SABİT GÖVDE =================

  // Gövde profili (iki yan) + enine bağlantılar — dış yüzey, boyanabilir
  const sideL: P[] = cfg.profile.map((p) => [p[0], p[1], p[2]]);
  const sideR: P[] = cfg.profile.map((p) => [p[0], p[1], -p[2]]);
  B.poly(sideL, 1);
  B.poly(sideR, 1);
  for (const i of cfg.cross2) B.add(sideL[i], sideR[i], 2);
  for (const i of cfg.cross3) B.add(sideL[i], sideR[i], 3);

  // Alt hat + tekerlek davlumbazları
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
    B.poly(pts, 1);
  }
  bottomLine(cfg.bodyHalfW);
  bottomLine(-cfg.bodyHalfW);

  // Tekerlekler; lastik gövdesi + jant = "lastik" bölgesi, öndeki disk/kaliper = "fren".
  // Tekerlek gerçek bir silindir olarak kurulur: dış yüz + iç yüz + aradaki sırt.
  function wheel(cx: number, z: number, front: boolean): void {
    const cy = cfg.wheelY;
    const r = cfg.wheelR;
    const side: 1 | -1 = z > 0 ? 1 : -1;
    const wW = r * 0.62;              // lastik genişliği
    const zo = z;                     // dış yüz (gövde dışına bakan)
    const zi = z - side * wW;         // iç yüz
    const T = Rlastik;
    /** Tekerlek düzlemindeki kutupsal nokta. */
    const p = (rad: number, ang: number, zz: number): P =>
      [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang), zz];

    // ---- Lastik: sırt silindiri + iki yanak ----
    T.circle(cx, cy, zo, r, "xy", 24, 1);
    T.circle(cx, cy, zi, r, "xy", 24, 2);
    for (let i = 0; i < 16; i++) {                        // sırt blokları
      const a = (i / 16) * Math.PI * 2;
      T.add(p(r, a, zo), p(r, a, zi), 3);
    }
    for (const t of [0.34, 0.66]) {                       // çevresel su kanalları
      T.circle(cx, cy, z - side * wW * t, r * 0.99, "xy", 20, 3);
    }
    T.circle(cx, cy, zo, r * 0.87, "xy", 20, 3);          // omuz çizgisi
    T.circle(cx, cy, zi, r * 0.87, "xy", 16, 3);

    // ---- Jant: kovan + göbek + beş çift tel ----
    const rimR = r * 0.66;                                // jant flanşı
    const hubR = r * 0.22;
    const zh = zo - side * r * 0.07;                      // göbek yüzü içeride (çanaklı jant)
    T.circle(cx, cy, zo, rimR, "xy", 20, 2);
    T.circle(cx, cy, zi, rimR, "xy", 16, 3);
    T.circle(cx, cy, zh, hubR, "xy", 12, 2);
    T.circle(cx, cy, zh, r * 0.1, "xy", 8, 3);            // göbek kapağı
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.5;
      // konik tel: göbekte dar, flanşta geniş
      T.poly([
        p(hubR, a - 0.11, zh), p(rimR * 0.97, a - 0.21, zo),
        p(rimR * 0.97, a + 0.21, zo), p(hubR, a + 0.11, zh),
      ], 3, true);
      // teller arasındaki boşluğun jant flanşına bağlantısı
      T.add(p(rimR * 0.97, a + 0.32, zo), p(rimR, a + 0.32, zi), 3);
      // bijon somunu
      T.circle(cx + r * 0.13 * Math.cos(a), cy + r * 0.13 * Math.sin(a), zh, r * 0.045, "xy", 5, 3);
    }
    // sibop
    T.add(p(rimR * 0.8, 3.6, zo), p(rimR * 0.95, 3.6, zo + side * 0.02), 3);

    // ---- Fren diski: havalandırma delikli, kanallı ----
    const E = front ? Rfren : Rlastik;
    const zd = z - side * wW * 0.42;                      // disk, lastiğin ortasına yakın
    const dR = r * 0.58;
    E.circle(cx, cy, zd, dR, "xy", 18, front ? 2 : 3);
    E.circle(cx, cy, zd, dR * 0.72, "xy", 14, 3);         // sürtünme bandı iç sınırı
    E.circle(cx, cy, zd, dR * 0.42, "xy", 10, 3);         // göbek (şapka)
    for (let i = 0; i < 8; i++) {                         // havalandırma delikleri
      const a = (i / 8) * Math.PI * 2 + 0.25;
      E.circle(cx + dR * 0.86 * Math.cos(a), cy + dR * 0.86 * Math.sin(a), zd, r * 0.035, "xy", 5, 3);
    }
    for (let i = 0; i < 12; i++) {                        // iç havalandırma kanalları
      const a = (i / 12) * Math.PI * 2;
      E.add(p(dR * 0.74, a, zd), p(dR * 0.99, a, zd - side * 0.012), 3);
    }
  }
  wheel(cfg.frontX, cfg.bodyHalfW, true);
  wheel(cfg.frontX, -cfg.bodyHalfW, true);
  wheel(cfg.rearX, cfg.bodyHalfW, false);
  wheel(cfg.rearX, -cfg.bodyHalfW, false);

  // A / C sütunları (sabit yapı — kapılar açılınca yerinde kalır)
  for (const s of [1, -1]) {
    const z = cfg.glassZ * s;
    const aBase: P = [winXMax, windowEdgeAt(winXMax, "bottom"), z];
    const aTop: P = [cfg.window[2][0], cfg.window[2][1], z];
    B.add(aBase, aTop, 2);
    const cBase: P = [winXMin, windowEdgeAt(winXMin, "bottom"), z];
    const cTop: P = [cfg.window[1][0], cfg.window[1][1], z];
    B.add(cBase, cTop, 2);
  }

  // Kapı açıklığı (aperture): kapılar açılınca görünen sabit çerçeve
  const doorX = [winXMax, cfg.doorSeams[0], cfg.doorSeams[1]];
  for (const s of [1, -1]) {
    const z = s * cfg.bodyHalfW;
    B.add([doorX[0], cfg.sillY + 0.02, z], [doorX[2], cfg.sillY + 0.02, z], 2); // eşik
    B.add([doorX[0], cfg.beltY, z], [doorX[2], cfg.beltY, z], 3);               // kemer hattı
  }

  // Sabit çeyrek cam (arka kapının gerisinde kalan cam bölümü)
  if (winXMin < doorX[2] - 0.02) {
    for (const s of [1, -1]) {
      const z = cfg.glassZ * s;
      const path = windowTopPath(winXMin, doorX[2], z);
      B.poly(path, 3);
      B.add([winXMin, windowEdgeAt(winXMin, "bottom"), z], [doorX[2], windowEdgeAt(doorX[2], "bottom"), z], 3);
      B.add([doorX[2], windowEdgeAt(doorX[2], "bottom"), z], [doorX[2], windowEdgeAt(doorX[2], "top"), z], 3);
    }
  }

  // Karakter çizgisi (gövde boyunca)
  for (const s of [1, -1]) {
    const z = s * cfg.bodyHalfW;
    B.add([rearBottom[0] + 0.15, cfg.sillY + 0.3, z], [noseBottom[0] - 0.15, cfg.sillY + 0.34, z], 3);
  }

  // Ön ızgara + farlar + tamponlar + plakalar
  const faceMidY = (noseTop[1] + noseBottom[1]) / 2;
  const grBot = cfg.sillY + 0.1;
  const grTop = faceMidY + 0.03;
  for (let i = -3; i <= 3; i++) {
    const z = (i / 3) * noseHW * 0.55;
    B.add([noseX, grBot, z], [noseX, grTop, z], 3);
  }
  B.add([noseX, grBot, -noseHW * 0.55], [noseX, grBot, noseHW * 0.55], 2);
  B.add([noseX, grTop, -noseHW * 0.55], [noseX, grTop, noseHW * 0.55], 2);

  function lamp(x: number, topY: number, hw: number, depth: number): void {
    for (const s of [1, -1]) {
      const zc = s * (hw * 0.78);
      B.poly([
        [x, topY - 0.02, zc - s * 0.02],
        [x, topY - 0.02, zc + s * 0.22],
        [x, topY - 0.02 - depth, zc + s * 0.2],
        [x, topY - 0.02 - depth, zc - s * 0.02],
      ], 2, true);
      // lamba içi mercek
      B.circle(x + 0.004, topY - 0.02 - depth * 0.5, zc + s * 0.11, depth * 0.28, "yz", 8, 3);
    }
  }
  lamp(noseX, noseTop[1], noseHW, 0.13);
  lamp(rX, rearTop[1], rearHW, 0.15);

  B.add([noseX, cfg.sillY + 0.02, -noseHW], [noseX, cfg.sillY + 0.02, noseHW], 3);
  B.add([rX, cfg.sillY + 0.02, -rearHW], [rX, cfg.sillY + 0.02, rearHW], 3);
  function plate(x: number): void {
    B.poly([
      [x, cfg.sillY + 0.13, -0.18], [x, cfg.sillY + 0.13, 0.18],
      [x, cfg.sillY + 0.25, 0.18], [x, cfg.sillY + 0.25, -0.18],
    ], 3, true);
  }
  plate(noseX + 0.002);
  plate(rX - 0.002);

  // Tavan kaburgaları
  for (const wp of cfg.window) {
    if (wp[1] > cfg.beltY + 0.15) {
      B.add([wp[0], wp[1], cfg.glassZ], [wp[0], wp[1], -cfg.glassZ], 3);
    }
  }

  // ================= AÇILIR PARÇALAR =================

  // ---- Kaput ----
  {
    const idx = cfg.hoodIdx;
    const pts = idx.map((i) => cfg.profile[i]);
    const hinge = pts[0];
    const pivot: P = [hinge[0], hinge[1], 0];
    const inset = 0.82;
    const lift = 0.012;
    const hx0 = pts[0][0], hx1 = pts[pts.length - 1][0];
    const H = definePart(
      "hood", "Kaput", pivot, [0, 0, 1], 0.85, "hood",
      [(hx0 + hx1) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2 + 0.05, 0],
      [Math.abs(hx1 - hx0) / 2, 0.09, pts[0][2] * inset],
    );
    const edge = (s: number): P[] => pts.map((p) => [p[0], p[1] + lift, s * p[2] * inset] as P);
    H.poly(edge(1), 1);
    H.poly(edge(-1), 1);
    for (const p of pts) H.add([p[0], p[1] + lift, p[2] * inset], [p[0], p[1] + lift, -p[2] * inset], 2);
    // orta bel + iki karakter çizgisi
    H.poly(pts.map((p) => [p[0], p[1] + lift + 0.004, 0] as P), 3);
    for (const s of [0.5, -0.5]) {
      H.poly(pts.map((p) => [p[0], p[1] + lift, s * p[2] * inset] as P), 3);
    }
    // kaput altı takviye kaburgaları (açıkken görünür)
    for (const t of [0.35, 0.7]) {
      const i0 = pts[0], i1 = pts[pts.length - 1];
      const x = i0[0] + (i1[0] - i0[0]) * t;
      const y = i0[1] + (i1[1] - i0[1]) * t - 0.03;
      const hw = (i0[2] + (i1[2] - i0[2]) * t) * inset * 0.85;
      H.add([x, y, hw], [x, y, -hw], 3);
    }
  }

  // ---- Bagaj / bagaj kapağı ----
  {
    const idx = cfg.tailIdx;
    const pts = idx.map((i) => cfg.profile[i]);
    const hinge = pts[0];
    const pivot: P = [hinge[0], hinge[1], 0];
    const inset = 0.84;
    const lift = 0.012;
    const tx0 = pts[0][0], tx1 = pts[pts.length - 1][0];
    const T = definePart(
      "trunk", "Bagaj", pivot, [0, 0, 1], -0.66, "trunk",
      [(tx0 + tx1) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2 + 0.04, 0],
      [Math.abs(tx1 - tx0) / 2 + 0.02, 0.12, pts[0][2] * inset],
    );
    const edge = (s: number): P[] => pts.map((p) => [p[0], p[1] + lift, s * p[2] * inset] as P);
    T.poly(edge(1), 1);
    T.poly(edge(-1), 1);
    for (const p of pts) T.add([p[0], p[1] + lift, p[2] * inset], [p[0], p[1] + lift, -p[2] * inset], 2);
    T.poly(pts.map((p) => [p[0], p[1] + lift + 0.004, 0] as P), 3);
    // kapak kolu / açma çukuru
    const mid = pts[Math.floor(pts.length / 2)];
    T.poly([
      [mid[0] + 0.05, mid[1] + lift, -0.12], [mid[0] + 0.05, mid[1] + lift, 0.12],
      [mid[0] - 0.05, mid[1] + lift, 0.12], [mid[0] - 0.05, mid[1] + lift, -0.12],
    ], 3, true);
  }

  // ---- Kapılar ----
  function buildDoor(
    id: OpenablePart, label: string, xHinge: number, xEnd: number, side: 1 | -1, front: boolean,
  ): void {
    const z = side * cfg.bodyHalfW;
    const zi = side * (cfg.bodyHalfW - 0.055);  // iç döşeme düzlemi
    const zg = side * cfg.glassZ;
    const yB = cfg.sillY + 0.03;                 // kapı alt kenarı
    const yT = cfg.beltY;                        // kemer hattı
    const pivot: P = [xHinge, yB, z];
    // Sol taraf (+z) dışa açılırken +açı, sağ taraf (−z) −açı gerektirir.
    const maxAngle = side === 1 ? 1.05 : -1.05;
    const D = definePart(
      id, label, pivot, [0, 1, 0], maxAngle, "doors",
      [(xHinge + xEnd) / 2, (yB + yT) / 2 + 0.12, z],
      [Math.abs(xEnd - xHinge) / 2, (yT - yB) / 2 + 0.28, 0.06],
    );

    // Dış sac panel
    D.poly([
      [xHinge, yB, z], [xEnd, yB, z], [xEnd, yT, z], [xHinge, yT, z],
    ], 1, true);
    // Kapı kolu
    const hx = xHinge + (xEnd - xHinge) * 0.22;
    D.poly([
      [hx, yT - 0.07, z], [hx + (xEnd - xHinge) * 0.16, yT - 0.07, z],
      [hx + (xEnd - xHinge) * 0.16, yT - 0.12, z], [hx, yT - 0.12, z],
    ], 2, true);
    // Karakter çizgisi + alt marşpiyel dikişi
    D.add([xHinge, yB + 0.28, z], [xEnd, yB + 0.3, z], 3);
    D.add([xHinge + 0.02, yB + 0.05, z], [xEnd - 0.02, yB + 0.05, z], 3);

    // Cam çerçevesi
    const topPath = windowTopPath(xHinge, xEnd, zg);
    if (topPath.length >= 2) {
      D.poly(topPath, 2);
      const yb0 = windowEdgeAt(xHinge, "bottom");
      const yb1 = windowEdgeAt(xEnd, "bottom");
      D.add([xHinge, yb0, zg], [xEnd, yb1, zg], 2);
      D.add([xHinge, yb0, zg], [xHinge, windowEdgeAt(xHinge, "top"), zg], 2);
      D.add([xEnd, yb1, zg], [xEnd, windowEdgeAt(xEnd, "top"), zg], 2);
      // cam yüzeyi ipucu (yatay yansıma çizgisi)
      const ym = (yb0 + windowEdgeAt(xHinge, "top")) / 2;
      D.add([xHinge + 0.04, ym, zg], [xEnd - 0.04, ym + 0.02, zg], 3);
    }

    // ---- İç döşeme (kapı açılınca görünür) ----
    D.poly([
      [xHinge, yB + 0.02, zi], [xEnd, yB + 0.02, zi], [xEnd, yT - 0.02, zi], [xHinge, yT - 0.02, zi],
    ], 3, true);
    // Kolçak
    const ax0 = xHinge + (xEnd - xHinge) * 0.15;
    const ax1 = xHinge + (xEnd - xHinge) * 0.62;
    D.poly([
      [ax0, yT - 0.16, zi], [ax1, yT - 0.16, zi], [ax1, yT - 0.24, zi], [ax0, yT - 0.24, zi],
    ], 3, true);
    // Hoparlör
    D.circle(xHinge + (xEnd - xHinge) * 0.78, yB + 0.14, zi, 0.075, "xy", 12, 3);
    D.circle(xHinge + (xEnd - xHinge) * 0.78, yB + 0.14, zi, 0.03, "xy", 8, 3);
    // İç açma kolu
    D.poly([
      [ax0 + 0.02, yT - 0.09, zi], [ax0 + 0.12, yT - 0.09, zi], [ax0 + 0.12, yT - 0.13, zi],
    ], 3);
    // Cam krikosu düğmeleri
    for (let i = 0; i < 2; i++) {
      const bx = ax0 + 0.06 + i * 0.09;
      D.box(bx, yT - 0.2, zi - side * 0.008, bx + 0.05, yT - 0.17, zi, 3);
    }
    // Menteşe kolları (açıkken görünür)
    for (const yy of [yB + 0.08, yT - 0.1]) {
      D.add([xHinge, yy, z], [xHinge - 0.06, yy, zi], 3);
    }

    // Ayna — ön kapılara bağlı
    if (front) {
      const zo = side * (cfg.bodyHalfW + 0.13);
      D.poly([
        [xHinge - 0.04, yT - 0.02, z], [xHinge - 0.08, yT - 0.05, zo],
        [xHinge - 0.16, yT - 0.12, zo], [xHinge - 0.12, yT - 0.09, z],
      ], 3, true);
    }
  }
  // Büyük araçlarda (otobüs/kamyon/tır) ve motosiklette kapı geometrisi
  // anlamsız görünür.
  const hasFrontDoor = Math.abs(doorX[1] - doorX[0]) > 0.25;
  const hasRearDoor = Math.abs(doorX[2] - doorX[1]) > 0.35;
  if (hasFrontDoor) {
    buildDoor("doorFL", "Sol Ön Kapı", doorX[0], doorX[1], -1, true);
    buildDoor("doorFR", "Sağ Ön Kapı", doorX[0], doorX[1], 1, true);
  }
  if (hasRearDoor) {
    buildDoor("doorRL", "Sol Arka Kapı", doorX[1], doorX[2], -1, false);
    buildDoor("doorRR", "Sağ Arka Kapı", doorX[1], doorX[2], 1, false);
  }

  // ---- Koltuklar ----
  function seat(cx: number, cz: number, front: boolean): void {
    const hw = 0.2;
    const y0 = 0.52 + L;
    const backTop = (front ? 1.02 : 0.99) + L;
    const bx1 = cx - (front ? 0.17 : 0.14);
    const cushionFront = cx + (front ? 0.4 : 0.4);
    // oturma yastığı
    S.poly([
      [cx, y0, cz - hw], [cushionFront, y0 + 0.025, cz - hw],
      [cushionFront, y0 + 0.025, cz + hw], [cx, y0, cz + hw],
    ], 2, true);
    // yan destekler
    for (const s of [-1, 1]) {
      S.add([cx + 0.04, y0 + 0.045, cz + s * hw], [cushionFront - 0.06, y0 + 0.06, cz + s * hw], 3);
    }
    // yastık dikişleri
    for (const t of [0.33, 0.66]) {
      const zz = cz - hw + 2 * hw * t;
      S.add([cx + 0.04, y0 + 0.01, zz], [cushionFront - 0.03, y0 + 0.03, zz], 3);
    }
    // sırtlık
    S.poly([
      [cx, y0, cz - hw], [bx1, backTop, cz - hw],
      [bx1, backTop, cz + hw], [cx, y0, cz + hw],
    ], 2, true);
    S.add([cx - 0.085, (y0 + backTop) / 2, cz - hw], [cx - 0.085, (y0 + backTop) / 2, cz + hw], 3);
    S.add([(cx + bx1) / 2, (y0 + backTop) / 2, cz], [bx1, backTop, cz], 3);
    // baş desteği + kolonları
    const hy = backTop + 0.03;
    S.box(bx1 - 0.05, hy, cz - 0.085, bx1 + 0.05, hy + 0.13, cz + 0.085, 3);
    for (const s of [-1, 1]) S.add([bx1, backTop, cz + s * 0.05], [bx1, hy, cz + s * 0.05], 3);
    // ray + taban
    if (front) {
      for (const s of [-1, 1]) {
        S.add([cx + 0.02, cfg.sillY + 0.05, cz + s * 0.14], [cushionFront - 0.06, cfg.sillY + 0.05, cz + s * 0.14], 3);
      }
      S.add([cx + 0.14, cfg.sillY + 0.05, cz], [cx + 0.14, y0, cz], 3);
    }
  }
  if (!cfg.noInterior) {
    seat(0.1, -0.34, true);  // Sürücü koltuğu (Sol - LHD)
    seat(0.1, 0.34, true);   // Yolcu koltuğu (Sağ - LHD)
    seat(-0.72, -0.34, false);
    seat(-0.72, 0.34, false);
    // arka koltuk ortak oturağı
    S.add([-0.72, 0.545 + L, -0.14], [-0.72, 0.545 + L, 0.14], 3);

    // ---- Torpido / gösterge paneli ----
    {
      const dashX = 0.98;
      const dz = cfg.bodyHalfW - 0.1;
      const dy0 = 0.7 + L, dy1 = 0.96 + L;
      // ana pano gövdesi
      S.poly([
        [dashX + 0.08, dy0, dz], [dashX + 0.08, dy0, -dz],
        [dashX - 0.02, dy1, -dz], [dashX - 0.02, dy1, dz],
      ], 2, true);
      S.add([dashX + 0.08, dy0, dz], [dashX - 0.02, dy1, dz], 3);
      S.add([dashX + 0.08, dy0, -dz], [dashX - 0.02, dy1, -dz], 3);
      // gösterge yuvası (sürücü tarafı, -z LHD)
      S.box(dashX - 0.06, dy1 - 0.14, -0.5, dashX + 0.03, dy1 + 0.02, -0.18, 3);
      S.circle(dashX - 0.03, dy1 - 0.06, -0.26, 0.055, "yz", 12, 3);
      S.circle(dashX - 0.03, dy1 - 0.06, -0.42, 0.055, "yz", 12, 3);
      // orta konsol ekranı
      S.poly([
        [dashX - 0.01, dy1 - 0.04, -0.13], [dashX - 0.01, dy1 - 0.04, 0.13],
        [dashX + 0.02, dy1 - 0.2, 0.13], [dashX + 0.02, dy1 - 0.2, -0.13],
      ], 3, true);
      // havalandırma menfezleri
      for (const zc of [-0.52, -0.2, 0.2, 0.52]) {
        S.box(dashX + 0.01, dy1 - 0.13, zc - 0.06, dashX + 0.05, dy1 - 0.05, zc + 0.06, 3);
      }
      // klima/radyo düğme sırası
      for (let i = -1; i <= 1; i++) {
        S.circle(dashX + 0.04, dy0 + 0.09, i * 0.1, 0.022, "yz", 8, 3);
      }
      // torpido gözü (yolcu tarafı, +z LHD)
      S.poly([
        [dashX + 0.03, dy0 + 0.04, 0.22], [dashX + 0.03, dy0 + 0.04, 0.56],
        [dashX + 0.01, dy1 - 0.14, 0.56], [dashX + 0.01, dy1 - 0.14, 0.22],
      ], 3, true);
    }

    // ---- Direksiyon + kolon + pedallar ----
    {
      const C: P = [0.72, 0.88 + L, -0.34];
      const r = 0.135;
      const u: P = [0, 0, 1];
      const v: P = [0.41, -0.912, 0];
      const rim = (rad: number): P[] => {
        const pts: P[] = [];
        for (let i = 0; i < 14; i++) {
          const t = (i / 14) * Math.PI * 2;
          pts.push([
            C[0] + rad * (Math.cos(t) * u[0] + Math.sin(t) * v[0]),
            C[1] + rad * (Math.cos(t) * u[1] + Math.sin(t) * v[1]),
            C[2] + rad * (Math.cos(t) * u[2] + Math.sin(t) * v[2]),
          ]);
        }
        return pts;
      };
      S.poly(rim(r), 2, true);
      S.poly(rim(r * 0.26), 3, true);   // göbek
      // üç kol
      const outer = rim(r * 0.95), inner = rim(r * 0.26);
      for (const i of [0, 5, 9]) S.add(inner[i], outer[i], 3);
      // kolon + sinyal kolları
      S.add(C, [0.95, 0.8 + L, -0.34], 3);
      for (const s of [-1, 1]) {
        S.add([0.85, 0.86 + L, -0.34], [0.83, 0.85 + L, -0.34 + s * 0.16], 3);
      }
      // pedallar
      for (let i = 0; i < 3; i++) {
        const pz = -0.34 + (i - 1) * 0.11;
        S.poly([
          [1.02, 0.44 + L, pz - 0.03], [1.02, 0.44 + L, pz + 0.03],
          [1.07, 0.52 + L, pz + 0.03], [1.07, 0.52 + L, pz - 0.03],
        ], 3, true);
      }
    }

    // ---- Orta konsol: vites, el freni, bardaklık ----
    {
      const cy0 = cfg.sillY + 0.06, cy1 = 0.64 + L;
      S.box(0.18, cy0, -0.14, 0.86, cy1, 0.14, 3);
      // vites kolu + topuz
      S.add([0.6, cy1, 0], [0.56, cy1 + 0.16, 0], 2);
      S.circle(0.555, cy1 + 0.19, 0, 0.042, "xy", 10, 3);
      S.circle(0.6, cy1 + 0.005, 0, 0.07, "xz", 10, 3);   // körük tabanı
      // el freni
      S.add([0.3, cy1, 0.06], [0.16, cy1 + 0.13, 0.06], 3);
      // bardaklıklar
      for (const cx of [0.34, 0.46]) S.circle(cx, cy1 + 0.002, -0.06, 0.045, "xz", 10, 3);
    }

    // ---- Tavan iç detayları ----
    {
      const zt = cfg.glassZ - 0.04;
      const roofPts = cfg.window.filter((p) => p[1] > cfg.beltY + 0.15);
      if (roofPts.length >= 2) {
        const rx0 = Math.min(...roofPts.map((p) => p[0]));
        const rx1 = Math.max(...roofPts.map((p) => p[0]));
        const ry = Math.min(...roofPts.map((p) => p[1])) - 0.03;
        // tavan döşemesi kaburgaları
        for (const t of [0.25, 0.5, 0.75]) {
          const x = rx0 + (rx1 - rx0) * t;
          S.add([x, ry, zt], [x, ry, -zt], 3);
        }
        // iç dikiz aynası
        const mx = rx1 - 0.06;
        S.box(mx - 0.03, ry - 0.1, -0.1, mx + 0.01, ry - 0.04, 0.1, 3);
        S.add([mx - 0.01, ry - 0.04, 0], [mx - 0.01, ry, 0], 3);
        // güneşlikler
        for (const s of [-1, 1]) {
          S.poly([
            [rx1 - 0.02, ry - 0.02, s * 0.14], [rx1 - 0.02, ry - 0.02, s * 0.42],
            [rx1 - 0.2, ry - 0.05, s * 0.42], [rx1 - 0.2, ry - 0.05, s * 0.14],
          ], 3, true);
        }
        // tavan lambası
        S.box(mx - 0.14, ry - 0.03, -0.06, mx - 0.06, ry, 0.06, 3);
      }
    }

    // ---- Bagaj içi (kapak açılınca görünür) ----
    {
      const ty = cfg.sillY + 0.06;
      const tz = cfg.bodyHalfW - 0.1;
      const tx0 = rX + 0.12;
      const tx1 = trunkStartX + 0.06;
      S.poly([[tx0, ty, tz], [tx1, ty, tz], [tx1, ty, -tz], [tx0, ty, -tz]], 3, true);
      // stepne yuvası
      S.circle((tx0 + tx1) / 2, ty - 0.005, 0, 0.3, "xz", 16, 3);
      S.circle((tx0 + tx1) / 2, ty - 0.005, 0, 0.1, "xz", 10, 3);
      // arka koltuk arkalığı (bagaj tarafından)
      S.add([tx1, ty, tz], [tx1 + 0.06, cfg.beltY - 0.06, tz], 3);
      S.add([tx1, ty, -tz], [tx1 + 0.06, cfg.beltY - 0.06, -tz], 3);
      S.add([tx1 + 0.06, cfg.beltY - 0.06, tz], [tx1 + 0.06, cfg.beltY - 0.06, -tz], 3);
    } // /bagaj bloğu
  } // /if(!cfg.noInterior) — koltuk + torpido + direksiyon + bagaj

  // ================= MOTOR BÖLMESİ (detaylı) =================

  Rmotor.box(e.x0, e.y0, -e.halfZ, e.x1, e.y1, e.halfZ, 2);
  Rmotor.box(e.x0 + 0.06, e.y1, -e.halfZ * 0.72, e.x1 - 0.06, e.y1 + 0.1, e.halfZ * 0.72, 3);
  for (let i = 1; i <= 3; i++) {
    const x = e.x0 + ((e.x1 - e.x0) * i) / 4;
    Rmotor.add([x, e.y1, e.halfZ * 0.72], [x, e.y1 + 0.1, e.halfZ * 0.72], 3);
    Rmotor.add([x, e.y0, e.halfZ], [x, e.y1, e.halfZ], 3);
  }
  // yağ doldurma kapağı + çubuk
  Rmotor.circle(e.x0 + 0.14, e.y1 + 0.1, 0.12, 0.05, "xz", 10, 3);
  Rmotor.add([e.x0 + 0.3, e.y1 + 0.02, -0.2], [e.x0 + 0.34, e.y1 + 0.12, -0.22], 3);

  // Emme manifoldu: plenum + 4 runner
  {
    const px = e.x0 + 0.1;
    Rmotor.cyl(px, e.y1 + 0.14, -0.02, 0.06, 0.34, "x", 10, 3);
    for (let i = 0; i < 4; i++) {
      const zz = -e.halfZ * 0.55 + (i * e.halfZ * 1.1) / 3;
      Rmotor.poly([
        [px + 0.05, e.y1 + 0.14, zz],
        [px + 0.16, e.y1 + 0.17, zz],
        [px + 0.24, e.y1 + 0.05, zz],
        [px + 0.26, e.y1, zz],
      ], 3);
    }
  }

  // Kayış-kasnak takımı (motorun ön yüzü)
  {
    const bx = e.x1 + 0.02;
    const pulleys: [number, number, number][] = [
      [e.y0 + 0.1, 0.0, 0.1], [e.y1 - 0.02, -0.16, 0.07], [e.y1 - 0.06, 0.2, 0.06],
    ];
    for (const [py, pz, pr] of pulleys) Rmotor.circle(bx, py, pz, pr, "yz", 12, 3);
    Rmotor.poly([
      [bx, e.y0 + 0.2, 0.0], [bx, e.y1 + 0.04, -0.16], [bx, e.y1 - 0.01, 0.24], [bx, e.y0 + 0.06, 0.1],
    ], 3, true);
  }

  // Radyatör + fan + üst hortum — motor bölgesi
  for (let i = 0; i <= 4; i++) {
    const yy = e.y0 + 0.05 + (i / 4) * (e.y1 - e.y0 - 0.1);
    Rmotor.add([e.x1 + 0.02, yy, -e.halfZ * 0.8], [e.x1 + 0.02, yy, e.halfZ * 0.8], 3);
  }
  {
    const radX = Math.min(noseX - 0.1, e.x1 + 0.24);
    Rmotor.box(radX, e.y0, -e.halfZ * 0.95, radX + 0.04, e.y1 + 0.02, e.halfZ * 0.95, 3);
    Rmotor.circle(radX - 0.06, (e.y0 + e.y1) / 2, 0, 0.17, "yz", 14, 3);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      Rmotor.add(
        [radX - 0.06, (e.y0 + e.y1) / 2, 0],
        [radX - 0.06, (e.y0 + e.y1) / 2 + 0.17 * Math.cos(a), 0.17 * Math.sin(a)],
        3,
      );
    }
    // üst radyatör hortumu
    Rmotor.poly([
      [e.x1, e.y1 - 0.02, 0.14], [e.x1 + 0.12, e.y1 + 0.04, 0.2],
      [radX - 0.02, e.y1 - 0.04, 0.22],
    ], 3);

    // Klima kondenseri — radyatörün hemen önünde (ızgaraya yakın), "klima" bölgesi
    const acX = radX - 0.09;
    Rklima.box(acX, e.y0 + 0.04, -e.halfZ * 0.75, acX + 0.03, e.y1 - 0.06, e.halfZ * 0.75, 3);
    for (let i = 1; i < 5; i++) {
      const yy = e.y0 + 0.04 + (i / 5) * (e.y1 - 0.06 - (e.y0 + 0.04));
      Rklima.add([acX, yy, -e.halfZ * 0.75], [acX, yy, e.halfZ * 0.75], 3);
    }
    // kondenserden kompresöre giden soğutucu gaz hattı
    Rklima.poly([
      [acX, e.y0 + 0.1, e.halfZ * 0.6], [e.x1 + 0.1, e.y0 + 0.12, -0.2], [e.x1 + 0.02, e.y0 + 0.12, -0.32],
    ], 3);
  }

  // Klima kompresörü — motorun ön yüzünde, kayış-kasnak takımından ayrı — "klima" bölgesi
  {
    const acx = e.x1 + 0.02, acy = e.y0 + 0.12, acz = -0.32;
    Rklima.circle(acx, acy, acz, 0.065, "yz", 10, 2);
    Rklima.circle(acx, acy, acz, 0.024, "yz", 6, 3);
    Rklima.cyl(acx, acy, acz, 0.065, 0.08, "x", 8, 3);
  }

  // Hava filtresi kutusu + emme hortumu (statik detay)
  {
    const ax = e.x0 + 0.06, az = e.halfZ + 0.16;
    S.box(ax, e.y0 + 0.16, az - 0.11, ax + 0.34, e.y0 + 0.36, az + 0.11, 3);
    S.poly([
      [ax + 0.3, e.y0 + 0.28, az], [ax + 0.16, e.y1 + 0.06, az - 0.06],
      [e.x0 + 0.16, e.y1 + 0.14, e.halfZ * 0.5],
    ], 3);
    // körüklü kısım
    for (const t of [0.3, 0.5, 0.7]) {
      const x = ax + 0.3 + (0.16 - 0.3) * t;
      const y = e.y0 + 0.28 + (e.y1 + 0.06 - (e.y0 + 0.28)) * t;
      S.circle(x, y, az - 0.06 * t, 0.035, "xz", 8, 3);
    }
  }

  // Akü + kutup başları — "elektrik" bölgesi
  {
    const bx = e.x0 - 0.02, bz = -(e.halfZ + 0.2);
    Relektrik.box(bx, e.y0 + 0.14, bz - 0.13, bx + 0.3, e.y0 + 0.36, bz + 0.13, 3);
    for (const s of [-1, 1]) Relektrik.cyl(bx + 0.07, e.y0 + 0.36, bz + s * 0.08, 0.025, 0.04, "y", 8, 3);
    Relektrik.add([bx + 0.07, e.y0 + 0.4, bz - 0.08], [bx - 0.06, e.y0 + 0.42, bz - 0.2], 3);
  }

  // Alternatör — motorun ön yüzünde, kayış-kasnak takımından ayrı — "elektrik" bölgesi
  {
    const alx = e.x1 + 0.02, aly = e.y0 + 0.28, alz = 0.3;
    Relektrik.circle(alx, aly, alz, 0.055, "yz", 10, 2);
    Relektrik.circle(alx, aly, alz, 0.02, "yz", 6, 3);
    Relektrik.cyl(alx, aly, alz, 0.055, 0.09, "x", 8, 3);
    Relektrik.add([alx, aly + 0.05, alz], [alx, e.y0 + 0.4, alz + 0.02], 3); // gerdirme kolu
  }

  // Fren hidroliği deposu — "fren" bölgesi
  Rfren.cyl(e.x0 - 0.1, e.y1 - 0.02, 0.24, 0.055, 0.13, "y", 10, 3);
  // Soğutma suyu deposu — "motor" bölgesi
  Rmotor.cyl(e.x1 + 0.1, e.y0 + 0.2, e.halfZ + 0.2, 0.075, 0.2, "y", 10, 3);
  // Sigorta kutusu — "elektrik" bölgesi
  Relektrik.box(e.x0 - 0.16, e.y0 + 0.3, -(e.halfZ + 0.02), e.x0 + 0.04, e.y0 + 0.42, -(e.halfZ - 0.2), 3);
  // Cam suyu deposu (statik — servis kalemi değil)
  S.cyl(e.x0 + 0.02, e.y0 + 0.1, -(e.halfZ + 0.24), 0.07, 0.22, "y", 10, 3);

  // Kule takozları (ön süspansiyon üst yatakları) — "amortisor" bölgesi
  for (const s of [1, -1]) {
    const tz = s * (cfg.bodyHalfW - 0.18);
    const tx = cfg.frontX - 0.05;
    Ramort.circle(tx, e.y1 + 0.04, tz, 0.15, "xz", 12, 3);
    Ramort.circle(tx, e.y1 + 0.04, tz, 0.055, "xz", 8, 3);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      Ramort.add(
        [tx + 0.15 * Math.cos(a), e.y1 + 0.04, tz + 0.15 * Math.sin(a)],
        [tx + 0.11 * Math.cos(a), e.y0 + 0.24, tz + 0.11 * Math.sin(a)],
        3,
      );
    }
  }
  // Firewall (motor bölmesi ile kabin arası duvar)
  {
    const fx = hoodEndX + 0.04;
    S.poly([
      [fx, cfg.sillY + 0.16, cfg.bodyHalfW - 0.06],
      [fx, e.y1 + 0.1, cfg.bodyHalfW - 0.06],
      [fx, e.y1 + 0.1, -(cfg.bodyHalfW - 0.06)],
      [fx, cfg.sillY + 0.16, -(cfg.bodyHalfW - 0.06)],
    ], 3, true);
  }

  // Süspansiyon yayları — arka ikisi "amortisor" bölgesi
  function spring(cx: number, cz: number, E: Emitter): void {
    const pts: P[] = [];
    const y0 = cfg.wheelY + 0.08;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const a = t * Math.PI * 7;
      pts.push([cx + 0.085 * Math.cos(a), y0 + t * 0.34, cz + 0.085 * Math.sin(a)]);
    }
    E.poly(pts, 2);
    // amortisör gövdesi
    E.add([cx, y0, cz], [cx, y0 + 0.36, cz], 3);
  }
  spring(cfg.frontX, 0.52, Ramort);
  spring(cfg.frontX, -0.52, Ramort);
  spring(cfg.rearX, 0.52, Ramort);
  spring(cfg.rearX, -0.52, Ramort);

  // Ön fren kaliperleri — fren bölgesi
  for (const s of [1, -1]) {
    const z = s * cfg.bodyHalfW;
    const zc = z - s * 0.02;
    Rfren.box(
      cfg.frontX - 0.08, cfg.wheelY + cfg.wheelR * 0.32, zc - s * 0.05,
      cfg.frontX + 0.08, cfg.wheelY + cfg.wheelR * 0.55, zc - s * 0.12, 3,
    );
  }

  // Egzoz hattı + susturucu + uç borusu — "egzoz" bölgesi
  {
    const ey = cfg.sillY - 0.14;
    Regzoz.poly([[e.x0 - 0.05, ey + 0.02, -0.3], [cfg.rearX - 0.2, ey, -0.34]], 3);
    Regzoz.box(cfg.rearX - 0.55, ey - 0.07, -0.42, cfg.rearX - 0.2, ey + 0.05, -0.26, 3);
    Regzoz.add([cfg.rearX - 0.55, ey, -0.34], [rearBottom[0] + 0.02, ey, -0.4], 3);
    // egzoz ucu
    Regzoz.circle(rearBottom[0] + 0.02, ey, -0.4, 0.045, "yz", 8, 3);
  }

  // Şaft + aktarma sistemi (statik alt aksam)
  {
    const ey = cfg.sillY - 0.14;
    // aktarma şaftı
    S.add([e.x0 - 0.1, ey + 0.06, 0], [cfg.rearX, ey + 0.06, 0], 3);
    S.circle(cfg.rearX, ey + 0.06, 0, 0.09, "yz", 8, 3);  // diferansiyel
    // aks
    S.add([cfg.rearX, ey + 0.06, cfg.bodyHalfW - 0.1], [cfg.rearX, ey + 0.06, -(cfg.bodyHalfW - 0.1)], 3);
    // yakıt deposu
    S.box(cfg.rearX + 0.2, ey, -0.3, cfg.rearX + 0.7, ey + 0.16, 0.3, 3);
  }

  // ================= DIŞ DETAYLAR =================

  // ---- Ön yüz: mercekli far, gündüz farı şeridi, sis farı, alt hava girişi, arma ----
  {
    const fy = noseTop[1];
    const lampY = fy - 0.09;
    for (const s of [1, -1]) {
      const zc = s * noseHW * 0.78;
      // mercek (projektör) + reflektör halkası
      S.circle(noseX + 0.01, lampY, zc + s * 0.06, 0.045, "yz", 10, 3);
      S.circle(noseX + 0.015, lampY, zc + s * 0.06, 0.018, "yz", 6, 3);
      // gündüz farı (LED şerit) — far gövdesinin alt kenarı boyunca
      S.add([noseX + 0.012, lampY - 0.055, zc - s * 0.02], [noseX + 0.012, lampY - 0.045, zc + s * 0.2], 3);
      // sinyal bölmesi
      S.circle(noseX + 0.01, lampY + 0.02, zc + s * 0.18, 0.022, "yz", 6, 3);
      // sis farı — tamponun alt köşesinde
      S.circle(noseX + 0.005, cfg.sillY + 0.1, s * noseHW * 0.62, 0.038, "yz", 8, 3);
      S.circle(noseX + 0.012, cfg.sillY + 0.1, s * noseHW * 0.62, 0.014, "yz", 5, 3);
    }
    // alt hava girişi (petek) — tampon altı
    const iy0 = cfg.sillY + 0.05, iy1 = cfg.sillY + 0.17;
    const ihw = noseHW * 0.46;
    S.poly([
      [noseX, iy0, -ihw], [noseX, iy0, ihw], [noseX, iy1, ihw], [noseX, iy1, -ihw],
    ], 3, true);
    for (let i = -2; i <= 2; i++) {
      S.add([noseX, iy0, (i / 2) * ihw * 0.8], [noseX, iy1, (i / 2) * ihw * 0.8], 3);
    }
    // marka arması (ızgara ortası)
    S.circle(noseX + 0.01, (grBot + grTop) / 2, 0, 0.055, "yz", 10, 3);
    S.add([noseX + 0.01, (grBot + grTop) / 2, -0.055], [noseX + 0.01, (grBot + grTop) / 2, 0.055], 3);
    // tampon alt spoyler hattı
    B.poly([
      [noseX, cfg.sillY + 0.02, -noseHW * 0.9],
      [noseX - 0.1, cfg.sillY - 0.04, -noseHW * 0.86],
      [noseX - 0.1, cfg.sillY - 0.04, noseHW * 0.86],
      [noseX, cfg.sillY + 0.02, noseHW * 0.9],
    ], 3);
  }

  // ---- Arka yüz: bölmeli stop lambası, reflektör, arma ----
  {
    const ly = rearTop[1] - 0.1;
    for (const s of [1, -1]) {
      const zc = s * rearHW * 0.78;
      // fren / park / geri vites bölmeleri
      for (let i = 0; i < 3; i++) {
        S.poly([
          [rX - 0.008, ly - i * 0.045, zc - s * 0.01],
          [rX - 0.008, ly - i * 0.045, zc + s * 0.19],
          [rX - 0.008, ly - i * 0.045 - 0.035, zc + s * 0.18],
          [rX - 0.008, ly - i * 0.045 - 0.035, zc - s * 0.01],
        ], 3, true);
      }
      // tampon reflektörü
      S.poly([
        [rX - 0.004, cfg.sillY + 0.09, s * rearHW * 0.55],
        [rX - 0.004, cfg.sillY + 0.09, s * rearHW * 0.74],
        [rX - 0.004, cfg.sillY + 0.14, s * rearHW * 0.74],
        [rX - 0.004, cfg.sillY + 0.14, s * rearHW * 0.55],
      ], 3, true);
    }
    // arma + model yazısı hizası
    S.circle(rX - 0.01, rearTop[1] - 0.2, 0, 0.05, "yz", 10, 3);
    S.add([rX - 0.01, rearTop[1] - 0.3, -0.22], [rX - 0.01, rearTop[1] - 0.3, 0.22], 3);
    // egzoz çıkış kesiti (tampon)
    S.poly([
      [rX - 0.004, cfg.sillY + 0.02, -0.46], [rX - 0.004, cfg.sillY + 0.02, -0.32],
      [rX - 0.004, cfg.sillY + 0.09, -0.32], [rX - 0.004, cfg.sillY + 0.09, -0.46],
    ], 3, true);
  }

  // ---- Silecekler + cam suyu fıskiyeleri ----
  {
    const baseY = windowEdgeAt(winXMax, "bottom");
    const top = cfg.window[2];
    for (const s of [1, -1]) {
      const pz = s * cfg.glassZ * 0.42;
      const px = winXMax - 0.02;
      const tipX = px + (top[0] - px) * 0.62;
      const tipY = baseY + (top[1] - baseY) * 0.62;
      S.circle(px, baseY - 0.01, pz, 0.022, "xz", 6, 3);          // silecek mili
      S.add([px, baseY, pz], [tipX, tipY, pz + s * 0.06], 2);      // kol
      S.add([tipX, tipY, pz + s * 0.06], [tipX + 0.1, tipY - 0.24, pz - s * 0.16], 3); // süpürge
      S.add([px + 0.06, baseY - 0.015, pz], [px + 0.08, baseY + 0.005, pz], 3);        // fıskiye
    }
  }

  // ---- Çatı anteni (yüzgeç) + tavan rayları ----
  {
    const roofPts = cfg.window.filter((p) => p[1] > cfg.beltY + 0.15);
    if (roofPts.length >= 2) {
      const rx0 = Math.min(...roofPts.map((p) => p[0]));
      const rx1 = Math.max(...roofPts.map((p) => p[0]));
      const ry = Math.max(...roofPts.map((p) => p[1]));
      // yüzgeç anten — tavanın arka ucunda
      B.poly([
        [rx0 + 0.1, ry, 0], [rx0 - 0.02, ry + 0.075, 0], [rx0 - 0.1, ry + 0.075, 0], [rx0 - 0.06, ry, 0],
      ], 3, true);
      // tavan rayları (yüksek kasalarda belirgin)
      if (cfg.lift > 0.05) {
        for (const s of [1, -1]) {
          const rz = s * cfg.glassZ * 0.82;
          B.add([rx0 + 0.1, ry + 0.03, rz], [rx1 - 0.1, ry + 0.03, rz], 3);
          for (const t of [0.06, 0.94]) {
            const x = rx0 + 0.1 + (rx1 - 0.2 - rx0) * t;
            B.add([x, ry, rz], [x, ry + 0.03, rz], 3);
          }
        }
      }
    }
  }

  // ---- Yakıt dolum kapağı + yan sinyal tekrarlayıcı ----
  {
    const fcX = (cfg.doorSeams[1] + (cfg.rearX + cfg.archR)) / 2;
    const fcY = cfg.beltY - 0.2;
    const z = cfg.bodyHalfW;
    B.circle(fcX, fcY, z, 0.085, "xy", 12, 3);
    B.add([fcX - 0.085, fcY, z], [fcX - 0.06, fcY, z], 3);   // menteşe çentiği
    // ön çamurluk üstü sinyal tekrarlayıcı (iki yan)
    for (const s of [1, -1]) {
      const sx = cfg.frontX - cfg.archR - 0.08;
      B.poly([
        [sx, cfg.beltY - 0.3, s * cfg.bodyHalfW], [sx - 0.11, cfg.beltY - 0.28, s * cfg.bodyHalfW],
        [sx - 0.11, cfg.beltY - 0.33, s * cfg.bodyHalfW], [sx, cfg.beltY - 0.35, s * cfg.bodyHalfW],
      ], 3, true);
    }
  }

  // ---- Tekerlek davlumbaz içliği + marşpiyel ----
  for (const s of [1, -1]) {
    const zOut = s * cfg.bodyHalfW;
    const zIn = s * (cfg.bodyHalfW - 0.14);
    for (const cx of [cfg.frontX, cfg.rearX]) {
      const inner: P[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI - (Math.PI * i) / 8;
        inner.push([cx + cfg.archR * 0.94 * Math.cos(a), cfg.sillY + cfg.archR * 0.94 * Math.sin(a), zIn]);
      }
      S.poly(inner, 3);
      // davlumbaz ağzını gövdeye bağlayan kenar
      S.add([cx - cfg.archR, cfg.sillY, zOut], [cx - cfg.archR * 0.94, cfg.sillY, zIn], 3);
      S.add([cx + cfg.archR, cfg.sillY, zOut], [cx + cfg.archR * 0.94, cfg.sillY, zIn], 3);
    }
    // marşpiyel (eşik kaplaması)
    B.poly([
      [cfg.rearX + cfg.archR, cfg.sillY, zOut],
      [cfg.rearX + cfg.archR, cfg.sillY - 0.06, zOut - s * 0.03],
      [cfg.frontX - cfg.archR, cfg.sillY - 0.06, zOut - s * 0.03],
      [cfg.frontX - cfg.archR, cfg.sillY, zOut],
    ], 3);
  }

  // ================= ALT TAKIM / SÜSPANSİYON =================

  const axleY = cfg.wheelY;
  const frameZ = cfg.bodyHalfW - 0.26;

  // ---- Alt salıncaklar (A kolu), rot ve rotil — "amortisor" bölgesi ----
  for (const cx of [cfg.frontX, cfg.rearX]) {
    for (const s of [1, -1]) {
      const zW = s * (cfg.bodyHalfW - 0.1);   // teker göbeği
      const zF = s * frameZ;                  // şasi bağlantısı
      const ay = axleY - 0.12;
      // A kolu: iki şasi burcu + tek rotil
      Ramort.add([cx - 0.24, ay, zF], [cx, ay - 0.02, zW], 2);
      Ramort.add([cx + 0.2, ay, zF], [cx, ay - 0.02, zW], 2);
      Ramort.add([cx - 0.24, ay, zF], [cx + 0.2, ay, zF], 3);
      Ramort.circle(cx - 0.24, ay, zF, 0.035, "xz", 6, 3);   // burç
      Ramort.circle(cx + 0.2, ay, zF, 0.035, "xz", 6, 3);
      Ramort.circle(cx, ay - 0.02, zW, 0.03, "xy", 6, 3);    // rotil
      // üst kol (çift salıncak) — göbekten kule takozuna
      Ramort.add([cx - 0.02, axleY + 0.16, zW], [cx - 0.14, axleY + 0.24, zF + s * 0.06], 3);
      // poryа / göbek taşıyıcı
      Ramort.add([cx, ay - 0.02, zW], [cx, axleY + 0.16, zW], 3);
    }
    // viraj denge çubuğu (z ekseni boyunca) + bağlantı kolları
    Ramort.add([cx - 0.22, axleY - 0.16, -frameZ], [cx - 0.22, axleY - 0.16, frameZ], 2);
    for (const s of [1, -1]) {
      Ramort.add([cx - 0.22, axleY - 0.16, s * frameZ], [cx - 0.18, axleY - 0.1, s * (cfg.bodyHalfW - 0.14)], 3);
    }
  }
  // ön rot kolları (direksiyon kutusundan tekerleklere)
  for (const s of [1, -1]) {
    Rfren.add(
      [cfg.frontX - 0.12, axleY - 0.02, s * 0.2],
      [cfg.frontX - 0.06, axleY, s * (cfg.bodyHalfW - 0.12)],
      3,
    );
  }

  // ---- Şasi boyu kirişleri + travers ----
  {
    const fy = cfg.sillY - 0.1;
    for (const s of [1, -1]) {
      const z = s * frameZ;
      S.add([rearBottom[0] + 0.1, fy, z], [noseBottom[0] - 0.1, fy, z], 3);
      S.add([rearBottom[0] + 0.1, fy - 0.06, z], [noseBottom[0] - 0.1, fy - 0.06, z], 3);
    }
    for (const x of [cfg.rearX, 0, cfg.frontX]) {
      S.add([x, fy - 0.03, -frameZ], [x, fy - 0.03, frameZ], 3);
    }
    // ön ve arka aks taşıyıcı beşik
    for (const cx of [cfg.frontX, cfg.rearX]) {
      S.poly([
        [cx - 0.26, fy - 0.08, -frameZ * 0.9], [cx + 0.22, fy - 0.08, -frameZ * 0.9],
        [cx + 0.22, fy - 0.08, frameZ * 0.9], [cx - 0.26, fy - 0.08, frameZ * 0.9],
      ], 3, true);
    }
  }

  // ---- Aks milleri + fren hidrolik hatları ----
  {
    for (const s of [1, -1]) {
      // ön aks milleri (şanzımandan tekerleğe)
      S.add([e.x0 - 0.2, axleY - 0.02, s * 0.14], [cfg.frontX, axleY, s * (cfg.bodyHalfW - 0.12)], 3);
      // fren hortumları: şasiden kalipere
      Rfren.poly([
        [cfg.frontX - 0.2, cfg.sillY - 0.02, s * frameZ],
        [cfg.frontX - 0.14, axleY + 0.16, s * (cfg.bodyHalfW - 0.2)],
        [cfg.frontX - 0.04, axleY + cfg.wheelR * 0.44, s * (cfg.bodyHalfW - 0.14)],
      ], 3);
      Rfren.poly([
        [cfg.rearX + 0.2, cfg.sillY - 0.06, s * frameZ],
        [cfg.rearX + 0.06, axleY + 0.12, s * (cfg.bodyHalfW - 0.2)],
      ], 3);
    }
  }

  // ================= MOTOR BÖLMESİ — EK DETAY =================

  // ---- Ateşleme bobinleri (silindir kapağı üstü) — "elektrik" bölgesi ----
  for (let i = 0; i < 4; i++) {
    const x = e.x0 + 0.1 + ((e.x1 - e.x0 - 0.2) * i) / 3;
    Relektrik.box(x - 0.025, e.y1 + 0.1, -0.05, x + 0.025, e.y1 + 0.16, 0.05, 3);
    Relektrik.add([x, e.y1 + 0.16, 0], [x - 0.03, e.y1 + 0.19, -0.14], 3);   // buji kablosu
  }

  // ---- Yağ filtresi + karter tapası — "motor" bölgesi ----
  Rmotor.cyl(e.x1 - 0.14, e.y0 - 0.14, 0.2, 0.05, 0.11, "y", 8, 3);
  Rmotor.box(e.x0 + 0.06, e.y0 - 0.2, -e.halfZ * 0.7, e.x1 - 0.06, e.y0, e.halfZ * 0.7, 3);  // karter
  Rmotor.circle(e.x0 + 0.16, e.y0 - 0.2, 0.06, 0.022, "xz", 6, 3);                            // tapa

  // ---- Fren merkez silindiri + hidrolik takviye (servo) — "fren" bölgesi ----
  {
    const mx = hoodEndX + 0.06;
    Rfren.cyl(mx, e.y1 - 0.06, 0.24, 0.11, 0.16, "x", 12, 3);      // servo tenceresi
    Rfren.cyl(mx + 0.16, e.y1 - 0.06, 0.24, 0.045, 0.14, "x", 8, 3); // merkez silindiri
    Rfren.add([mx + 0.3, e.y1 - 0.06, 0.24], [e.x0 - 0.1, e.y1 - 0.02, 0.24], 3); // depoya hat
  }

  // ---- Turbo + intercooler borulaması — "motor" bölgesi ----
  {
    const tx = e.x0 + 0.04, ty = e.y0 + 0.3, tz = -(e.halfZ + 0.02);
    Rmotor.circle(tx, ty, tz, 0.075, "yz", 10, 2);        // salyangoz
    Rmotor.circle(tx, ty, tz, 0.03, "yz", 6, 3);
    Rmotor.cyl(tx, ty, tz, 0.075, 0.09, "x", 8, 3);
    // basınç borusu: turbodan intercooler'a, oradan manifolda
    Rmotor.poly([
      [tx + 0.09, ty, tz], [e.x1 - 0.1, ty - 0.16, tz - 0.1],
      [e.x1 + 0.14, e.y0 + 0.06, -e.halfZ * 0.5], [e.x1 + 0.14, e.y0 + 0.06, e.halfZ * 0.5],
      [e.x0 + 0.26, e.y1 + 0.1, e.halfZ * 0.4],
    ], 3);
  }

  // ================= İÇ MEKÂN — EK DETAY =================

  // ---- Emniyet kemerleri + B sütunu iç kaplaması ----
  {
    const bx = cfg.doorSeams[0];
    for (const s of [1, -1]) {
      const z = s * (cfg.bodyHalfW - 0.07);
      S.add([bx, cfg.sillY + 0.06, z], [bx, cfg.beltY + 0.22, z], 3);          // B sütunu
      S.add([bx + 0.02, cfg.beltY + 0.16, z], [bx + 0.16, 0.56 + L, z - s * 0.05], 3); // kemer bandı
      S.box(bx - 0.03, cfg.beltY + 0.1, z - s * 0.03, bx + 0.03, cfg.beltY + 0.2, z, 3); // yükseklik ayarı
      S.box(bx + 0.14, 0.52 + L, z - s * 0.09, bx + 0.2, 0.58 + L, z - s * 0.03, 3);     // toka
    }
  }

  // ---- Arka pencere altı rafı + hoparlörler ----
  {
    const px0 = trunkStartX;
    const px1 = trunkStartX + 0.32;
    const py = cfg.beltY - 0.04;
    S.poly([
      [px0, py, cfg.bodyHalfW - 0.12], [px1, py, cfg.bodyHalfW - 0.12],
      [px1, py, -(cfg.bodyHalfW - 0.12)], [px0, py, -(cfg.bodyHalfW - 0.12)],
    ], 3, true);
    for (const s of [1, -1]) {
      S.circle((px0 + px1) / 2, py + 0.002, s * (cfg.bodyHalfW - 0.3), 0.075, "xz", 10, 3);
    }
  }

  return { cls, paint, parts, regions, cfg };
}
