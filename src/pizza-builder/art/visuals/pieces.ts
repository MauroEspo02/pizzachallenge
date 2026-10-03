/** Pezzi: cubetti, listarelle, anelli, briciole, fette drappeggiate, filetti, olive, patatine. */
import { luminance, shade } from '../color';
import { blob, blobPoints, circlePath, ellipsePath, f, place, R_TOP, scatter, smoothClosed, smoothOpen, type Pt } from '../geometry';
import type { Rng } from '../rng';
import { colorAt, SHADOW, type VisualDef } from './types';

export const cube: VisualDef = {
  label: 'Cubetti',
  baseCount: 13,
  defaultColors: ['#E8892B', '#B65F1D'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#E8892B');
    const edge = colors[1] ?? shade(body, -0.3);
    const fatty = luminance(edge) > 0.75;
    const pts = scatter(rng, count, { radius: R_TOP - 8, minDist: 38 });
    let out = '';
    for (const p of pts) {
      const s = rng.range(16, 22);
      const rot = rng.range(0, 90);
      const rect = `<rect x="${f(-s / 2)}" y="${f(-s / 2)}" width="${f(s)}" height="${f(s * rng.range(0.85, 1.1))}" rx="${f(s * 0.22)}"`;
      out +=
        `<g transform="${place(p.x + 2, p.y + 2.6, rot)}">${rect} fill="${SHADOW}" opacity=".2"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}">${rect} fill="${body}" stroke="${fatty ? shade(body, -0.25) : edge}" stroke-width="1.8"/>` +
        (fatty
          ? `<path d="M${f(-s / 2 + 1)} ${f(-s * 0.05)}H${f(s / 2 - 1)}" stroke="${edge}" stroke-width="${f(s * 0.28)}"/>`
          : `<path d="M${f(-s / 2 + 3)} ${f(-s / 2 + 3)}H${f(s / 2 - 3)}" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>`) +
        `</g>`;
    }
    return out;
  },
};

export const strip: VisualDef = {
  label: 'Listarelle',
  baseCount: 9,
  defaultColors: ['#C8321F', '#F2B526'],
  render({ rng, colors, count }) {
    const pts = scatter(rng, count, { radius: R_TOP - 26, minDist: 52 });
    let out = '';
    pts.forEach((p, i) => {
      const color = colors[i % Math.max(1, colors.length)] ?? '#C8321F';
      const len = rng.range(52, 72);
      const w = rng.range(9, 12);
      const rot = rng.range(0, 360);
      const bend = rng.signed() * 14;
      const d = `M${f(-len / 2)} 0Q0 ${f(bend)} ${f(len / 2)} 0`;
      out +=
        `<g transform="${place(p.x + 2.2, p.y + 3, rot)}"><path d="${d}" stroke="${SHADOW}" stroke-width="${f(w)}" stroke-linecap="round" fill="none" opacity=".2"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}"><path d="${d}" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" fill="none"/>` +
        `<path d="M${f(-len / 2 + 3)} ${f(-w * 0.18)}Q0 ${f(bend - w * 0.18)} ${f(len / 2 - 3)} ${f(-w * 0.18)}" stroke="${shade(color, 0.35)}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".55"/>` +
        (rng.chance(0.5) ? `<path d="${circlePath(rng.signed() * len * 0.3, bend * 0.4, 2.4)}" fill="#3a1d0e" opacity=".45"/>` : '') +
        `</g>`;
    });
    return out;
  },
};

export const onion: VisualDef = {
  label: 'Anelli di cipolla',
  baseCount: 12,
  defaultColors: ['#9A3D6A', '#C774A0'],
  render({ rng, colors, count }) {
    const outer = colorAt(colors, 0, '#9A3D6A');
    const inner = colors[1] ?? shade(outer, 0.35);
    const pts = scatter(rng, count, { radius: R_TOP - 10, minDist: 38 });
    let a1 = '';
    let a2 = '';
    let shadow = '';
    for (const p of pts) {
      const r = rng.range(14, 22);
      const start = rng.range(0, Math.PI * 2);
      const span = rng.range(1.8, 4.4);
      const arc = (rr: number, dx = 0, dy = 0) => {
        const sx = p.x + dx + Math.cos(start) * rr;
        const sy = p.y + dy + Math.sin(start) * rr;
        const ex = p.x + dx + Math.cos(start + span) * rr;
        const ey = p.y + dy + Math.sin(start + span) * rr;
        return `M${f(sx)} ${f(sy)}A${f(rr)} ${f(rr)} 0 ${span > Math.PI ? 1 : 0} 1 ${f(ex)} ${f(ey)}`;
      };
      shadow += arc(r, 1.6, 2.2);
      a1 += arc(r);
      a2 += arc(r - 4.4);
    }
    return (
      `<path d="${shadow}" stroke="${SHADOW}" stroke-width="4" fill="none" opacity=".15" stroke-linecap="round"/>` +
      `<path d="${a1}" stroke="${outer}" stroke-width="3.8" fill="none" stroke-linecap="round"/>` +
      `<path d="${a2}" stroke="${inner}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>`
    );
  },
};

export const crumble: VisualDef = {
  label: 'Briciole e pezzetti',
  baseCount: 15,
  defaultColors: ['#9A5B3D', '#5E3320'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#9A5B3D');
    const seared = colors[1] ?? shade(body, -0.35);
    const pts = scatter(rng, count, { radius: R_TOP - 6, minDist: 34 });
    let shadow = '';
    let main = '';
    let dark = '';
    let light = '';
    for (const p of pts) {
      const r = rng.range(9, 14);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 8, jitter: 0.4 });
      shadow += smoothClosed(shape, 2, 2.6);
      main += smoothClosed(shape);
      dark += blob(rng, p.x + rng.signed() * r * 0.35, p.y + rng.signed() * r * 0.35, r * 0.5, { points: 6, jitter: 0.45 });
      if (rng.chance(0.5)) light += blob(rng, p.x - r * 0.3, p.y - r * 0.3, r * 0.28, { points: 5, jitter: 0.4 });
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".22"/>` +
      `<path d="${main}" fill="${body}"/>` +
      `<path d="${dark}" fill="${seared}" opacity=".6"/>` +
      `<path d="${light}" fill="${shade(body, 0.35)}" opacity=".55"/>`
    );
  },
};

function ribbonOutline(rng: Rng, L: number, W: number): { outline: string; top: Pt[]; mid: Pt[] } {
  const n = 9;
  const amp = rng.range(3, 6);
  const phase = rng.range(0, Math.PI * 2);
  const freq = rng.range(1.4, 2.4);
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  const mid: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = -L / 2 + t * L;
    const yc = amp * Math.sin(freq * Math.PI * t * 2 + phase);
    const taper = 0.6 + 0.4 * Math.sin(Math.PI * t);
    const w = (W / 2) * taper * (1 + rng.signed() * 0.12);
    top.push({ x, y: yc - w });
    bottom.push({ x, y: yc + w });
    mid.push({ x, y: yc });
  }
  return { outline: smoothClosed([...top, ...bottom.reverse()]), top, mid };
}

export const ribbon: VisualDef = {
  label: 'Fette sottili drappeggiate',
  baseCount: 5,
  defaultColors: ['#D8706B', '#F4DCD3'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#D8706B');
    const fat = colors[1] ?? shade(body, 0.6);
    const pts = scatter(rng, count, { radius: R_TOP - 58, minDist: 80 });
    let out = '';
    for (const p of pts) {
      const L = rng.range(96, 126);
      const W = rng.range(28, 38);
      const rot = rng.range(0, 360);
      const { outline, top, mid } = ribbonOutline(rng, L, W);
      const fatLine = smoothOpen(top.map((q) => ({ x: q.x, y: q.y + 2.4 })));
      let folds = '';
      for (let i = 2; i < mid.length - 2; i += 3) {
        const q = mid[i]!;
        folds += ellipsePath(q.x, q.y, 3.4, W * 0.42, rng.signed() * 12);
      }
      out +=
        `<g transform="${place(p.x + 3, p.y + 4.2, rot)}"><path d="${outline}" fill="${SHADOW}" opacity=".2"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}"><path d="${outline}" fill="${body}" opacity=".95"/>` +
        `<path d="${folds}" fill="${shade(body, -0.2)}" opacity=".32"/>` +
        `<path d="${fatLine}" stroke="${fat}" stroke-width="5.2" fill="none" stroke-linecap="round" opacity=".92"/>` +
        `<path d="${smoothOpen(mid.slice(1, -1).map((q) => ({ x: q.x, y: q.y - 1 })))}" stroke="#fff" stroke-width="2.4" fill="none" opacity=".2"/></g>`;
    }
    return out;
  },
};

export const drape: VisualDef = {
  label: 'Fette di crudo adagiate',
  baseCount: 4,
  defaultColors: ['#D8706B', '#F4DCD3'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#D8706B');
    const fat = colors[1] ?? shade(body, 0.6);
    const pts = scatter(rng, count, { radius: R_TOP - 56, minDist: 92 });
    let out = '';
    for (const p of pts) {
      const r = rng.range(44, 56);
      const rot = rng.range(0, Math.PI);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 13, jitter: 0.16, squash: rng.range(0.42, 0.55), rotate: rot });
      const edge = smoothOpen(shape.slice(0, 6).map((q) => ({ x: q.x + (p.x - q.x) * 0.06, y: q.y + (p.y - q.y) * 0.06 })));
      let folds = '';
      for (let i = 0; i < 3; i++) {
        const t = rng.range(-0.55, 0.55);
        const cx = p.x + Math.cos(rot) * r * t;
        const cy = p.y + Math.sin(rot) * r * t;
        const nx = -Math.sin(rot) * r * 0.32;
        const ny = Math.cos(rot) * r * 0.32;
        folds += `M${f(cx - nx)} ${f(cy - ny)}Q${f(cx + rng.signed() * 6)} ${f(cy + rng.signed() * 6)} ${f(cx + nx)} ${f(cy + ny)}`;
      }
      out +=
        `<path d="${smoothClosed(shape, 3, 4.2)}" fill="${SHADOW}" opacity=".2"/>` +
        `<path d="${smoothClosed(shape)}" fill="${body}" opacity=".94"/>` +
        `<path d="${folds}" fill="none" stroke="${shade(body, -0.22)}" stroke-width="3" stroke-linecap="round" opacity=".22"/>` +
        `<path d="${folds}" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".16" transform="translate(-2 -2)"/>` +
        `<path d="${edge}" fill="none" stroke="${fat}" stroke-width="6" stroke-linecap="round" opacity=".8"/>`;
    }
    return out;
  },
};

export const folded: VisualDef = {
  label: 'Fette larghe piegate',
  baseCount: 4,
  defaultColors: ['#F0A9A4', '#FBE8E3'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#F0A9A4');
    const fat = colors[1] ?? shade(body, 0.7);
    const pts = scatter(rng, count, { radius: R_TOP - 52, minDist: 96 });
    let out = '';
    for (const p of pts) {
      const R = rng.range(44, 54);
      const shape = blobPoints(rng, p.x, p.y, R, { points: 12, jitter: 0.07, squash: 0.92 });
      const a = rng.range(0, Math.PI * 2);
      const fx = p.x + Math.cos(a) * R * 0.32;
      const fy = p.y + Math.sin(a) * R * 0.32;
      const flap = blobPoints(rng, fx, fy, R * 0.78, { points: 11, jitter: 0.08, squash: 0.7, rotate: a + Math.PI / 2 });
      let dots = '';
      const n = rng.int(14, 22);
      for (let i = 0; i < n; i++) {
        const da = rng.range(0, Math.PI * 2);
        const dd = Math.sqrt(rng.next()) * R * 0.85;
        dots += blob(rng, p.x + Math.cos(da) * dd, p.y + Math.sin(da) * dd, rng.range(1.8, 3.6), { points: 5, jitter: 0.3 });
      }
      out +=
        `<path d="${smoothClosed(shape, 3, 4.2)}" fill="${SHADOW}" opacity=".18"/>` +
        `<path d="${smoothClosed(shape)}" fill="${body}"/>` +
        `<path d="${dots}" fill="${fat}" opacity=".9"/>` +
        `<path d="${smoothClosed(flap, 1.8, 2.6)}" fill="${SHADOW}" opacity=".14"/>` +
        `<path d="${smoothClosed(flap)}" fill="${shade(body, 0.08)}" stroke="${shade(body, -0.2)}" stroke-width="1.6" stroke-opacity=".55"/>`;
    }
    return out;
  },
};

export const fillet: VisualDef = {
  label: 'Filetti (acciughe)',
  baseCount: 6,
  defaultColors: ['#7A5A43', '#C6C2B8'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#7A5A43');
    const silver = colors[1] ?? '#C6C2B8';
    const pts = scatter(rng, count, { radius: R_TOP - 40, minDist: 60 });
    let out = '';
    for (const p of pts) {
      const L = rng.range(66, 84);
      const W = rng.range(6, 7.5);
      const bend = rng.signed() * 8;
      const rot = rng.range(0, 360);
      const d = `M${f(-L / 2)} 0C${f(-L * 0.2)} ${f(-W * 1.4 + bend)} ${f(L * 0.25)} ${f(-W * 1.2 + bend)} ${f(L / 2)} ${f(bend * 0.4)}C${f(L * 0.25)} ${f(W * 1.2 + bend)} ${f(-L * 0.2)} ${f(W * 1.4 + bend)} ${f(-L / 2)} 0Z`;
      out +=
        `<g transform="${place(p.x + 1.8, p.y + 2.6, rot)}"><path d="${d}" fill="${SHADOW}" opacity=".22"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}"><path d="${d}" fill="${body}" stroke="${shade(body, -0.35)}" stroke-width="1.1"/>` +
        `<path d="M${f(-L * 0.42)} ${f(bend * 0.3)}Q0 ${f(bend * 0.9)} ${f(L * 0.42)} ${f(bend * 0.35)}" stroke="${silver}" stroke-width="2.2" fill="none" opacity=".85"/></g>`;
    }
    return out;
  },
};

export const olive: VisualDef = {
  label: 'Olive',
  baseCount: 10,
  defaultColors: ['#2B2420', '#4A3B33'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#2B2420');
    const edge = colors[1] ?? shade(body, 0.2);
    const pts = scatter(rng, count, { radius: R_TOP - 6, minDist: 38 });
    let shadow = '';
    let rings = '';
    let whole = '';
    let shine = '';
    for (const p of pts) {
      if (rng.chance(0.62)) {
        const r = rng.range(10, 12.5);
        shadow += circlePath(p.x + 1.8, p.y + 2.4, r);
        rings += circlePath(p.x, p.y, r) + circlePath(p.x + rng.signed() * 0.6, p.y + rng.signed() * 0.6, r * 0.42);
        shine += ellipsePath(p.x - r * 0.4, p.y - r * 0.45, r * 0.32, r * 0.14, -40);
      } else {
        const rx = rng.range(11, 13);
        const ry = rx * 0.75;
        const rot = rng.range(0, 180);
        shadow += ellipsePath(p.x + 2, p.y + 2.6, rx, ry, rot);
        whole += ellipsePath(p.x, p.y, rx, ry, rot);
        shine += ellipsePath(p.x - rx * 0.3, p.y - ry * 0.4, rx * 0.35, ry * 0.2, rot);
      }
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".2"/>` +
      `<path d="${rings}" fill="${body}" fill-rule="evenodd" stroke="${edge}" stroke-width="1.1"/>` +
      `<path d="${whole}" fill="${body}" stroke="${edge}" stroke-width="1.1"/>` +
      `<path d="${shine}" fill="#fff" opacity=".45"/>`
    );
  },
};

export const fries: VisualDef = {
  label: 'Bastoncini (patatine)',
  baseCount: 12,
  defaultColors: ['#F0C75A', '#C98F2E'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#F0C75A');
    const edge = colors[1] ?? shade(body, -0.3);
    const pts = scatter(rng, count, { radius: R_TOP - 30, minDist: 36 });
    let out = '';
    for (const p of pts) {
      const L = rng.range(54, 74);
      const W = rng.range(8.5, 10.5);
      const rot = rng.range(0, 360);
      const rect = `<rect x="${f(-L / 2)}" y="${f(-W / 2)}" width="${f(L)}" height="${f(W)}" rx="${f(W * 0.4)}"`;
      out +=
        `<g transform="${place(p.x + 2, p.y + 2.6, rot)}">${rect} fill="${SHADOW}" opacity=".2"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}">${rect} fill="${body}" stroke="${edge}" stroke-width="1.4"/>` +
        `<path d="M${f(-L / 2 + 3)} ${f(-W * 0.18)}H${f(L / 2 - 4)}" stroke="#fff" stroke-width="1.6" opacity=".4"/></g>`;
    }
    return out;
  },
};
