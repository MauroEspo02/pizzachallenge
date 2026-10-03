/**
 * Tipi della libreria ingredienti.
 * Struttura richiesta: ingredientId, name, aliases, category, visualAsset (visual), layer, density.
 */
export const LAYERS = ['sauce', 'cheese', 'topping', 'finish'] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_LABELS: Record<Layer, string> = {
  sauce: 'Base (salse e creme)',
  cheese: 'Formaggi in cottura',
  topping: 'Condimenti in cottura',
  finish: 'In uscita dal forno',
};

export const LAYER_RANK: Record<Layer, number> = { sauce: 0, cheese: 1, topping: 2, finish: 3 };

export const CATEGORIES = {
  basi: 'Salse e creme',
  formaggi: 'Formaggi',
  verdure: 'Verdure',
  salumi: 'Salumi e carne',
  mare: 'Pesce',
  erbe: 'Erbe e foglie',
  croccanti: 'Frutta secca e semi',
  condimenti: 'Condimenti',
  frutta: 'Frutta',
  altro: 'Altro',
} as const;
export type CategoryKey = keyof typeof CATEGORIES;

export function isCategory(value: string): value is CategoryKey {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, value);
}

export interface IngredientDef {
  /** ingredientId: slug stabile, es. "porcini" */
  id: string;
  name: string;
  /** Altri modi di scriverlo: "funghi porcini", "fungo porcino"… */
  aliases: string[];
  category: CategoryKey;
  /** visualAsset: chiave del disegno (vedi art/visuals) */
  visual: string;
  layer: Layer;
  /** Moltiplicatore della quantità di pezzi disegnati (1 = normale) */
  density: number;
  /** Colori principali in esadecimale; il disegno ricava ombre e luci da soli */
  colors: string[];
}
