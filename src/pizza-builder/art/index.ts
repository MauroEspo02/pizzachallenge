/**
 * Composizione dell'illustrazione a layer sovrapposti:
 * ombra → impasto → base (salsa/crema o bianca) → formaggi → condimenti → finiture a crudo.
 * Ogni ingrediente ha il suo seme: aggiungerne uno non sposta i pezzi degli altri.
 */
import { GENERIC_PALETTE, isHexColor } from './color';
import { renderBase, renderDough, renderUnder } from './dough';
import { Rng, hashString } from './rng';
import { SIZE } from './geometry';
import { visualDef } from './visuals';
import { LAYER_RANK, type Layer } from '../types';

export interface ArtIngredient {
  /** Chiave stabile del gruppo (id ingrediente o "x-…" per quelli senza grafica). */
  key: string;
  visual: string;
  layer: Layer;
  density: number;
  colors: string[];
}

export interface ArtGroup {
  key: string;
  layer: Layer;
  svg: string;
}

export interface PizzaArt {
  uid: string;
  under: string;
  dough: string;
  base: ArtGroup;
  groups: ArtGroup[];
}

const SAFE_KEY = /^[a-z0-9-]{1,48}$/;

function safeColors(colors: string[], fallback: string[]): string[] {
  const valid = colors.filter(isHexColor);
  return valid.length ? valid : fallback;
}

/** Fattore di affollamento: con tanti ingredienti si disegnano meno pezzi di ciascuno. */
function crowdFactor(toppings: number): number {
  if (toppings <= 3) return 1;
  return Math.max(0.5, 1 - (toppings - 3) * 0.08);
}

export function buildPizzaArt(seed: number, ingredients: ArtIngredient[], uid = 'pz'): PizzaArt {
  const cleanUid = uid.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24) || 'pz';
  const items = ingredients.filter((ing) => SAFE_KEY.test(ing.key));

  const baseIndex = items.findIndex((ing) => ing.visual === 'sauce');
  const baseIngredient = baseIndex >= 0 ? items[baseIndex]! : null;
  const others = items.filter((_, i) => i !== baseIndex);
  const toppings = others.filter((ing) => ing.layer !== 'sauce' || ing.visual !== 'sauce').length;
  const crowd = crowdFactor(toppings);

  const ordered = others
    .map((ing, order) => ({ ing, order }))
    .sort((a, b) => LAYER_RANK[a.ing.layer] - LAYER_RANK[b.ing.layer] || a.order - b.order)
    .map(({ ing }) => ing);

  const groups: ArtGroup[] = ordered.map((ing) => {
    const def = visualDef(ing.visual);
    const rng = new Rng(hashString(`${seed}|${ing.key}`));
    const density = Number.isFinite(ing.density) ? Math.min(3, Math.max(0.2, ing.density)) : 1;
    const count = Math.max(1, Math.round(def.baseCount * density * crowd));
    const svg = def.render({ rng, colors: safeColors(ing.colors, def.defaultColors), count, uid: `${cleanUid}-${ing.key}` });
    return { key: ing.key, layer: ing.layer, svg };
  });

  const baseRng = new Rng(hashString(`${seed}|base`));
  const base: ArtGroup = baseIngredient
    ? {
        key: `base-${baseIngredient.key}`,
        layer: 'sauce',
        svg: renderBase(baseRng, `${cleanUid}-b`, safeColors(baseIngredient.colors, ['#C2381F'])),
      }
    : { key: 'base-bianca', layer: 'sauce', svg: renderBase(baseRng, `${cleanUid}-b`, null) };

  return {
    uid: cleanUid,
    under: renderUnder(cleanUid),
    dough: renderDough(new Rng(hashString(`${seed}|dough`)), cleanUid),
    base,
    groups,
  };
}

export function pizzaArtToSvg(art: PizzaArt, title?: string): string {
  const label = title ? `<title>${escapeXml(title)}</title>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img">${label}` +
    art.under +
    art.dough +
    `<g data-ing="${art.base.key}">${art.base.svg}</g>` +
    art.groups.map((g) => `<g data-ing="${g.key}">${g.svg}</g>`).join('') +
    `</svg>`
  );
}

/** Colore stabile per un ingrediente senza grafica, derivato dal nome. */
export function genericColorFor(label: string): string {
  return GENERIC_PALETTE[hashString(label) % GENERIC_PALETTE.length]!;
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]!);
}
