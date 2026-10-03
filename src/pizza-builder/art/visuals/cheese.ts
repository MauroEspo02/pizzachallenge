/** Formaggi e creme: pezzi filanti, burrata, erborinati, grattugiati, scaglie, ciuffi. */
import { shade, luminance } from '../color';
import { blob, blobPoints, C, ellipsePath, f, place, R_TOP, scatter, shard, smoothClosed } from '../geometry';
import { colorAt, SHADOW, type VisualDef } from './types';

export const melted: VisualDef = {
  label: 'Formaggio filante a pezzi',
  baseCount: 9,
  defaultColors: ['#FBF7EC', '#F0E3C2'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#FBF7EC');
    const edge = colors[1] ?? shade(body, -0.1);
    const pts = scatter(rng, count, { radius: R_TOP - 4, minDist: 54 });
    let shadow = '';
    let melt = '';
    let main = '';
    let toast = '';
    let shine = '';
    for (const p of pts) {
      const r = rng.range(22, 31);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 10, jitter: 0.24 });
      shadow += smoothClosed(shape, 2.4, 3.2);
      melt += blob(rng, p.x + rng.signed() * 2, p.y + rng.signed() * 2, r * 1.2, { points: 11, jitter: 0.28 });
      main += smoothClosed(shape);
      if (rng.chance(0.5)) {
        const spots = rng.int(1, 3);
        for (let i = 0; i < spots; i++) {
          toast += blob(rng, p.x + rng.signed() * r * 0.45, p.y + rng.signed() * r * 0.45, rng.range(3, 7), { points: 6, jitter: 0.35 });
        }
      }
      shine += ellipsePath(p.x - r * 0.3, p.y - r * 0.36, r * 0.3, r * 0.13, rng.range(-40, -10));
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".16"/>` +
      `<path d="${melt}" fill="${edge}" opacity=".5" stroke="#E09A52" stroke-width="1.5" stroke-opacity=".18"/>` +
      `<path d="${main}" fill="${body}" stroke="${shade(edge, -0.12)}" stroke-width="1" stroke-opacity=".55"/>` +
      `<path d="${toast}" fill="#C98E45" opacity=".5"/>` +
      `<path d="${shine}" fill="#fff" opacity=".55"/>`
    );
  },
};

export const veined: VisualDef = {
  label: 'Formaggio erborinato',
  baseCount: 8,
  defaultColors: ['#F4EBCB', '#5E7F7A'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#F4EBCB');
    const vein = colors[1] ?? '#5E7F7A';
    const pts = scatter(rng, count, { radius: R_TOP - 6, minDist: 54 });
    let shadow = '';
    let melt = '';
    let main = '';
    let veins = '';
    for (const p of pts) {
      const r = rng.range(20, 28);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 9, jitter: 0.26 });
      shadow += smoothClosed(shape, 2.4, 3);
      melt += blob(rng, p.x, p.y, r * 1.25, { points: 9, jitter: 0.32 });
      main += smoothClosed(shape);
      const n = rng.int(6, 10);
      for (let i = 0; i < n; i++) veins += shard(rng, p.x + rng.signed() * r * 0.6, p.y + rng.signed() * r * 0.6, rng.range(1.3, 3));
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".14"/>` +
      `<path d="${melt}" fill="${shade(body, -0.06)}" opacity=".6"/>` +
      `<path d="${main}" fill="${body}" stroke="${shade(body, -0.2)}" stroke-width="1" stroke-opacity=".5"/>` +
      `<path d="${veins}" fill="${vein}" opacity=".75"/>`
    );
  },
};

export const burrata: VisualDef = {
  label: 'Burrata al centro',
  baseCount: 1,
  defaultColors: ['#FFFDF6', '#F2EAD8'],
  render({ rng, colors, count, uid }) {
    const skin = colorAt(colors, 0, '#FFFDF6');
    const inner = colors[1] ?? shade(skin, -0.06);
    const pieces: Array<{ x: number; y: number; r: number }> = [{ x: C + rng.signed() * 24, y: C + rng.signed() * 24, r: 64 }];
    for (let i = 1; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(104, 132);
      pieces.push({ x: C + Math.cos(a) * d, y: C + Math.sin(a) * d, r: rng.range(22, 28) });
    }
    const gid = `${uid}-bg`;
    let out = `<defs><radialGradient id="${gid}" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="${skin}"/><stop offset="1" stop-color="${shade(inner, -0.08)}"/></radialGradient></defs>`;
    for (const piece of pieces) {
      const shape = blobPoints(rng, piece.x, piece.y, piece.r, { points: 12, jitter: piece.r > 30 ? 0.08 : 0.2 });
      out += `<path d="${smoothClosed(shape, 3, 5)}" fill="${SHADOW}" opacity=".18"/>`;
      out += `<path d="${smoothClosed(shape)}" fill="url(#${gid})"/>`;
      const ox = piece.x + rng.signed() * piece.r * 0.14;
      const oy = piece.y + rng.signed() * piece.r * 0.14;
      out += `<path d="${blob(rng, ox, oy, piece.r * 0.6, { points: 10, jitter: 0.24 })}" fill="${inner}"/>`;
      let strands = '';
      const n = Math.round(piece.r / 3);
      for (let i = 0; i < n; i++) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(0, piece.r * 0.42);
        strands += ellipsePath(ox + Math.cos(a) * d, oy + Math.sin(a) * d, rng.range(2.5, 6), rng.range(1, 2.2), rng.range(0, 180));
      }
      out += `<path d="${strands}" fill="#ffffff" opacity=".9"/>`;
      out += `<path d="${blob(rng, ox, oy, piece.r * 0.24, { points: 8, jitter: 0.25 })}" fill="#FFFEFA"/>`;
      const hr = piece.r * 0.78;
      out += `<path d="M${f(piece.x - hr * 0.8)} ${f(piece.y - hr * 0.35)}Q${f(piece.x - hr * 0.55)} ${f(piece.y - hr * 0.95)} ${f(piece.x + hr * 0.05)} ${f(piece.y - hr * 0.92)}" fill="none" stroke="#fff" stroke-width="${f(piece.r / 12)}" stroke-linecap="round" opacity=".75"/>`;
    }
    return out;
  },
};

export const grated: VisualDef = {
  label: 'Grattugiato',
  baseCount: 120,
  defaultColors: ['#F1DE9E', '#FAF0C8'],
  render({ rng, colors, count }) {
    const a = colorAt(colors, 0, '#F1DE9E');
    const b = colors[1] ?? shade(a, 0.35);
    let pa = '';
    let pb = '';
    const clusters = Array.from({ length: 6 }, () => ({ x: C + rng.signed() * 120, y: C + rng.signed() * 120 }));
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      if (rng.chance(0.3)) {
        const c = rng.pick(clusters);
        x = c.x + rng.signed() * 18;
        y = c.y + rng.signed() * 18;
      } else {
        const ang = rng.range(0, Math.PI * 2);
        const r = Math.sqrt(rng.next()) * (R_TOP + 14);
        x = C + Math.cos(ang) * r;
        y = C + Math.sin(ang) * r;
      }
      const s = shard(rng, x, y, rng.range(1.5, 3.4));
      if (rng.chance(0.62)) pa += s;
      else pb += s;
    }
    return `<path d="${pa}" fill="${a}"/><path d="${pb}" fill="${b}"/>`;
  },
};

export const shaved: VisualDef = {
  label: 'Scaglie',
  baseCount: 11,
  defaultColors: ['#EFD995', '#D3B464'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#EFD995');
    const edge = colors[1] ?? shade(body, -0.2);
    const pts = scatter(rng, count, { radius: R_TOP - 8, minDist: 42 });
    let out = '';
    for (const p of pts) {
      const len = rng.range(26, 40);
      const wid = rng.range(9, 13);
      const shape = smoothClosed([
        { x: -len / 2, y: rng.signed() * 2 },
        { x: -len * 0.15, y: -wid / 2 + rng.signed() },
        { x: len * 0.3, y: -wid * 0.45 },
        { x: len / 2, y: rng.signed() * 2 },
        { x: len * 0.2, y: wid / 2 },
        { x: -len * 0.25, y: wid * 0.42 },
      ]);
      const rot = rng.range(0, 360);
      out += `<g transform="${place(p.x + 1.5, p.y + 2, rot)}"><path d="${shape}" fill="${SHADOW}" opacity=".16"/></g>`;
      out += `<g transform="${place(p.x, p.y, rot)}"><path d="${shape}" fill="${body}" stroke="${edge}" stroke-width=".9" stroke-opacity=".7"/><path d="M${f(-len * 0.3)} ${f(-wid * 0.12)}L${f(len * 0.28)} ${f(-wid * 0.2)}" stroke="#fff" stroke-width="1.2" opacity=".45" stroke-linecap="round"/></g>`;
    }
    return out;
  },
};

export const dollop: VisualDef = {
  label: 'Ciuffi cremosi',
  baseCount: 7,
  defaultColors: ['#FBF8F0', '#EDE6D6'],
  render({ rng, colors, count }) {
    const body = colorAt(colors, 0, '#FBF8F0');
    const halo = colors[1] ?? shade(body, -0.1);
    const light = luminance(body) > 0.72;
    const pts = scatter(rng, count, { radius: R_TOP - 6, minDist: 58 });
    let shadow = '';
    let outer = '';
    let main = '';
    let texture = '';
    let shine = '';
    for (const p of pts) {
      const r = rng.range(18, 27);
      const shape = blobPoints(rng, p.x, p.y, r, { points: 10, jitter: 0.28 });
      shadow += smoothClosed(shape, 2, 2.8);
      outer += blob(rng, p.x, p.y, r * 1.22, { points: 10, jitter: 0.3 });
      main += smoothClosed(shape);
      const n = rng.int(3, 6);
      for (let i = 0; i < n; i++) texture += shard(rng, p.x + rng.signed() * r * 0.55, p.y + rng.signed() * r * 0.55, rng.range(1.6, 3.2));
      shine += ellipsePath(p.x - r * 0.3, p.y - r * 0.32, r * 0.26, r * 0.12, -25);
    }
    return (
      `<path d="${shadow}" fill="${SHADOW}" opacity=".13"/>` +
      `<path d="${outer}" fill="${halo}" opacity=".55"/>` +
      `<path d="${main}" fill="${body}" stroke="${shade(halo, -0.15)}" stroke-width="1" stroke-opacity=".45"/>` +
      `<path d="${texture}" fill="${light ? shade(body, -0.12) : shade(body, -0.28)}" opacity=".45"/>` +
      `<path d="${shine}" fill="#fff" opacity="${light ? '.6' : '.3'}"/>`
    );
  },
};
