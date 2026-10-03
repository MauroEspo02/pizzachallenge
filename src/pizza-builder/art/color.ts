/** Utilità colore: le sfumature tendono a toni caldi (cottura), non al grigio. */
const HEX = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = HEX.exec(hex);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const WARM_DARK = '#2a1408';
const WARM_LIGHT = '#fff7e8';

/** amount > 0 schiarisce, amount < 0 scurisce (tra -1 e 1). */
export function shade(hex: string, amount: number): string {
  return amount >= 0 ? mix(hex, WARM_LIGHT, amount) : mix(hex, WARM_DARK, -amount);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Colori di ripiego per gli ingredienti senza grafica: toni "cibo" smorzati. */
export const GENERIC_PALETTE = ['#B5835A', '#8E6B3E', '#C9A15B', '#9C7B5B', '#A35D3A', '#7D8A4A', '#B8A07A', '#8C5A4A'];
