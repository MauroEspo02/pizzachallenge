import type { Rng } from './rng';

/** Sistema di coordinate delle illustrazioni: viewBox 0 0 512 512. */
export const SIZE = 512;
export const C = 256;
export const R_CRUST = 238;
export const R_SAUCE = 194;
export const R_TOP = 168;

export interface Pt {
  x: number;
  y: number;
}

/** Numeri compatti (1 decimale) per tenere leggeri gli SVG. */
export function f(n: number): string {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
}

export function polar(r: number, angle: number, cx = C, cy = C): Pt {
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

/** Curva chiusa morbida che passa per i punti (Catmull-Rom convertita in Bézier). */
export function smoothClosed(points: Pt[], dx = 0, dy = 0): string {
  const n = points.length;
  if (n < 3) return '';
  const p = (i: number) => points[((i % n) + n) % n]!;
  let d = `M${f(p(0).x + dx)} ${f(p(0).y + dy)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${f(c1x + dx)} ${f(c1y + dy)} ${f(c2x + dx)} ${f(c2y + dy)} ${f(p2.x + dx)} ${f(p2.y + dy)}`;
  }
  return `${d}Z`;
}

/** Curva aperta morbida (per fili d'olio, gambi…). */
export function smoothOpen(points: Pt[]): string {
  const n = points.length;
  if (n < 2) return '';
  const p = (i: number) => points[Math.max(0, Math.min(n - 1, i))]!;
  let d = `M${f(p(0).x)} ${f(p(0).y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

export interface BlobOptions {
  points?: number;
  jitter?: number;
  squash?: number;
  rotate?: number;
}

/** Punti di una forma organica attorno a un centro. */
export function blobPoints(rng: Rng, cx: number, cy: number, r: number, opts: BlobOptions = {}): Pt[] {
  const n = opts.points ?? 8;
  const jitter = opts.jitter ?? 0.22;
  const squash = opts.squash ?? 1;
  const rot = opts.rotate ?? rng.range(0, Math.PI * 2);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.signed() * (0.35 / n) * Math.PI;
    const rr = r * (1 + rng.signed() * jitter);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * squash;
    pts.push({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos });
  }
  return pts;
}

export function blob(rng: Rng, cx: number, cy: number, r: number, opts: BlobOptions = {}): string {
  return smoothClosed(blobPoints(rng, cx, cy, r, opts));
}

/** Cerchio con bordo ondulato a bassa frequenza (cornicione, salsa). */
export function wobblyCircle(rng: Rng, cx: number, cy: number, r: number, amplitude: number, count = 40): string {
  const phases = [rng.range(0, 6.3), rng.range(0, 6.3), rng.range(0, 6.3)];
  const freqs = [rng.int(2, 3), rng.int(5, 7), rng.int(9, 12)];
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rr =
      r +
      amplitude *
        (0.55 * Math.sin(freqs[0]! * a + phases[0]!) +
          0.3 * Math.sin(freqs[1]! * a + phases[1]!) +
          0.15 * Math.sin(freqs[2]! * a + phases[2]!));
    pts.push(polar(rr, a, cx, cy));
  }
  return smoothClosed(pts);
}

export function circlePath(x: number, y: number, r: number): string {
  return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0Z`;
}

export function ellipsePath(x: number, y: number, rx: number, ry: number, rotationDeg: number): string {
  const a = (rotationDeg * Math.PI) / 180;
  const sx = x - Math.cos(a) * rx;
  const sy = y - Math.sin(a) * rx;
  return `M${f(sx)} ${f(sy)}a${f(rx)} ${f(ry)} ${f(rotationDeg)} 1 0 ${f(Math.cos(a) * rx * 2)} ${f(Math.sin(a) * rx * 2)}a${f(rx)} ${f(ry)} ${f(rotationDeg)} 1 0 ${f(-Math.cos(a) * rx * 2)} ${f(-Math.sin(a) * rx * 2)}Z`;
}

/** Piccolo frammento irregolare (granella, spezie, formaggio grattugiato). */
export function shard(rng: Rng, x: number, y: number, size: number): string {
  const a = rng.range(0, Math.PI * 2);
  const pts: Pt[] = [];
  const corners = rng.int(3, 5);
  for (let i = 0; i < corners; i++) {
    const ang = a + (i / corners) * Math.PI * 2 + rng.signed() * 0.4;
    const r = size * (0.55 + rng.next() * 0.6);
    pts.push({ x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r });
  }
  return `M${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join('L')}Z`;
}

export interface ScatterOptions {
  radius?: number;
  minDist: number;
  ring?: [number, number];
  cx?: number;
  cy?: number;
}

/**
 * Distribuisce n punti nel disco evitando sovrapposizioni troppo strette.
 * È "stabile": chiedendo più punti, i primi restano identici (gli ingredienti non saltano mentre scrivi).
 */
export function scatter(rng: Rng, n: number, opts: ScatterOptions): Pt[] {
  const radius = opts.radius ?? R_TOP;
  const [rMin, rMax] = opts.ring ?? [0, radius];
  const cx = opts.cx ?? C;
  const cy = opts.cy ?? C;
  const pts: Pt[] = [];
  let minDist = opts.minDist;
  let attempts = 0;
  while (pts.length < n) {
    attempts++;
    if (attempts % 60 === 0) minDist *= 0.85;
    const a = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rMin * rMin + rng.next() * (rMax * rMax - rMin * rMin));
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const md2 = minDist * minDist;
    let ok = true;
    for (const p of pts) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < md2) {
        ok = false;
        break;
      }
    }
    if (ok) pts.push({ x, y });
    if (attempts > n * 400) break;
  }
  return pts;
}

/** Trasformazione SVG per un pezzo posizionato e ruotato. */
export function place(x: number, y: number, rotationDeg: number, scale = 1): string {
  const s = Math.round(scale * 1000) / 1000;
  return `translate(${f(x)} ${f(y)}) rotate(${f(rotationDeg)})${s !== 1 ? ` scale(${s})` : ''}`;
}
