/** Collega gli ingredienti di una pizza alla loro grafica. */
import { normalizeText } from '../utils/text';
import { buildPizzaArt, genericColorFor, pizzaArtToSvg, type ArtIngredient, type PizzaArt } from './art';
import { hashString } from './art/rng';
import type { IngredientDef } from './types';

export interface ArtSourceItem {
  label: string;
  def: IngredientDef | null;
}

export function unknownKey(label: string): string {
  return `x-${hashString(normalizeText(label)).toString(36)}`;
}

export function toArtIngredients(items: readonly ArtSourceItem[]): ArtIngredient[] {
  return items.map(({ label, def }) =>
    def
      ? { key: def.id, visual: def.visual, layer: def.layer, density: def.density, colors: def.colors }
      : {
          key: unknownKey(label),
          visual: 'generic',
          layer: 'topping',
          density: 1,
          colors: [genericColorFor(normalizeText(label))],
        },
  );
}

export function renderPizzaArt(seed: number, items: readonly ArtSourceItem[], uid?: string): PizzaArt {
  return buildPizzaArt(seed, toArtIngredients(items), uid);
}

export function renderPizzaSvg(seed: number, items: readonly ArtSourceItem[], title?: string): string {
  return pizzaArtToSvg(renderPizzaArt(seed, items), title);
}
