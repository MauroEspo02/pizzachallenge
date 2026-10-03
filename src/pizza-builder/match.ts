/**
 * Riconoscimento degli ingredienti scritti a mano.
 * "crema di zucca, funghi porcini, fior di latte, parmigiano e basilico"
 *   → crema-zucca, porcini, fior-di-latte, parmigiano, basilico
 * Regole: separatori (virgole, "e", "con", "+"…), alias più lungo vince,
 * più ingredienti nella stessa frase, tolleranza ai piccoli errori di battitura.
 */
import { capitalize, cleanText, normalizeText } from '../utils/text';
import type { IngredientDef } from './types';

export const MAX_INGREDIENTS = 20;
export const MAX_LABEL_LENGTH = 48;

export interface CatalogIndex {
  byId: Map<string, IngredientDef>;
  /** Alias normalizzati, dal più lungo al più corto. */
  aliases: Array<{ alias: string; id: string }>;
  singleWords: Array<{ alias: string; id: string }>;
}

export interface ParsedIngredient {
  label: string;
  ingredientId: string | null;
}

const SEPARATORS = /\s*(?:[,;\n+•·/|]|\s&\s|\s(?:e|ed|con)\s)\s*/i;

/** Indicazioni di cottura o quantità che non cambiano l'ingrediente. */
const MODIFIERS = [
  'a crudo',
  'in uscita',
  'in cottura',
  'fuori cottura',
  'a fine cottura',
  'dopo cottura',
  'post cottura',
  'a piacere',
  'q b',
  'qb',
  'abbondante',
  'un po di',
  'un pizzico di',
  'un filo di',
  'dop',
  'igp',
];

export function buildCatalogIndex(catalog: readonly IngredientDef[]): CatalogIndex {
  const byId = new Map<string, IngredientDef>();
  const seen = new Set<string>();
  const aliases: Array<{ alias: string; id: string }> = [];
  for (const def of catalog) {
    byId.set(def.id, def);
    for (const raw of [def.name, ...def.aliases]) {
      const alias = normalizeText(raw);
      if (!alias || seen.has(alias)) continue;
      seen.add(alias);
      aliases.push({ alias, id: def.id });
    }
  }
  aliases.sort((a, b) => b.alias.length - a.alias.length || a.alias.localeCompare(b.alias));
  return { byId, aliases, singleWords: aliases.filter((a) => !a.alias.includes(' ')) };
}

function stripModifiers(norm: string): string {
  let out = ` ${norm} `;
  for (const m of MODIFIERS) out = out.split(` ${m} `).join(' ');
  const cleaned = out.replace(/\s+/g, ' ').trim();
  return cleaned || norm;
}

function findAliasMatches(norm: string, index: CatalogIndex): Array<{ id: string; start: number }> {
  let work = ` ${norm} `;
  const found: Array<{ id: string; start: number }> = [];
  for (const { alias, id } of index.aliases) {
    const needle = ` ${alias} `;
    let pos = work.indexOf(needle);
    while (pos !== -1) {
      found.push({ id, start: pos });
      work = `${work.slice(0, pos)} ${'#'.repeat(needle.length - 2)} ${work.slice(pos + needle.length)}`;
      pos = work.indexOf(needle);
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** Distanza di Damerau-Levenshtein (versione OSA). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[m]![n]!;
}

function tolerance(length: number): number {
  if (length >= 9) return 2;
  if (length >= 5) return 1;
  return 0;
}

function fuzzyMatch(norm: string, index: CatalogIndex): string | null {
  let best: { id: string; dist: number } | null = null;
  const consider = (candidate: string, target: string, id: string) => {
    const max = tolerance(target.length);
    if (max === 0) return;
    const dist = editDistance(candidate, target);
    if (dist <= max && (!best || dist < best.dist)) best = { id, dist };
  };
  for (const { alias, id } of index.aliases) consider(norm, alias, id);
  if (!best) {
    for (const word of norm.split(' ')) {
      if (word.length < 5) continue;
      for (const { alias, id } of index.singleWords) consider(word, alias, id);
    }
  }
  return (best as { id: string } | null)?.id ?? null;
}

/** Riconosce un'etichetta singola: restituisce l'id dell'ingrediente o null. */
export function matchLabel(label: string, index: CatalogIndex): string | null {
  const norm = stripModifiers(normalizeText(label));
  if (!norm) return null;
  const matches = findAliasMatches(norm, index);
  if (matches.length) return matches[0]!.id;
  return fuzzyMatch(norm, index);
}

export function cleanLabel(raw: string): string {
  return capitalize(cleanText(raw).replace(/^[-–—.\s]+|[.\s]+$/g, '')).slice(0, MAX_LABEL_LENGTH);
}

/** Divide il testo libero in ingredienti riconosciuti (o no). */
export function parseIngredientText(text: string, index: CatalogIndex): ParsedIngredient[] {
  const out: ParsedIngredient[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const push = (item: ParsedIngredient) => {
    if (out.length >= MAX_INGREDIENTS) return;
    if (item.ingredientId) {
      if (seenIds.has(item.ingredientId)) return;
      seenIds.add(item.ingredientId);
    } else {
      const key = normalizeText(item.label);
      if (!key || seenLabels.has(key)) return;
      seenLabels.add(key);
    }
    out.push(item);
  };

  for (const token of text.split(SEPARATORS)) {
    const label = cleanLabel(token);
    if (!label) continue;
    const norm = stripModifiers(normalizeText(label));
    if (!norm) continue;
    const matches = findAliasMatches(norm, index);
    if (matches.length > 1) {
      for (const m of matches) push({ label: index.byId.get(m.id)?.name ?? label, ingredientId: m.id });
    } else if (matches.length === 1) {
      push({ label, ingredientId: matches[0]!.id });
    } else {
      push({ label, ingredientId: fuzzyMatch(norm, index) });
    }
  }
  return out;
}

/** Suggerimenti per l'autocompletamento mentre si scrive. */
export function suggestIngredients(query: string, index: CatalogIndex, exclude: ReadonlySet<string>, limit = 6): IngredientDef[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const scored: Array<{ def: IngredientDef; score: number }> = [];
  const seen = new Set<string>();
  for (const { alias, id } of index.aliases) {
    if (seen.has(id) || exclude.has(id)) continue;
    let score = -1;
    if (alias.startsWith(q)) score = 3;
    else if (alias.includes(` ${q}`)) score = 2;
    else if (alias.includes(q)) score = 1;
    if (score < 0) continue;
    seen.add(id);
    const def = index.byId.get(id);
    if (def) scored.push({ def, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.def.name.localeCompare(b.def.name, 'it'))
    .slice(0, limit)
    .map((s) => s.def);
}
