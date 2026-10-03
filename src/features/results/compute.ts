/**
 * Calcolo dei risultati (funzione pura, senza database: facile da testare).
 *
 * Punteggio di una pizza = media dei quattro parametri su tutti i suoi voti.
 * Parità: confronto esatto (frazioni, niente arrotondamenti). A pari media decide la media del Gusto,
 * poi quella della Voglia di rimangiarla; se resta pari, le pizze condividono la posizione. Mai il caso.
 */
import { CRITERIA, type CriterionKey } from '../voting/criteria';
import type { Dough, Person, PizzaVersion } from '../pizzas/types';

export interface VersionTotals {
  pizza_version_id: string;
  votes: number;
  taste_sum: number;
  rewant_sum: number;
  idea_sum: number;
  smell_sum: number;
}

export interface ScoreLine {
  votes: number;
  overall: number | null;
  taste: number | null;
  rewant: number | null;
  idea: number | null;
  smell: number | null;
}

export type TieBreak = 'taste' | 'rewant' | null;

export interface RankedPizza {
  version: PizzaVersion;
  scores: ScoreLine;
  position: number | null;
  tied: boolean;
  /** Se la media complessiva è pari a quella della pizza vicina, quale criterio ha deciso. */
  tieBreak: TieBreak;
}

export interface RecipeResult {
  recipeId: string;
  name: string;
  creators: Person[];
  artUrl: string;
  score: number | null;
  versions: Array<{ versionId: string; dough: Dough | null; overall: number | null; votes: number }>;
  position: number | null;
  tied: boolean;
}

export interface DoughResult {
  dough: Dough;
  pizzas: number;
  overall: number | null;
  criteria: Record<CriterionKey, number | null>;
  wins: number;
}

export interface HeadToHead {
  recipeId: string;
  name: string;
  entries: Array<{ dough: Dough; overall: number | null }>;
  winnerDoughId: string | null;
}

export interface CriterionAward {
  key: CriterionKey;
  title: string;
  label: string;
  value: number | null;
  winners: RankedPizza[];
}

export interface CreatorResult {
  person: Person;
  recipes: number;
  score: number | null;
  position: number | null;
  tied: boolean;
}

export interface Results {
  ranking: RankedPizza[];
  recipes: RecipeResult[];
  doughs: DoughResult[];
  headToHead: HeadToHead[];
  awards: CriterionAward[];
  creators: CreatorResult[];
  totals: { votes: number; pizzasWithVotes: number; voters: number };
}

const AWARD_LABELS: Record<CriterionKey, string> = {
  taste: 'La più buona',
  rewant: 'La fetta in più',
  idea: 'L’idea migliore',
  smell: 'Il profumo migliore',
};

interface Raw {
  votes: number;
  total: number;
  sums: Record<CriterionKey, number>;
}

function rawOf(t: VersionTotals | undefined): Raw {
  if (!t) return { votes: 0, total: 0, sums: { taste: 0, rewant: 0, idea: 0, smell: 0 } };
  const sums = { taste: Number(t.taste_sum), rewant: Number(t.rewant_sum), idea: Number(t.idea_sum), smell: Number(t.smell_sum) };
  return { votes: Number(t.votes), total: sums.taste + sums.rewant + sums.idea + sums.smell, sums };
}

/** >0 se b è maggiore di a (per ordinare in modo decrescente), confronto esatto tra frazioni. */
function compareRatio(aNum: number, aDen: number, bNum: number, bDen: number): number {
  return bNum * aDen - aNum * bDen;
}

function scoreLine(raw: Raw): ScoreLine {
  if (raw.votes === 0) return { votes: 0, overall: null, taste: null, rewant: null, idea: null, smell: null };
  return {
    votes: raw.votes,
    overall: raw.total / (raw.votes * 4),
    taste: raw.sums.taste / raw.votes,
    rewant: raw.sums.rewant / raw.votes,
    idea: raw.sums.idea / raw.votes,
    smell: raw.sums.smell / raw.votes,
  };
}

const EPS = 1e-9;
const mean = (values: number[]): number | null => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/** Posizioni condivise a pari valore (valori in virgola mobile, tolleranza minima). */
function assignPositions<T>(items: T[], value: (item: T) => number | null): Array<{ item: T; position: number | null; tied: boolean }> {
  const sorted = [...items].sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1));
  const out: Array<{ item: T; position: number | null; tied: boolean }> = [];
  sorted.forEach((item, i) => {
    const v = value(item);
    if (v === null) {
      out.push({ item, position: null, tied: false });
      return;
    }
    const prev = out[i - 1];
    const prevValue = prev ? value(prev.item) : null;
    if (prev && prevValue !== null && Math.abs(prevValue - v) < EPS) {
      prev.tied = true;
      out.push({ item, position: prev.position, tied: true });
    } else out.push({ item, position: i + 1, tied: false });
  });
  return out;
}

export function computeResults(versions: PizzaVersion[], totals: VersionTotals[], voters: number): Results {
  const byId = new Map(totals.map((t) => [t.pizza_version_id, t]));
  const raws = new Map(versions.map((v) => [v.id, rawOf(byId.get(v.id))]));

  // ——— Classifica delle pizze ———
  const sorted = [...versions].sort((a, b) => {
    const ra = raws.get(a.id)!;
    const rb = raws.get(b.id)!;
    if (ra.votes === 0 || rb.votes === 0) return (rb.votes > 0 ? 1 : 0) - (ra.votes > 0 ? 1 : 0) || a.tastingOrder - b.tastingOrder;
    return (
      compareRatio(ra.total, ra.votes, rb.total, rb.votes) ||
      compareRatio(ra.sums.taste, ra.votes, rb.sums.taste, rb.votes) ||
      compareRatio(ra.sums.rewant, ra.votes, rb.sums.rewant, rb.votes) ||
      a.tastingOrder - b.tastingOrder
    );
  });

  const ranking: RankedPizza[] = [];
  sorted.forEach((version, i) => {
    const raw = raws.get(version.id)!;
    const scores = scoreLine(raw);
    if (raw.votes === 0) {
      ranking.push({ version, scores, position: null, tied: false, tieBreak: null });
      return;
    }
    const prev = ranking[i - 1];
    const prevRaw = prev ? raws.get(prev.version.id)! : null;
    if (prev && prevRaw && prevRaw.votes > 0 && compareRatio(prevRaw.total, prevRaw.votes, raw.total, raw.votes) === 0) {
      const tasteDiff = compareRatio(prevRaw.sums.taste, prevRaw.votes, raw.sums.taste, raw.votes);
      const rewantDiff = compareRatio(prevRaw.sums.rewant, prevRaw.votes, raw.sums.rewant, raw.votes);
      if (tasteDiff === 0 && rewantDiff === 0) {
        prev.tied = true;
        ranking.push({ version, scores, position: prev.position, tied: true, tieBreak: null });
      } else {
        const by: TieBreak = tasteDiff !== 0 ? 'taste' : 'rewant';
        prev.tieBreak = prev.tieBreak ?? by;
        ranking.push({ version, scores, position: i + 1, tied: false, tieBreak: by });
      }
      return;
    }
    ranking.push({ version, scores, position: i + 1, tied: false, tieBreak: null });
  });
  const lineOf = new Map(ranking.map((r) => [r.version.id, r.scores]));

  // ——— Miglior gusto: media delle versioni dello stesso gusto ———
  const recipeMap = new Map<string, RecipeResult>();
  for (const v of versions) {
    const line = lineOf.get(v.id)!;
    let recipe = recipeMap.get(v.recipeId);
    if (!recipe) {
      recipe = { recipeId: v.recipeId, name: v.name, creators: v.creators, artUrl: v.artUrl, score: null, versions: [], position: null, tied: false };
      recipeMap.set(v.recipeId, recipe);
    }
    recipe.versions.push({ versionId: v.id, dough: v.dough, overall: line.overall, votes: line.votes });
  }
  for (const recipe of recipeMap.values()) {
    recipe.versions.sort((a, b) => (a.dough?.sortOrder ?? 99) - (b.dough?.sortOrder ?? 99));
    recipe.score = mean(recipe.versions.map((v) => v.overall).filter((x): x is number => x !== null));
  }
  const recipes = assignPositions([...recipeMap.values()], (r) => r.score).map(({ item, position, tied }) => ({ ...item, position, tied }));

  // ——— Testa a testa e confronto panetti ———
  const doughs = new Map<string, Dough>();
  for (const v of versions) if (v.dough) doughs.set(v.dough.id, v.dough);
  const wins = new Map<string, number>();
  const headToHead: HeadToHead[] = [];
  for (const recipe of recipeMap.values()) {
    const entries = recipe.versions.filter((v) => v.dough && v.votes > 0) as Array<{ versionId: string; dough: Dough; overall: number | null; votes: number }>;
    if (new Set(entries.map((e) => e.dough.id)).size < 2) continue;
    const ordered = [...entries].sort((a, b) => {
      const ra = raws.get(a.versionId)!;
      const rb = raws.get(b.versionId)!;
      return compareRatio(ra.total, ra.votes, rb.total, rb.votes);
    });
    const top = raws.get(ordered[0]!.versionId)!;
    const second = raws.get(ordered[1]!.versionId)!;
    const winner = compareRatio(top.total, top.votes, second.total, second.votes) === 0 ? null : ordered[0]!.dough.id;
    if (winner) wins.set(winner, (wins.get(winner) ?? 0) + 1);
    headToHead.push({ recipeId: recipe.recipeId, name: recipe.name, entries: entries.map((e) => ({ dough: e.dough, overall: e.overall })), winnerDoughId: winner });
  }
  const doughResults: DoughResult[] = [...doughs.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((dough) => {
      const lines = versions.filter((v) => v.dough?.id === dough.id).map((v) => lineOf.get(v.id)!).filter((l) => l.votes > 0);
      const criteria = Object.fromEntries(
        CRITERIA.map((c) => [c.key, mean(lines.map((l) => l[c.key]).filter((x): x is number => x !== null))]),
      ) as Record<CriterionKey, number | null>;
      return { dough, pizzas: lines.length, overall: mean(lines.map((l) => l.overall!)), criteria, wins: wins.get(dough.id) ?? 0 };
    });

  // ——— Premi per parametro ———
  const voted = ranking.filter((r) => r.scores.votes > 0);
  const awards: CriterionAward[] = CRITERIA.map((c) => {
    let best: RankedPizza[] = [];
    for (const r of voted) {
      if (!best.length) {
        best = [r];
        continue;
      }
      const a = raws.get(best[0]!.version.id)!;
      const b = raws.get(r.version.id)!;
      const diff = compareRatio(a.sums[c.key], a.votes, b.sums[c.key], b.votes);
      if (diff > 0) best = [r];
      else if (diff === 0) best.push(r);
    }
    // A pari punteggio nel parametro decide la classifica generale (best è già in ordine di classifica);
    // se anche lì sono appaiate, il premio è condiviso.
    if (best.length > 1) {
      const top = best[0]!.position;
      best = best.filter((r) => r.position === top);
    }
    return { key: c.key, title: c.short, label: AWARD_LABELS[c.key], value: best[0]?.scores[c.key] ?? null, winners: best };
  });

  // ——— Pizzaioli: media dei propri gusti ———
  const creatorMap = new Map<string, { person: Person; scores: number[] }>();
  for (const recipe of recipeMap.values()) {
    for (const person of recipe.creators) {
      const entry = creatorMap.get(person.id) ?? { person, scores: [] };
      if (recipe.score !== null) entry.scores.push(recipe.score);
      creatorMap.set(person.id, entry);
    }
  }
  const creators = assignPositions(
    [...creatorMap.values()].map((e) => ({ person: e.person, recipes: e.scores.length, score: mean(e.scores) })),
    (e) => e.score,
  ).map(({ item, position, tied }) => ({ ...item, position, tied }));

  return {
    ranking,
    recipes,
    doughs: doughResults,
    headToHead,
    awards,
    creators,
    totals: { votes: voted.reduce((s, r) => s + r.scores.votes, 0), pizzasWithVotes: voted.length, voters },
  };
}
