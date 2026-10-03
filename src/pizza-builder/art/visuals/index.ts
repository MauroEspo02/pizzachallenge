/**
 * Registro degli aspetti grafici disponibili (visualAsset).
 * Per un nuovo tipo di disegno: scrivi un VisualDef e aggiungilo qui con una chiave nuova.
 * Gli ingredienti nuovi invece si creano dall'admin scegliendo uno di questi aspetti e due colori.
 */
import { burrata, dollop, grated, melted, shaved, veined } from './cheese';
import { arugula, flower, greens, leaf } from './greens';
import { crumble, cube, drape, fillet, folded, fries, olive, onion, ribbon, strip } from './pieces';
import { artichoke, cherryTomato, eggplant, fig, mushroom, potato, salami, tomatoSlice, vegSlice, wurstel } from './slices';
import { balls, drizzle, generic, granella, kernels, seeds, specks } from './small';
import type { VisualDef } from './types';

/** "sauce" come base usa il disegno dell'impasto; se ce n'è più d'una le altre diventano ciuffi. */
const sauce: VisualDef = { ...dollop, label: 'Base spalmata (salsa o crema)', defaultColors: ['#C2381F'] };

export const VISUALS = {
  sauce,
  dollop,
  melted,
  burrata,
  veined,
  grated,
  shaved,
  leaf,
  arugula,
  greens,
  flower,
  salami,
  'veg-slice': vegSlice,
  potato,
  eggplant,
  'tomato-slice': tomatoSlice,
  wurstel,
  mushroom,
  'cherry-tomato': cherryTomato,
  fig,
  artichoke,
  cube,
  strip,
  onion,
  crumble,
  ribbon,
  drape,
  folded,
  fillet,
  olive,
  fries,
  granella,
  specks,
  seeds,
  balls,
  kernels,
  drizzle,
  generic,
} satisfies Record<string, VisualDef>;

export type VisualKey = keyof typeof VISUALS;

export function isVisualKey(value: string): value is VisualKey {
  return Object.prototype.hasOwnProperty.call(VISUALS, value);
}

export function visualDef(key: string): VisualDef {
  return isVisualKey(key) ? VISUALS[key] : VISUALS.generic;
}

export const VISUAL_OPTIONS = (Object.keys(VISUALS) as VisualKey[]).map((key) => ({ key, label: VISUALS[key].label }));
