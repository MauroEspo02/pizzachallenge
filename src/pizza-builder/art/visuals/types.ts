import type { Rng } from '../rng';

export interface VisualContext {
  rng: Rng;
  /** Colori dell'ingrediente (almeno uno, esadecimali validati). */
  colors: string[];
  /** Numero di pezzi da disegnare, già scalato per densità e affollamento. */
  count: number;
  /** Prefisso univoco per gli id interni (gradienti). */
  uid: string;
}

export interface VisualDef {
  /** Nome leggibile mostrato all'admin quando sceglie l'aspetto di un nuovo ingrediente. */
  label: string;
  /** Pezzi disegnati con densità 1 su una pizza poco affollata. */
  baseCount: number;
  defaultColors: string[];
  render(ctx: VisualContext): string;
}

export const SHADOW = '#4a2108';

export function colorAt(colors: string[], index: number, fallback: string): string {
  return colors[index] ?? colors[0] ?? fallback;
}
