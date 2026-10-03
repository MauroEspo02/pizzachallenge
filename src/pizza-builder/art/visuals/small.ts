/** Dettagli piccoli: granelle, spezie, semi, capperi, chicchi, fili d'olio e il disegno generico. */
import { luminance, shade } from '../color';
import { blob, blobPoints, C, circlePath, ellipsePath, polar, R_TOP, scatter, shard, smoothClosed, smoothOpen, type Pt } from '../geometry';
import type { Rng } from '../rng';
import { colorAt, SHADOW, type VisualDef } from './types';

function randomInDisc(rng: Rng, radius: number): Pt {
  const a = rng.range(0, Math.PI * 2);
  const r = Math.sqrt(rng.next()) * radius;
  return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
}

export const granella: VisualDef = {
  label: 'Granella',
  baseCount: 60,
  defaultColors: ['#8CB04A', '#6E8F35', '#7E5A6E'],
  render({ rng, colors, count }) {
    const palette = colors.length ? colors : ['#8CB04A'];
    const paths = palette.map(() => '');
    let shadow = '';
    for (let i = 0; i < count; i++) {
      const p = randomInDisc(rng, R_TOP + 8);
      const s = rng.range(2.8, 5.4);
      const k = palette.length > 2 && rng.chance(0.12) ? 2 : rng.chance(0.6) ? 0 : Math.min(1, palette.length - 1);
      paths[k] += shard(rng, p.x, p.y, s);
      shadow += shard(rng, p.x + 1.1, p.y + 1.5, s);
    }
    return `<path d="${shadow}" fill="${SHADOW}" opacity=".18"/>` + paths.map((d, i) => `<path d="${d}" fill="${palette[i]}"/>`).join('');
  },
};

export const specks: VisualDef = {
  label: 'Puntini (pepe, spezie)',
  baseCount: 85,
  defaultColors: ['#2B241F', '#4A3F36'],
  render({ rng, colors, count }) {
    const a = colorAt(colors, 0, '#2B241F');
    const b = colors[1] ?? shade(a, 0.2);
    let pa = '';
    let pb = '';
    for (let i = 0; i < count; i++) {
      const p = randomInDisc(rng, R_TOP + 14);
      const s = shard(rng, p.x, p.y, rng.range(0.9, 2.1));
      if (rng.chance(0.75)) pa += s;
      else pb += s;
    }
    return `<path d="${pa}" fill="${a}" opacity=".9"/><path d="${pb}" fill="${b}" opacity=".9"/>`;
  },
};

export const seeds: VisualDef = {
  label: 'Semi',
  baseCount: 60,
  defaultColors: ['#EFE2C2', '#2E2A36'],
  render({ rng, colors, count }) {
    const palette = colors.length ? colors : ['#EFE2C2'];
    const paths = palette.map(() => '');
    for (let i = 0; i < count; i++) {
      const p = randomInDisc(rng, R_TOP + 6);
      const k = rng.int(0, palette.length - 1);
      const rx = rng.range(2.1, 2.9);
      paths[k] += ellipsePath(p.x, p.y, rx, rx * 0.55, rng.range(0, 180));
    }
    return paths.map((d, i) => `<path d="${d}" fill="${palette[i]}" stroke="${shade(palette[i]!, -0.25)}" stroke-width=".3"/>`).join('');
  },
};

export const balls: VisualDef = {
  label: 'Palline (capperi, uvetta)',
  baseCount: 18,
  defaultColors: ['#6F8237', '#8FA04D'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#6F8237');
    const pts = scatter(rng, count, { radius: R_TOP - 4, minDist: 24 });
    let shadow = '';
    let main = '';
    let shine = '';
    for (const p of pts) {
      const r = rng.range(4.2, 5.6);
      shadow += circlePath(p.x + 1.3, p.y + 1.7, r);
      main += blob(rng, p.x, p.y, r, { points: 7, jitter: 0.12 });
      shine += circlePath(p.x - r * 0.35, p.y - r * 0.35, r * 0.3);
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".22"/>` +
      `<path d="${main}" fill="${body}" stroke="${shade(body, -0.3)}" stroke-width=".9"/>` +
      `<path d="${shine}" fill="#fff" opacity=".45"/>`
    );
  },
};

export const kernels: VisualDef = {
  label: 'Chicchi',
  baseCount: 18,
  defaultColors: ['#F3C33C', '#E2A92A'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#F3C33C');
    const edge = colors[1] ?? shade(body, -0.25);
    const pts = scatter(rng, count, { radius: R_TOP - 4, minDist: 24 });
    let shadow = '';
    let main = '';
    for (const p of pts) {
      const rx = rng.range(4, 5.2);
      const rot = rng.range(0, 180);
      shadow += ellipsePath(p.x + 1.3, p.y + 1.7, rx, rx * 0.7, rot);
      main += ellipsePath(p.x, p.y, rx, rx * 0.7, rot);
    }
    return `<path d="${shadow}" fill="${SHADOW}" opacity=".2"/><path d="${main}" fill="${body}" stroke="${edge}" stroke-width="1"/>`;
  },
};

export const drizzle: VisualDef = {
  label: "Filo d'olio o salsa",
  baseCount: 3,
  defaultColors: ['#C9A43B'],
  render({ rng, colors, count }) {
    const color = colorAt(colors, 0, '#C9A43B');
    if (luminance(color) > 0.55) {
      // Olio: un giro a spirale con piccole pozze lucide.
      const pts: Pt[] = [];
      const turns = 0.85 + count * 0.08;
      const steps = 30;
      const a0 = rng.range(0, Math.PI * 2);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        pts.push(polar(30 + t * (R_TOP - 50) + rng.signed() * 10, a0 + t * turns * Math.PI * 2));
      }
      const line = smoothOpen(pts);
      let pools = '';
      const np = rng.int(4, 7);
      for (let i = 0; i < np; i++) {
        const q = pts[rng.int(2, pts.length - 2)]!;
        pools += ellipsePath(q.x + rng.signed() * 4, q.y + rng.signed() * 4, rng.range(5, 11), rng.range(2.6, 5), rng.range(0, 180));
      }
      return (
        `<path d="${line}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" opacity=".16"/>` +
        `<path d="${pools}" fill="${color}" opacity=".3"/>` +
        `<path d="${line}" fill="none" stroke="${shade(color, -0.1)}" stroke-width="2" stroke-linecap="round" opacity=".3"/>` +
        `<path d="${line}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".38" transform="translate(-.8 -.9)"/>`
      );
    }
    // Miele, glasse e salse scure: zig-zag come da sac à poche.
    let lines = '';
    const passes = Math.max(1, Math.min(4, Math.round(count * 0.8)));
    const phi0 = rng.range(0, Math.PI);
    for (let i = 0; i < passes; i++) {
      const phi = phi0 + (i * Math.PI) / passes + rng.signed() * 0.2;
      const n = rng.int(6, 8);
      const pts: Pt[] = [];
      for (let j = 0; j <= n; j++) {
        const u = -R_TOP * 0.82 + (j / n) * R_TOP * 1.64;
        const span = Math.sqrt(Math.max(0, R_TOP * R_TOP * 0.72 - u * u));
        const v = (j % 2 ? 1 : -1) * span * rng.range(0.7, 0.95);
        pts.push({ x: C + u * Math.cos(phi) - v * Math.sin(phi), y: C + u * Math.sin(phi) + v * Math.cos(phi) });
      }
      lines += smoothOpen(pts);
    }
    return (
      `<path d="${lines}" fill="none" stroke="${SHADOW}" stroke-width="4" stroke-linecap="round" opacity=".14" transform="translate(1.2 1.8)"/>` +
      `<path d="${lines}" fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".88"/>` +
      `<path d="${lines}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".3" transform="translate(-.7 -.8)"/>`
    );
  },
};

export const generic: VisualDef = {
  label: 'Generico',
  baseCount: 10,
  defaultColors: ['#B5835A'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#B5835A');
    const pts = scatter(rng, count, { radius: R_TOP - 8, minDist: 44 });
    let shadow = '';
    let main = '';
    let shine = '';
    for (const p of pts) {
      const r = rng.range(10, 15);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 8, jitter: 0.3 });
      shadow += smoothClosed(shape, 2, 2.6);
      main += smoothClosed(shape);
      shine += ellipsePath(p.x - r * 0.3, p.y - r * 0.35, r * 0.3, r * 0.14, -30);
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".2"/>` +
      `<path d="${main}" fill="${body}" stroke="${shade(body, -0.3)}" stroke-width="1.3"/>` +
      `<path d="${shine}" fill="#fff" opacity=".35"/>`
    );
  },
};
