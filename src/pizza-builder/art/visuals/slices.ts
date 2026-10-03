/** Fette e pezzi tondi: salumi, verdure, funghi, pomodorini, fichi, carciofi. */
import { luminance, mix, shade } from '../color';
import { blob, blobPoints, circlePath, ellipsePath, f, place, R_TOP, scatter, smoothClosed } from '../geometry';
import { colorAt, SHADOW, type VisualDef } from './types';

export const salami: VisualDef = {
  label: 'Fette di salume tondo',
  baseCount: 8,
  defaultColors: ['#B6353A', '#8A2228'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#B6353A');
    const rim = colors[1] ?? shade(body, -0.3);
    const pts = scatter(rng, count, { radius: R_TOP - 10, minDist: 54 });
    let shadow = '';
    let main = '';
    let rims = '';
    let fat = '';
    let shine = '';
    for (const p of pts) {
      const r = rng.range(23, 29);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 12, jitter: 0.05 });
      shadow += smoothClosed(shape, 2.6, 3.4);
      main += smoothClosed(shape);
      rims += smoothClosed(shape);
      const n = rng.int(9, 14);
      for (let i = 0; i < n; i++) {
        const a = rng.range(0, Math.PI * 2);
        const d = Math.sqrt(rng.next()) * r * 0.75;
        fat += blob(rng, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, rng.range(1.4, 3), { points: 5, jitter: 0.35 });
      }
      const a0 = rng.range(3.4, 4.2);
      shine += `M${f(p.x + Math.cos(a0) * r * 0.62)} ${f(p.y + Math.sin(a0) * r * 0.62)}A${f(r * 0.62)} ${f(r * 0.62)} 0 0 1 ${f(p.x + Math.cos(a0 + 1.2) * r * 0.62)} ${f(p.y + Math.sin(a0 + 1.2) * r * 0.62)}`;
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".2"/>` +
      `<path d="${main}" fill="${body}"/>` +
      `<path d="${rims}" fill="none" stroke="${rim}" stroke-width="3.6" opacity=".85"/>` +
      `<path d="${fat}" fill="#F4D8CB" opacity=".9"/>` +
      `<path d="${shine}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".28"/>`
    );
  },
};

export const vegSlice: VisualDef = {
  label: 'Rondelle di verdura',
  baseCount: 10,
  defaultColors: ['#3F7A2E', '#E5E3A9'],
  render({ rng, colors, count }) {
    const skin = colorAt(colors, 0, '#3F7A2E');
    const flesh = colors[1] ?? shade(skin, 0.6);
    const pts = scatter(rng, count, { radius: R_TOP - 8, minDist: 44 });
    let shadow = '';
    let outer = '';
    let inner = '';
    let seeds = '';
    let roast = '';
    for (const p of pts) {
      const r = rng.range(17, 22);
      shadow += circlePath(p.x + 2, p.y + 2.6, r);
      outer += circlePath(p.x, p.y, r);
      inner += blob(rng, p.x, p.y, r - 3.2, { points: 10, jitter: 0.04 });
      const n = rng.int(6, 8);
      const off = rng.range(0, Math.PI);
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        seeds += ellipsePath(p.x + Math.cos(a) * r * 0.45, p.y + Math.sin(a) * r * 0.45, 2.2, 1.1, (a * 180) / Math.PI);
      }
      if (rng.chance(0.6)) roast += blob(rng, p.x + rng.signed() * 6, p.y + rng.signed() * 6, rng.range(3.5, 6.5), { points: 6, jitter: 0.4 });
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".16"/>` +
      `<path d="${outer}" fill="${skin}"/>` +
      `<path d="${inner}" fill="${flesh}"/>` +
      `<path d="${seeds}" fill="${shade(flesh, -0.18)}" opacity=".8"/>` +
      `<path d="${roast}" fill="#9C6A2E" opacity=".35"/>`
    );
  },
};

export const potato: VisualDef = {
  label: 'Fette di patata',
  baseCount: 8,
  defaultColors: ['#F0DB9C', '#C68E3F'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#F0DB9C');
    const edge = colors[1] ?? shade(body, -0.3);
    const pts = scatter(rng, count, { radius: R_TOP - 14, minDist: 46 });
    let shadow = '';
    let main = '';
    let brown = '';
    let shine = '';
    for (const p of pts) {
      const r = rng.range(25, 32);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 10, jitter: 0.07, squash: rng.range(0.78, 0.92) });
      shadow += smoothClosed(shape, 2, 2.6);
      main += smoothClosed(shape);
      const n = rng.int(2, 4);
      for (let i = 0; i < n; i++) brown += blob(rng, p.x + rng.signed() * r * 0.5, p.y + rng.signed() * r * 0.4, rng.range(3, 6), { points: 6, jitter: 0.4 });
      shine += ellipsePath(p.x - r * 0.25, p.y - r * 0.25, r * 0.35, r * 0.1, -20);
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".14"/>` +
      `<path d="${main}" fill="${body}" stroke="${edge}" stroke-width="2.8" stroke-opacity=".75"/>` +
      `<path d="${brown}" fill="${edge}" opacity=".45"/>` +
      `<path d="${shine}" fill="#fff" opacity=".35"/>`
    );
  },
};

export const eggplant: VisualDef = {
  label: 'Fette di melanzana',
  baseCount: 7,
  defaultColors: ['#3F1D3A', '#D8B36E'],
  render({ rng, colors, count }) {
    const skin = colorAt(colors, 0, '#3F1D3A');
    const flesh = colors[1] ?? '#D8B36E';
    const pts = scatter(rng, count, { radius: R_TOP - 16, minDist: 62 });
    let shadow = '';
    let outer = '';
    let inner = '';
    let seeds = '';
    let roast = '';
    for (const p of pts) {
      const r = rng.range(27, 34);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 11, jitter: 0.06, squash: rng.range(0.88, 1) });
      shadow += smoothClosed(shape, 2.6, 3.2);
      outer += smoothClosed(shape);
      inner += blob(rng, p.x, p.y, r - 4.6, { points: 10, jitter: 0.06 });
      const n = rng.int(14, 22);
      for (let i = 0; i < n; i++) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(r * 0.15, r * 0.62);
        seeds += ellipsePath(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.9, 1.05, rng.range(0, 180));
      }
      roast += blob(rng, p.x + rng.signed() * 3, p.y + rng.signed() * 3, r * 0.45, { points: 7, jitter: 0.35 });
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".18"/>` +
      `<path d="${outer}" fill="${skin}"/>` +
      `<path d="${inner}" fill="${flesh}"/>` +
      `<path d="${roast}" fill="${shade(flesh, -0.25)}" opacity=".35"/>` +
      `<path d="${seeds}" fill="${shade(flesh, -0.45)}" opacity=".75"/>`
    );
  },
};

export const tomatoSlice: VisualDef = {
  label: 'Fette di pomodoro',
  baseCount: 5,
  defaultColors: ['#D23C27', '#EA6A47'],
  render({ rng, colors, count }) {
    const skin = colorAt(colors, 0, '#D23C27');
    const flesh = colors[1] ?? shade(skin, 0.2);
    const pts = scatter(rng, count, { radius: R_TOP - 22, minDist: 70 });
    let out = '';
    for (const p of pts) {
      const r = rng.range(29, 35);
      const rot = rng.range(0, 360);
      let chambers = '';
      let seeds = '';
      const n = rng.int(4, 5);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const cx = Math.cos(a) * r * 0.5;
        const cy = Math.sin(a) * r * 0.5;
        chambers += ellipsePath(cx, cy, r * 0.27, r * 0.17, (a * 180) / Math.PI);
        seeds += ellipsePath(cx, cy, 2.2, 1.2, (a * 180) / Math.PI + 90);
      }
      out +=
        `<g transform="${place(p.x + 2.6, p.y + 3.4, rot)}"><path d="${circlePath(0, 0, r)}" fill="${SHADOW}" opacity=".18"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}"><path d="${circlePath(0, 0, r)}" fill="${skin}"/>` +
        `<path d="${circlePath(0, 0, r - 3.2)}" fill="${flesh}"/>` +
        `<path d="${chambers}" fill="#F6A585" opacity=".9"/><path d="${seeds}" fill="#FCE6C8"/>` +
        `<path d="${circlePath(0, 0, r * 0.18)}" fill="${shade(flesh, 0.2)}"/></g>`;
    }
    return out;
  },
};

export const wurstel: VisualDef = {
  label: 'Rondelle (würstel)',
  baseCount: 12,
  defaultColors: ['#D9897A', '#B4604F'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#D9897A');
    const rim = colors[1] ?? shade(body, -0.25);
    const pts = scatter(rng, count, { radius: R_TOP - 6, minDist: 36 });
    let shadow = '';
    let main = '';
    let inner = '';
    for (const p of pts) {
      const r = rng.range(13, 16);
      shadow += circlePath(p.x + 1.8, p.y + 2.4, r);
      main += circlePath(p.x, p.y, r);
      inner += circlePath(p.x - 0.5, p.y - 0.5, r - 2.8);
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".18"/>` +
      `<path d="${main}" fill="${rim}"/>` +
      `<path d="${inner}" fill="${body}"/>`
    );
  },
};

export const mushroom: VisualDef = {
  label: 'Funghi a fette',
  baseCount: 8,
  defaultColors: ['#E9D6B8', '#9C7852'],
  render({ rng, colors, count }) {
    const flesh = colorAt(colors, 0, '#E9D6B8');
    const skin = colors[1] ?? shade(flesh, -0.4);
    const dark = mix(skin, '#2a1408', 0.35);
    const big = luminance(skin) < 0.3;
    const pts = scatter(rng, count, { radius: R_TOP - 18, minDist: big ? 66 : 56 });
    let out = '';
    for (const p of pts) {
      const s = rng.range(1.55, 1.9) * (big ? 1.2 : 1);
      const W = 26;
      const H = 12;
      const S = 9;
      const L = 13;
      const body = `M${-W / 2} 0C${-W / 2} ${f(-H * 1.35)} ${W / 2} ${f(-H * 1.35)} ${W / 2} 0C${f(W * 0.38)} ${f(H * 0.18)} ${f(S * 0.75)} ${f(H * 0.08)} ${f(S / 2)} ${f(H * 0.25)}L${f(S * 0.45)} ${L}Q0 ${f(L + 2.5)} ${f(-S * 0.45)} ${L}L${f(-S / 2)} ${f(H * 0.25)}C${f(-S * 0.75)} ${f(H * 0.08)} ${f(-W * 0.38)} ${f(H * 0.18)} ${-W / 2} 0Z`;
      const cap = `M${-W / 2} 0C${-W / 2} ${f(-H * 1.35)} ${W / 2} ${f(-H * 1.35)} ${W / 2} 0`;
      const rot = rng.range(0, 360);
      out +=
        `<g transform="${place(p.x + 2.6, p.y + 3.2, rot, s)}"><path d="${body}" fill="${SHADOW}" opacity=".18"/></g>` +
        `<g transform="${place(p.x, p.y, rot, s)}"><path d="${body}" fill="${flesh}"/>` +
        `<path d="${cap}" fill="none" stroke="${skin}" stroke-width="${big ? 3.4 : 1.8}" stroke-linecap="round"/>` +
        `<path d="M${f(-W * 0.4)} ${f(H * 0.06)}Q0 ${f(H * 0.34)} ${f(W * 0.4)} ${f(H * 0.06)}" fill="none" stroke="${dark}" stroke-width="1.1" opacity=".55"/>` +
        `<path d="M${f(-W * 0.2)} ${f(-H * 0.55)}Q0 ${f(-H * 0.85)} ${f(W * 0.2)} ${f(-H * 0.6)}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".35" stroke-linecap="round"/>` +
        `</g>`;
    }
    return out;
  },
};

export const cherryTomato: VisualDef = {
  label: 'Pomodorini',
  baseCount: 10,
  defaultColors: ['#D3301C', '#EE5B3B'],
  render({ rng, colors, count }) {
    const skin = colorAt(colors, 0, '#D3301C');
    const flesh = colors[1] ?? shade(skin, 0.25);
    const pts = scatter(rng, count, { radius: R_TOP - 8, minDist: 44 });
    let shadow = '';
    let halves = '';
    let whole = '';
    let flesheS = '';
    let jelly = '';
    let shine = '';
    let calyx = '';
    for (const p of pts) {
      const r = rng.range(14, 18);
      shadow += circlePath(p.x + 2.2, p.y + 3, r);
      if (rng.chance(0.72)) {
        halves += blob(rng, p.x, p.y, r, { points: 9, jitter: 0.05 });
        flesheS += blob(rng, p.x, p.y, r - 2.4, { points: 9, jitter: 0.05 });
        const off = rng.range(0, Math.PI * 2);
        for (let i = 0; i < 3; i++) {
          const a = off + (i / 3) * Math.PI * 2;
          jelly += ellipsePath(p.x + Math.cos(a) * r * 0.42, p.y + Math.sin(a) * r * 0.42, r * 0.3, r * 0.2, (a * 180) / Math.PI);
        }
      } else {
        whole += circlePath(p.x, p.y, r);
        shine += ellipsePath(p.x - r * 0.35, p.y - r * 0.38, r * 0.32, r * 0.18, -35);
        if (rng.chance(0.5)) {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            calyx += ellipsePath(p.x + Math.cos(a) * 3.6, p.y + Math.sin(a) * 3.6, 3.6, 1.2, (a * 180) / Math.PI);
          }
        }
      }
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".2"/>` +
      `<path d="${halves}" fill="${skin}"/>` +
      `<path d="${flesheS}" fill="${flesh}"/>` +
      `<path d="${jelly}" fill="${mix(flesh, '#FCE3C4', 0.55)}" opacity=".9"/>` +
      `<path d="${whole}" fill="${skin}"/>` +
      `<path d="${shine}" fill="#fff" opacity=".5"/>` +
      `<path d="${calyx}" fill="#3E6B2A"/>`
    );
  },
};

export const fig: VisualDef = {
  label: 'Fichi',
  baseCount: 5,
  defaultColors: ['#5E2C4A', '#C9485B'],
  render({ rng, colors, count }) {
    const skin = colorAt(colors, 0, '#5E2C4A');
    const flesh = colors[1] ?? '#C9485B';
    const pts = scatter(rng, count, { radius: R_TOP - 20, minDist: 66 });
    let out = '';
    for (const p of pts) {
      const r = rng.range(22, 27);
      const rot = rng.range(0, 360);
      const outline = smoothClosed([
        { x: -r * 1.05, y: 0 },
        { x: -r * 0.55, y: -r * 0.78 },
        { x: r * 0.35, y: -r * 0.85 },
        { x: r * 1.0, y: -r * 0.3 },
        { x: r * 1.0, y: r * 0.3 },
        { x: r * 0.35, y: r * 0.85 },
        { x: -r * 0.55, y: r * 0.78 },
      ]);
      let seeds = '';
      for (let i = 0; i < 18; i++) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(r * 0.15, r * 0.6);
        seeds += ellipsePath(Math.cos(a) * d, Math.sin(a) * d * 0.8, 1.7, 0.85, rng.range(0, 180));
      }
      out +=
        `<g transform="${place(p.x + 2, p.y + 2.4, rot)}"><path d="${outline}" fill="${SHADOW}" opacity=".18"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}"><path d="${outline}" fill="${skin}"/>` +
        `<path d="${outline}" transform="scale(.82)" fill="${flesh}"/>` +
        `<path d="${outline}" transform="scale(.42)" fill="${mix(flesh, '#F6D9B0', 0.55)}"/>` +
        `<path d="${seeds}" fill="#F3DFAE"/></g>`;
    }
    return out;
  },
};

export const artichoke: VisualDef = {
  label: 'Carciofi',
  baseCount: 6,
  defaultColors: ['#A7A55E', '#7B4C6C'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#A7A55E');
    const tip = colors[1] ?? '#7B4C6C';
    const pts = scatter(rng, count, { radius: R_TOP - 20, minDist: 62 });
    let out = '';
    for (const p of pts) {
      const L = rng.range(42, 52);
      const W = L * 0.45;
      const rot = rng.range(0, 360);
      const shape = `M0 0C${f(L * 0.15)} ${f(-W)} ${f(L * 0.85)} ${f(-W * 1.05)} ${f(L)} 0C${f(L * 0.85)} ${f(W * 1.05)} ${f(L * 0.15)} ${f(W)} 0 0Z`;
      let layers = '';
      for (const t of [0.45, 0.65, 0.85]) {
        layers += `M${f(L * t)} ${f(-W * 0.75 * (1 - t * 0.3))}Q${f(L * (t + 0.1))} 0 ${f(L * t)} ${f(W * 0.75 * (1 - t * 0.3))}`;
      }
      out +=
        `<g transform="${place(p.x + 1.8, p.y + 2.2, rot)}"><path d="${shape}" fill="${SHADOW}" opacity=".18"/></g>` +
        `<g transform="${place(p.x, p.y, rot)}"><path d="${shape}" fill="${body}"/>` +
        `<path d="${layers}" fill="none" stroke="${shade(body, -0.3)}" stroke-width="1.6" opacity=".7"/>` +
        `<path d="M${f(L * 0.92)} ${f(-W * 0.35)}Q${f(L * 1.02)} 0 ${f(L * 0.92)} ${f(W * 0.35)}" fill="none" stroke="${tip}" stroke-width="3.6" stroke-linecap="round" opacity=".85"/>` +
        `<path d="${blob(rng, L * 0.22, 0, W * 0.38, { points: 7, jitter: 0.2 })}" fill="${mix(body, '#F3EBC6', 0.55)}"/></g>`;
    }
    return out;
  },
};
