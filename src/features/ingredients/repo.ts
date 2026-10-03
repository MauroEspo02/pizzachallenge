/** Libreria ingredienti nel database: lettura, modifica, ricollegamento automatico. */
import { buildCatalogIndex, matchLabel } from '../../pizza-builder/match';
import { CATALOG_VERSION, DEFAULT_INGREDIENTS } from '../../pizza-builder/catalog';
import { isCategory, type IngredientDef, type Layer, LAYERS } from '../../pizza-builder/types';
import { queryAll, queryFirst, sql, type Db, type DbStatement } from '../../database/types';
import { HttpError } from '../../server/http';
import { nowIso } from '../../utils/time';

export interface CatalogIngredient extends IngredientDef {
  isBuiltin: boolean;
  updatedAt: string;
}

interface IngredientRow {
  id: string;
  name: string;
  aliases: string;
  category: string;
  visual: string;
  layer: string;
  density: number;
  colors: string;
  is_builtin: number;
  updated_at: string;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function toIngredient(row: IngredientRow): CatalogIngredient {
  return {
    id: row.id,
    name: row.name,
    aliases: parseJsonArray(row.aliases),
    category: isCategory(row.category) ? row.category : 'altro',
    visual: row.visual,
    layer: (LAYERS as readonly string[]).includes(row.layer) ? (row.layer as Layer) : 'topping',
    density: Number(row.density) || 1,
    colors: parseJsonArray(row.colors),
    isBuiltin: row.is_builtin === 1,
    updatedAt: row.updated_at,
  };
}

export async function listCatalog(db: Db): Promise<CatalogIngredient[]> {
  const rows = await queryAll<IngredientRow>(db, 'SELECT * FROM ingredients ORDER BY category, name COLLATE NOCASE');
  return rows.map(toIngredient);
}

export async function getIngredient(db: Db, id: string): Promise<CatalogIngredient | null> {
  const row = await queryFirst<IngredientRow>(db, 'SELECT * FROM ingredients WHERE id = ?', id);
  return row ? toIngredient(row) : null;
}

export function bumpCatalogRevision(db: Db): DbStatement {
  return sql(
    db,
    `INSERT INTO app_meta (key, value) VALUES ('catalog_rev', '1')
     ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`,
  );
}

function literal(value: string | number): string {
  return typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;
}

/** Copia nel database gli ingredienti di serie nuovi (non tocca quelli già presenti o modificati). */
export async function syncBuiltinCatalog(db: Db): Promise<void> {
  const row = await queryFirst<{ value: string }>(db, `SELECT value FROM app_meta WHERE key = 'catalog_version'`);
  if (row && Number(row.value) >= CATALOG_VERSION) return;
  const now = nowIso();
  // Un'unica istruzione con valori letterali: niente limiti sul numero di parametri.
  const values = DEFAULT_INGREDIENTS.map(
    (d) =>
      `(${[d.id, d.name, JSON.stringify(d.aliases), d.category, d.visual, d.layer, d.density, JSON.stringify(d.colors)].map(literal).join(', ')}, 1, ${literal(now)}, ${literal(now)})`,
  ).join(',\n');
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO ingredients (id, name, aliases, category, visual, layer, density, colors, is_builtin, created_at, updated_at) VALUES ${values}`,
    ),
    sql(db, `INSERT INTO app_meta (key, value) VALUES ('catalog_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, String(CATALOG_VERSION)),
    bumpCatalogRevision(db),
  ]);
  await relinkIngredients(db);
}

/**
 * Ricollega le etichette scritte dai partecipanti agli ingredienti della libreria.
 * Si usa dopo ogni modifica alla libreria: "lampascioni" diventa disegnabile appena l'admin lo aggiunge.
 */
export async function relinkIngredients(db: Db): Promise<number> {
  const index = buildCatalogIndex(await listCatalog(db));
  const rows = await queryAll<{ recipe_id: string; position: number; label: string; ingredient_id: string | null }>(
    db,
    'SELECT recipe_id, position, label, ingredient_id FROM pizza_ingredients',
  );
  const statements: DbStatement[] = [];
  const touched = new Set<string>();
  for (const row of rows) {
    const match = matchLabel(row.label, index);
    if (match !== row.ingredient_id) {
      statements.push(sql(db, 'UPDATE pizza_ingredients SET ingredient_id = ? WHERE recipe_id = ? AND position = ?', match, row.recipe_id, row.position));
      touched.add(row.recipe_id);
    }
  }
  if (statements.length) await db.batch(statements);
  return touched.size;
}

export interface UnmatchedLabel {
  label: string;
  pizzas: number;
}

export async function listUnmatchedLabels(db: Db, eventId: string): Promise<UnmatchedLabel[]> {
  const rows = await queryAll<{ label: string; pizzas: number }>(
    db,
    `SELECT pi.label AS label, COUNT(DISTINCT pi.recipe_id) AS pizzas
     FROM pizza_ingredients pi JOIN pizza_recipes r ON r.id = pi.recipe_id
     WHERE pi.ingredient_id IS NULL AND r.event_id = ?
     GROUP BY lower(pi.label) ORDER BY pizzas DESC, label COLLATE NOCASE`,
    eventId,
  );
  return rows;
}

export async function catalogRevision(db: Db): Promise<string> {
  const row = await queryFirst<{ value: string }>(db, `SELECT value FROM app_meta WHERE key = 'catalog_rev'`);
  return row?.value ?? '0';
}

// ——— Modifiche dall'admin ———

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'ingrediente';
}

export interface IngredientInput {
  id?: string | null;
  name: string;
  aliases: string[];
  category: string;
  visual: string;
  layer: Layer;
  density: number;
  colors: string[];
}

/** Crea o aggiorna un ingrediente e ricollega subito le pizze che lo nominano. */
export async function saveIngredient(db: Db, input: IngredientInput, audit: DbStatement): Promise<{ id: string; relinked: number }> {
  const now = nowIso();
  const aliases = [...new Set(input.aliases.map((a) => a.trim()).filter(Boolean))];
  let id = input.id ?? null;
  if (id) {
    const existing = await queryFirst<{ id: string }>(db, 'SELECT id FROM ingredients WHERE id = ?', id);
    if (!existing) throw new HttpError(404, 'Ingrediente non trovato.');
    await db.batch([
      sql(
        db,
        'UPDATE ingredients SET name = ?, aliases = ?, category = ?, visual = ?, layer = ?, density = ?, colors = ?, updated_at = ? WHERE id = ?',
        input.name,
        JSON.stringify(aliases),
        input.category,
        input.visual,
        input.layer,
        input.density,
        JSON.stringify(input.colors),
        now,
        id,
      ),
      bumpCatalogRevision(db),
      audit,
    ]);
  } else {
    const base = slugify(input.name);
    id = base;
    for (let n = 2; await queryFirst(db, 'SELECT 1 AS ok FROM ingredients WHERE id = ?', id); n++) id = `${base}-${n}`;
    await db.batch([
      sql(
        db,
        'INSERT INTO ingredients (id, name, aliases, category, visual, layer, density, colors, is_builtin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
        id,
        input.name,
        JSON.stringify(aliases),
        input.category,
        input.visual,
        input.layer,
        input.density,
        JSON.stringify(input.colors),
        now,
        now,
      ),
      bumpCatalogRevision(db),
      audit,
    ]);
  }
  const relinked = await relinkIngredients(db);
  return { id, relinked };
}

export async function deleteIngredient(db: Db, id: string, audit: DbStatement): Promise<void> {
  const existing = await queryFirst<{ id: string }>(db, 'SELECT id FROM ingredients WHERE id = ?', id);
  if (!existing) throw new HttpError(404, 'Ingrediente non trovato.');
  await db.batch([sql(db, 'DELETE FROM ingredients WHERE id = ?', id), bumpCatalogRevision(db), audit]);
  await relinkIngredients(db);
}

export async function ingredientUsage(db: Db, eventId: string): Promise<Map<string, number>> {
  const rows = await queryAll<{ ingredient_id: string; n: number }>(
    db,
    `SELECT pi.ingredient_id, COUNT(DISTINCT pi.recipe_id) AS n FROM pizza_ingredients pi JOIN pizza_recipes r ON r.id = pi.recipe_id
     WHERE r.event_id = ? AND pi.ingredient_id IS NOT NULL GROUP BY pi.ingredient_id`,
    eventId,
  );
  return new Map(rows.map((r) => [r.ingredient_id, r.n]));
}
