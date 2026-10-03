/** Lettura di gusti, versioni e panetti. */
import { hashString } from '../../pizza-builder/art/rng';
import { queryAll, sql, type Db } from '../../database/types';
import type { Dough, Person, PizzaIngredient, PizzaVersion, Recipe } from './types';

interface VersionRow {
  id: string;
  recipe_id: string;
  dough_id: string | null;
  tasting_order: number;
  voting_locked: number;
  name: string;
  description: string | null;
  is_demo: number;
  art_seed: number;
  updated_at: string;
  created_by: string | null;
  dough_name: string | null;
  dough_short: string | null;
  dough_tone: string | null;
  dough_order: number | null;
}

interface CreatorRow {
  recipe_id: string;
  id: string;
  display_name: string;
}

interface IngredientRow {
  recipe_id: string;
  label: string;
  ingredient_id: string | null;
}

export function artUrl(recipeId: string, updatedAt: string, catalogRev: string): string {
  return `/art/${recipeId}.svg?v=${hashString(`${updatedAt}|${catalogRev}`).toString(36)}`;
}

function doughFrom(row: VersionRow): Dough | null {
  if (!row.dough_id || !row.dough_name) return null;
  return { id: row.dough_id, name: row.dough_name, shortName: row.dough_short ?? row.dough_name, tone: row.dough_tone ?? 'pomodoro', sortOrder: row.dough_order ?? 0 };
}

export async function listDoughs(db: Db, eventId: string): Promise<Dough[]> {
  const rows = await queryAll<{ id: string; name: string; short_name: string; tone: string; sort_order: number }>(
    db,
    'SELECT id, name, short_name, tone, sort_order FROM doughs WHERE event_id = ? ORDER BY sort_order, name',
    eventId,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, shortName: r.short_name, tone: r.tone, sortOrder: r.sort_order }));
}

async function loadEventPizzaRows(db: Db, eventId: string, recipeId?: string) {
  const recipeFilter = recipeId ? 'AND r.id = ?' : '';
  const params = recipeId ? [eventId, recipeId] : [eventId];
  const [versions, creators, ingredients, recipes] = (await db.batch([
    sql(
      db,
      `SELECT v.id, v.recipe_id, v.dough_id, v.tasting_order, v.voting_locked,
              r.name, r.description, r.is_demo, r.art_seed, r.updated_at, r.created_by,
              d.name AS dough_name, d.short_name AS dough_short, d.tone AS dough_tone, d.sort_order AS dough_order
       FROM pizza_versions v
       JOIN pizza_recipes r ON r.id = v.recipe_id
       LEFT JOIN doughs d ON d.id = v.dough_id
       WHERE v.event_id = ? ${recipeFilter}
       ORDER BY v.tasting_order, v.created_at`,
      ...params,
    ),
    sql(
      db,
      `SELECT rc.recipe_id, u.id, u.display_name FROM recipe_creators rc
       JOIN users u ON u.id = rc.user_id JOIN pizza_recipes r ON r.id = rc.recipe_id
       WHERE r.event_id = ? ${recipeFilter} ORDER BY u.sort_order, u.display_name`,
      ...params,
    ),
    sql(
      db,
      `SELECT pi.recipe_id, pi.label, pi.ingredient_id FROM pizza_ingredients pi
       JOIN pizza_recipes r ON r.id = pi.recipe_id
       WHERE r.event_id = ? ${recipeFilter} ORDER BY pi.recipe_id, pi.position`,
      ...params,
    ),
    sql(
      db,
      `SELECT r.id AS recipe_id, r.name, r.description, r.is_demo, r.art_seed, r.updated_at, r.created_by
       FROM pizza_recipes r WHERE r.event_id = ? ${recipeFilter} ORDER BY r.created_at`,
      ...params,
    ),
  ])) as Array<{ results: unknown[] }>;
  return {
    versions: versions!.results as VersionRow[],
    creators: creators!.results as CreatorRow[],
    ingredients: ingredients!.results as IngredientRow[],
    recipes: recipes!.results as Array<Omit<VersionRow, 'id' | 'dough_id' | 'tasting_order' | 'voting_locked' | 'dough_name' | 'dough_short' | 'dough_tone' | 'dough_order'>>,
  };
}

function group<T extends { recipe_id: string }, U>(rows: T[], map: (row: T) => U): Map<string, U[]> {
  const out = new Map<string, U[]>();
  for (const row of rows) {
    const list = out.get(row.recipe_id) ?? [];
    list.push(map(row));
    out.set(row.recipe_id, list);
  }
  return out;
}

export async function listVersions(db: Db, eventId: string, catalogRev: string): Promise<PizzaVersion[]> {
  const rows = await loadEventPizzaRows(db, eventId);
  const creators = group<CreatorRow, Person>(rows.creators, (r) => ({ id: r.id, name: r.display_name }));
  const ingredients = group<IngredientRow, PizzaIngredient>(rows.ingredients, (r) => ({ label: r.label, ingredientId: r.ingredient_id }));
  return rows.versions.map((v) => ({
    id: v.id,
    recipeId: v.recipe_id,
    name: v.name,
    description: v.description,
    isDemo: v.is_demo === 1,
    dough: doughFrom(v),
    tastingOrder: v.tasting_order,
    votingLocked: v.voting_locked === 1,
    creators: creators.get(v.recipe_id) ?? [],
    ingredients: ingredients.get(v.recipe_id) ?? [],
    artUrl: artUrl(v.recipe_id, v.updated_at, catalogRev),
  }));
}

export async function listRecipes(db: Db, eventId: string, catalogRev: string, recipeId?: string): Promise<Recipe[]> {
  const rows = await loadEventPizzaRows(db, eventId, recipeId);
  const creators = group<CreatorRow, Person>(rows.creators, (r) => ({ id: r.id, name: r.display_name }));
  const ingredients = group<IngredientRow, PizzaIngredient>(rows.ingredients, (r) => ({ label: r.label, ingredientId: r.ingredient_id }));
  const versions = group(rows.versions, (v) => ({ id: v.id, dough: doughFrom(v), tastingOrder: v.tasting_order, votingLocked: v.voting_locked === 1 }));
  return rows.recipes
    .map((r) => ({
      id: r.recipe_id,
      name: r.name,
      description: r.description,
      isDemo: r.is_demo === 1,
      artSeed: r.art_seed,
      artUrl: artUrl(r.recipe_id, r.updated_at, catalogRev),
      createdBy: r.created_by,
      creators: creators.get(r.recipe_id) ?? [],
      ingredients: ingredients.get(r.recipe_id) ?? [],
      updatedAt: r.updated_at,
      versions: (versions.get(r.recipe_id) ?? []).sort((a, b) => a.tastingOrder - b.tastingOrder),
    }))
    .sort((a, b) => (a.versions[0]?.tastingOrder ?? 999) - (b.versions[0]?.tastingOrder ?? 999));
}

export async function getRecipe(db: Db, eventId: string, recipeId: string, catalogRev: string): Promise<Recipe | null> {
  const [recipe] = await listRecipes(db, eventId, catalogRev, recipeId);
  return recipe ?? null;
}

/** Ingredienti di una ricetta con la loro definizione grafica (per l'illustrazione). */
export async function recipeArtSource(db: Db, recipeId: string) {
  const recipe = await db.prepare('SELECT id, name, art_seed, updated_at FROM pizza_recipes WHERE id = ?').bind(recipeId).first<{ id: string; name: string; art_seed: number; updated_at: string }>();
  if (!recipe) return null;
  const rows = await queryAll<{
    label: string;
    id: string | null;
    name: string | null;
    aliases: string | null;
    category: string | null;
    visual: string | null;
    layer: string | null;
    density: number | null;
    colors: string | null;
  }>(
    db,
    `SELECT pi.label, i.id, i.name, i.aliases, i.category, i.visual, i.layer, i.density, i.colors
     FROM pizza_ingredients pi LEFT JOIN ingredients i ON i.id = pi.ingredient_id
     WHERE pi.recipe_id = ? ORDER BY pi.position`,
    recipeId,
  );
  return { recipe, rows };
}
