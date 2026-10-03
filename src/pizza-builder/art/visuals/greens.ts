/** Foglie ed erbe: basilico, rucola, friarielli, fiori di zucca. */
import { shade } from '../color';
import { blob, f, place, R_TOP, scatter, smoothClosed, type Pt } from '../geometry';
import type { Rng } from '../rng';
import { colorAt, SHADOW, type VisualDef } from './types';

/** Foglia asimmetrica con base in (-L/2, 0) e punta in (L/2, 0). */
function leafPath(L: number, W: number, bend: number): string {
  return (
    `M${f(-L / 2)} 0` +
    `C${f(-L * 0.22)} ${f(-W * 1.05)} ${f(L * 0.28)} ${f(-W * 0.85 + bend)} ${f(L / 2)} ${f(bend * 0.3)}` +
    `C${f(L * 0.25)} ${f(W * 0.75 + bend)} ${f(-L * 0.2)} ${f(W * 1.0)} ${f(-L / 2)} 0Z`
  );
}

/** Petalo allungato con base nell'origine e punta in (L, 0). */
function petalPath(L: number, W: number): string {
  return `M0 0C${f(L * 0.2)} ${f(-W)} ${f(L * 0.75)} ${f(-W * 0.9)} ${f(L)} 0C${f(L * 0.75)} ${f(W * 0.9)} ${f(L * 0.2)} ${f(W)} 0 0Z`;
}

export const leaf: VisualDef = {
  label: 'Foglie lisce (basilico)',
  baseCount: 6,
  defaultColors: ['#2F7A34', '#4F9C3F'],
  render({ rng, colors, count, uid }) {
    const dark = colorAt(colors, 0, '#2F7A34');
    const light = colors[1] ?? shade(dark, 0.25);
    const gid = `${uid}-lg`;
    const pts = scatter(rng, count, { radius: R_TOP - 16, minDist: 72 });
    let out = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>`;
    for (const p of pts) {
      const L = rng.range(54, 74);
      const W = L * rng.range(0.33, 0.41);
      const bend = rng.signed() * 5;
      const rot = rng.range(0, 360);
      const d = leafPath(L, W, bend);
      out += `<g transform="${place(p.x + 2.4, p.y + 3.2, rot)}"><path d="${d}" fill="#1f2a0c" opacity=".24"/></g>`;
      let veins = '';
      for (const t of [-0.22, 0.02, 0.24]) {
        const x = L * t;
        veins += `M${f(x)} 0Q${f(x + L * 0.08)} ${f(-W * 0.4)} ${f(x + L * 0.16)} ${f(-W * 0.72)}M${f(x)} 0Q${f(x + L * 0.08)} ${f(W * 0.4)} ${f(x + L * 0.16)} ${f(W * 0.72)}`;
      }
      out +=
        `<g transform="${place(p.x, p.y, rot)}">` +
        `<path d="${d}" fill="url(#${gid})" stroke="${shade(dark, -0.3)}" stroke-width=".8" stroke-opacity=".5"/>` +
        `<path d="M${f(-L / 2 + 2)} 0Q0 ${f(bend * 0.2)} ${f(L / 2 - 3)} ${f(bend * 0.25)}" stroke="${shade(dark, -0.35)}" stroke-width="1.5" fill="none" opacity=".55"/>` +
        `<path d="${veins}" stroke="${shade(dark, -0.3)}" stroke-width="1" fill="none" opacity=".35"/>` +
        `<path d="M${f(-L * 0.3)} ${f(-W * 0.35)}Q0 ${f(-W * 0.72)} ${f(L * 0.25)} ${f(-W * 0.42)}" stroke="#fff" stroke-width="2.4" opacity=".22" fill="none" stroke-linecap="round"/>` +
        `</g>`;
    }
    return out;
  },
};

function jaggedLeaf(rng: Rng, L: number, W: number): string {
  const lobes = rng.int(4, 6);
  const top: Pt[] = [{ x: -L / 2, y: 0 }];
  const bottom: Pt[] = [];
  for (let i = 1; i <= lobes; i++) {
    const t = i / (lobes + 1);
    const x = -L / 2 + t * L;
    const envelope = Math.sin(Math.PI * Math.min(1, t * 1.15));
    top.push({ x, y: -W * envelope * (i % 2 ? 1 : 0.5) * (0.85 + rng.next() * 0.3) });
    bottom.push({ x: x + L * 0.04, y: W * envelope * (i % 2 ? 0.55 : 1) * (0.85 + rng.next() * 0.3) });
  }
  top.push({ x: L / 2, y: 0 });
  return smoothClosed([...top, ...bottom.reverse()]);
}

export const arugula: VisualDef = {
  label: 'Foglie frastagliate (rucola)',
  baseCount: 13,
  defaultColors: ['#4E7F2C', '#6E9E3C'],
  render({ rng, colors, count }) {
    const a = colorAt(colors, 0, '#4E7F2C');
    const b = colors[1] ?? shade(a, 0.2);
    const pts = scatter(rng, count, { radius: R_TOP - 10, minDist: 44 });
    let out = '';
    for (const p of pts) {
      const L = rng.range(44, 62);
      const W = L * rng.range(0.25, 0.31);
      const rot = rng.range(0, 360);
      const d = jaggedLeaf(rng, L, W);
      const fill = rng.chance(0.5) ? a : b;
      out +=
        `<g transform="${place(p.x + 2, p.y + 2.6, rot)}"><path d="${d}" fill="#1f2a0c" opacity=".22"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}"><path d="${d}" fill="${fill}"/>` +
        `<path d="M${f(-L / 2)} 0L${f(L / 2 - 2)} 0" stroke="${shade(b, 0.35)}" stroke-width="1.4" opacity=".7"/></g>`;
    }
    return out;
  },
};

export const greens: VisualDef = {
  label: 'Verdure a foglia cotte',
  baseCount: 8,
  defaultColors: ['#2E4D1E', '#4A6E2B'],
  render({ rng, colors, count }) {
    const a = colorAt(colors, 0, '#2E4D1E');
    const b = colors[1] ?? shade(a, 0.2);
    const c = shade(a, -0.18);
    const pts = scatter(rng, count, { radius: R_TOP - 12, minDist: 58 });
    const fills = [a, b, c];
    const paths = ['', '', ''];
    let stems = '';
    let shadow = '';
    let sheen = '';
    for (const p of pts) {
      const n = rng.int(4, 6);
      for (let i = 0; i < n; i++) {
        const x = p.x + rng.signed() * 15;
        const y = p.y + rng.signed() * 15;
        const r = rng.range(10, 16);
        const shape = blob(rng, x, y, r, { points: 8, jitter: 0.45 });
        const k = rng.int(0, 2);
        paths[k] += shape;
        shadow += blob(rng, x + 2, y + 2.8, r, { points: 7, jitter: 0.4 });
      }
      const sn = rng.int(1, 2);
      for (let i = 0; i < sn; i++) {
        const ang = rng.range(0, Math.PI * 2);
        const len = rng.range(20, 32);
        const ex = p.x + Math.cos(ang) * len;
        const ey = p.y + Math.sin(ang) * len;
        stems += `M${f(p.x)} ${f(p.y)}Q${f((p.x + ex) / 2 + rng.signed() * 5)} ${f((p.y + ey) / 2 + rng.signed() * 5)} ${f(ex)} ${f(ey)}`;
      }
      sheen += blob(rng, p.x - 4, p.y - 6, 3.2, { points: 6, jitter: 0.3 });
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".16"/>` +
      `<path d="${stems}" stroke="${shade(b, 0.28)}" stroke-width="2.8" fill="none" stroke-linecap="round" opacity=".85"/>` +
      paths.map((d, i) => `<path d="${d}" fill="${fills[i]}"/>`).join('') +
      `<path d="${sheen}" fill="#fff" opacity=".18"/>`
    );
  },
};

export const flower: VisualDef = {
  label: 'Fiori',
  baseCount: 4,
  defaultColors: ['#F2A023', '#F7C548'],
  render({ rng, colors, count }) {
    const a = colorAt(colors, 0, '#F2A023');
    const b = colors[1] ?? shade(a, 0.2);
    const pts = scatter(rng, count, { radius: R_TOP - 44, minDist: 104 });
    let out = '';
    for (const p of pts) {
      const rot = rng.range(0, 360);
      const L = rng.range(60, 74);
      let petals = '';
      let veins = '';
      [-30, -15, 0, 15, 30].forEach((deg, i) => {
        const W = rng.range(12, 15);
        const d = petalPath(L * rng.range(0.85, 1.05), W);
        petals += `<path d="${d}" transform="rotate(${deg})" fill="${i % 2 ? b : a}" stroke="${shade(a, -0.2)}" stroke-width=".7" stroke-opacity=".6"/>`;
        veins += `<path d="M2 0L${f(L * 0.8)} 0" transform="rotate(${deg})" stroke="${shade(a, -0.25)}" stroke-width=".8" opacity=".5"/>`;
      });
      out +=
        `<g transform="${place(p.x + 3, p.y + 4, rot)}"><path d="${petalPath(L, 34)}" fill="${SHADOW}" opacity=".15"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}">${petals}${veins}` +
        `<path d="M0 0L-22 0" stroke="#5E8A3A" stroke-width="5" stroke-linecap="round"/>` +
        `<circle r="8" fill="#4E7A2E"/></g>`;
    }
    return out;
  },
};
