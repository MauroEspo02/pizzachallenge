/** Impasto: cornicione leopardato, fondo bianco o base spalmata (pomodoro, creme…). */
import { mix, shade } from './color';
import { blob, C, circlePath, ellipsePath, polar, R_CRUST, R_SAUCE, shard, wobblyCircle } from './geometry';
import type { Rng } from './rng';

export function renderUnder(uid: string): string {
  return (
    `<defs><radialGradient id="${uid}-sh" cx="50%" cy="50%" r="50%">` +
    `<stop offset=".84" stop-color="#3a1f0c" stop-opacity=".34"/><stop offset="1" stop-color="#3a1f0c" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<ellipse cx="${C + 6}" cy="${C + 13}" rx="${R_CRUST + 17}" ry="${R_CRUST + 13}" fill="url(#${uid}-sh)"/>`
  );
}

export function renderDough(rng: Rng, uid: string): string {
  const crust = wobblyCircle(rng, C, C, R_CRUST, 5, 44);
  let out =
    `<defs>` +
    `<radialGradient id="${uid}-cr" cx="50%" cy="50%" r="50%">` +
    `<stop offset=".76" stop-color="#E2B377"/>` +
    `<stop offset=".83" stop-color="#EBC68E"/>` +
    `<stop offset=".885" stop-color="#F5DCAB"/>` +
    `<stop offset=".935" stop-color="#E8B673"/>` +
    `<stop offset=".975" stop-color="#C98642"/>` +
    `<stop offset="1" stop-color="#9B5C26"/>` +
    `</radialGradient>` +
    `<linearGradient id="${uid}-li" x1=".12" y1=".08" x2=".88" y2=".92">` +
    `<stop offset="0" stop-color="#fff7e4" stop-opacity=".34"/><stop offset=".48" stop-color="#fff7e4" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#4a2410" stop-opacity=".22"/></linearGradient>` +
    `</defs>` +
    `<path d="${crust}" fill="url(#${uid}-cr)"/>`;

  // Bolle del cornicione con la punta bruciacchiata.
  let bubbles = '';
  let caps = '';
  const nb = rng.int(5, 8);
  for (let i = 0; i < nb; i++) {
    const a = rng.range(0, Math.PI * 2);
    const p = polar(rng.range(214, 224), a);
    const rx = rng.range(8, 14);
    const ry = rng.range(5, 8);
    const deg = (a * 180) / Math.PI + 90;
    bubbles += ellipsePath(p.x, p.y, rx, ry, deg);
    const q = polar(rng.range(219, 227), a + rng.signed() * 0.02);
    caps += ellipsePath(q.x, q.y, rx * 0.55, ry * 0.45, deg);
  }
  out += `<path d="${bubbles}" fill="#F8E4BC" opacity=".75"/><path d="${caps}" fill="#5A3114" opacity=".55"/>`;

  // Leopardatura: macchie scure a grappoli, tipiche del forno a legna.
  let halos = '';
  let cores = '';
  const clusters = rng.int(11, 16);
  for (let c = 0; c < clusters; c++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(R_SAUCE + 12, R_CRUST - 7);
    const center = polar(r, a);
    const spots = rng.int(1, 4);
    for (let s = 0; s < spots; s++) {
      const x = center.x + rng.signed() * 9;
      const y = center.y + rng.signed() * 9;
      const size = rng.range(2, 6.2) * (rng.chance(0.12) ? 1.5 : 1);
      halos += blob(rng, x, y, size * 2.1, { points: 7, jitter: 0.35 });
      cores += blob(rng, x, y, size, { points: 6, jitter: 0.42 });
    }
  }
  out += `<path d="${halos}" fill="#7A4318" opacity=".26"/><path d="${cores}" fill="#2B170B" opacity=".8"/>`;

  // Farina sul bordo.
  let flour = '';
  for (let i = 0; i < 46; i++) {
    const p = polar(rng.range(R_SAUCE + 8, R_CRUST - 3), rng.range(0, Math.PI * 2));
    flour += circlePath(p.x, p.y, rng.range(0.6, 1.5));
  }
  out += `<path d="${flour}" fill="#FFF8EA" opacity=".6"/>`;
  out += `<path d="${crust}" fill="url(#${uid}-li)"/>`;
  return out;
}

/** Base spalmata. Con colors = null disegna una pizza bianca (impasto con olio). */
export function renderBase(rng: Rng, uid: string, colors: string[] | null): string {
  const edge = wobblyCircle(rng, C, C, R_SAUCE, 6.5, 48);
  const base = colors?.[0] ?? '#E6C189';
  const isWhite = colors === null;
  const light = shade(base, isWhite ? 0.32 : 0.14);
  const dark = shade(base, isWhite ? -0.14 : -0.2);
  let out =
    `<defs><radialGradient id="${uid}-sa" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0" stop-color="${light}"/><stop offset=".72" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/>` +
    `</radialGradient></defs>` +
    `<path d="${edge}" fill="#5a2a0e" opacity=".22" transform="translate(1.5 2.5)"/>` +
    `<path d="${edge}" fill="url(#${uid}-sa)"/>`;

  let lightPatches = '';
  let darkPatches = '';
  for (let i = 0; i < 14; i++) {
    const p = polar(Math.sqrt(rng.next()) * (R_SAUCE - 24), rng.range(0, Math.PI * 2));
    lightPatches += blob(rng, p.x, p.y, rng.range(9, 26), { points: 8, jitter: 0.38 });
  }
  for (let i = 0; i < 10; i++) {
    const p = polar(Math.sqrt(rng.next()) * (R_SAUCE - 18), rng.range(0, Math.PI * 2));
    darkPatches += blob(rng, p.x, p.y, rng.range(7, 20), { points: 8, jitter: 0.4 });
  }
  out += `<path d="${lightPatches}" fill="${shade(base, isWhite ? 0.3 : 0.2)}" opacity=".32"/>`;
  out += `<path d="${darkPatches}" fill="${isWhite ? '#C98F4E' : shade(base, -0.22)}" opacity="${isWhite ? '.34' : '.26'}"/>`;

  if (!isWhite) {
    // Pezzetti di polpa e buccia.
    let bits = '';
    for (let i = 0; i < 26; i++) {
      const p = polar(Math.sqrt(rng.next()) * (R_SAUCE - 10), rng.range(0, Math.PI * 2));
      bits += shard(rng, p.x, p.y, rng.range(1.2, 2.6));
    }
    out += `<path d="${bits}" fill="${shade(base, -0.3)}" opacity=".35"/>`;
  } else {
    // Bruciature leggere al centro.
    let char = '';
    for (let i = 0; i < 12; i++) {
      const p = polar(Math.sqrt(rng.next()) * (R_SAUCE - 30), rng.range(0, Math.PI * 2));
      char += blob(rng, p.x, p.y, rng.range(2, 4.6), { points: 6, jitter: 0.4 });
    }
    out += `<path d="${char}" fill="#6B3A17" opacity=".45"/>`;
  }

  // Lucidità dell'olio.
  let sheen = '';
  for (let i = 0; i < 9; i++) {
    const p = polar(Math.sqrt(rng.next()) * (R_SAUCE - 30), rng.range(0, Math.PI * 2));
    sheen += ellipsePath(p.x, p.y, rng.range(3, 10), rng.range(1.4, 3.6), rng.range(0, 180));
  }
  out += `<path d="${sheen}" fill="#FFF1DC" opacity="${isWhite ? '.35' : '.22'}"/>`;
  out += `<path d="${edge}" fill="none" stroke="${mix(dark, '#3a1a08', 0.4)}" stroke-width="3" stroke-opacity=".38"/>`;
  return out;
}
