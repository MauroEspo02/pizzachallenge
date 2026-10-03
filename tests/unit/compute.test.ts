import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeResults, type VersionTotals } from '../../src/features/results/compute';
import type { PizzaVersion } from '../../src/features/pizzas/types';

const doughA = { id: 'dA', name: 'Panetto Terry', shortName: 'Terry', tone: 'pomodoro', sortOrder: 0 };
const doughB = { id: 'dB', name: 'Panetto Mamma di Guido', shortName: 'Mamma di Guido', tone: 'basilico', sortOrder: 1 };
const v = (id: string, recipeId: string, dough: typeof doughA, order: number): PizzaVersion => ({ id, recipeId, name: recipeId, description: null, isDemo: false, dough, tastingOrder: order, votingLocked: false, creators: [], ingredients: [], artUrl: '' });
const t = (id: string, votes: number, taste: number, rewant: number, idea: number, smell: number): VersionTotals => ({ pizza_version_id: id, votes, taste_sum: taste, rewant_sum: rewant, idea_sum: idea, smell_sum: smell });

const versions = [v('a', 'r1', doughA, 1), v('b', 'r1', doughB, 2), v('c', 'r2', doughA, 3), v('d', 'r2', doughB, 4)];

test('classifica: media dei 4 parametri', () => {
  const r = computeResults(versions, [t('a', 2, 10, 10, 10, 10), t('b', 2, 8, 8, 8, 8)], 2);
  assert.equal(r.ranking[0]!.version.id, 'a');
  assert.equal(r.ranking[0]!.scores.overall, 5);
  assert.equal(r.ranking[0]!.position, 1);
});

test('pareggio: decide il Gusto, senza casualità', () => {
  // stessa media (totale 32 su 2 voti) ma gusto diverso
  const r = computeResults(versions, [t('a', 2, 6, 10, 8, 8), t('b', 2, 10, 6, 8, 8)], 2);
  assert.equal(r.ranking[0]!.version.id, 'b');
  assert.equal(r.ranking[0]!.tieBreak, 'taste');
  assert.equal(r.ranking[1]!.position, 2);
});

test('pareggio totale: posizione condivisa, risultato identico ad ogni calcolo', () => {
  const totals = [t('c', 2, 8, 8, 8, 8), t('d', 2, 8, 8, 8, 8)];
  const r1 = computeResults(versions, totals, 2);
  const r2 = computeResults([...versions].reverse(), [...totals].reverse(), 2);
  assert.equal(r1.ranking[0]!.position, 1);
  assert.equal(r1.ranking[1]!.position, 1);
  assert.ok(r1.ranking[0]!.tied);
  assert.deepEqual(r1.ranking.map((x) => x.version.id), r2.ranking.map((x) => x.version.id));
});

test('miglior gusto = media delle versioni; confronto panetti', () => {
  const r = computeResults(versions, [t('a', 1, 5, 5, 5, 5), t('b', 1, 3, 3, 3, 3), t('c', 1, 4, 4, 4, 4), t('d', 1, 4, 4, 4, 4)], 1);
  const best = r.recipes.find((x) => x.position === 1)!;
  assert.equal(best.recipeId, 'r1');
  assert.equal(best.score, 4);
  const terry = r.doughs.find((d) => d.dough.id === 'dA')!;
  assert.equal(terry.overall, 4.5);
  assert.equal(terry.wins, 1);
});
