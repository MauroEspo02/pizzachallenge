/** Creazione e modifica delle pizze, ordine di degustazione, panetti, blocco del voto. */
import { buildCatalogIndex, matchLabel, MAX_INGREDIENTS, cleanLabel } from '../../pizza-builder/match';
import { dbErrorCode, queryAll, queryFirst, sql, type Db, type DbStatement } from '../../database/types';
import { HttpError } from '../../server/http';
import { newId, randomSeed } from '../../utils/ids';
import { cleanText } from '../../utils/text';
import { nowIso } from '../../utils/time';
import { auditStatement, type Actor } from '../audit/repo';
import { bumpRevision, type EventRecord } from '../event/repo';
import { capabilities } from '../event/state-machine';
import { listCatalog } from '../ingredients/repo';
import { listDoughs } from './repo';

export interface SavePizzaInput {
  recipeId?: string | null;
  name: string;
  description?: string | null;
  creatorIds: string[];
  ingredients: string[];
  doughIds: string[];
  /** Solo admin: conferma la cancellazione di versioni che hanno già voti. */
  confirmVoteLoss?: boolean;
  /** Seme dell'illustrazione: lo stesso dell'anteprima, così la pizza salvata è identica. */
  artSeed?: number;
}

export interface SaveContext {
  db: Db;
  event: EventRecord;
  actor: Actor;
  isAdmin: boolean;
}

async function versionVoteCounts(db: Db, recipeId: string): Promise<Map<string, number>> {
  const rows = await queryAll<{ id: string; n: number }>(
    db,
    'SELECT v.id, COUNT(vo.id) AS n FROM pizza_versions v LEFT JOIN votes vo ON vo.pizza_version_id = v.id WHERE v.recipe_id = ? GROUP BY v.id',
    recipeId,
  );
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** Rinumera le versioni 1..N mantenendo l'ordine attuale (dopo cancellazioni o spostamenti). */
async function renumberStatements(db: Db, eventId: string, order?: string[]): Promise<DbStatement[]> {
  const rows = await queryAll<{ id: string; tasting_order: number }>(db, 'SELECT id, tasting_order FROM pizza_versions WHERE event_id = ? ORDER BY tasting_order, created_at', eventId);
  const ids = order ?? rows.map((r) => r.id);
  const current = new Map(rows.map((r) => [r.id, r.tasting_order]));
  const now = nowIso();
  return ids
    .map((id, i) => ({ id, pos: i + 1 }))
    .filter(({ id, pos }) => current.get(id) !== pos)
    .map(({ id, pos }) => sql(db, 'UPDATE pizza_versions SET tasting_order = ?, updated_at = ? WHERE id = ?', pos, now, id));
}

export async function savePizza(ctx: SaveContext, input: SavePizzaInput): Promise<{ recipeId: string; created: boolean }> {
  const { db, event, actor, isAdmin } = ctx;
  if (!isAdmin && !capabilities(event.status).canCreatePizza) {
    throw new HttpError(409, 'In questo momento la creazione delle pizze è chiusa.', 'CREATION_CLOSED');
  }

  const name = cleanText(input.name);
  const description = input.description ? cleanText(input.description) || null : null;
  const creatorIds = [...new Set(input.creatorIds)];
  if (!isAdmin && !creatorIds.includes(actor.id)) creatorIds.unshift(actor.id);
  if (creatorIds.length === 0) throw new HttpError(400, 'Scegli almeno un creatore.');

  const labels = [...new Set(input.ingredients.map(cleanLabel).filter(Boolean))].slice(0, MAX_INGREDIENTS);
  if (labels.length === 0) throw new HttpError(400, 'Aggiungi almeno un ingrediente.');

  const validCreators = await queryAll<{ id: string }>(db, `SELECT id FROM users WHERE role = 'PARTICIPANT' AND is_active = 1`);
  const validCreatorIds = new Set(validCreators.map((r) => r.id));
  if (creatorIds.some((id) => !validCreatorIds.has(id))) throw new HttpError(400, 'Uno dei creatori non esiste più.');

  const doughs = await listDoughs(db, event.id);
  const doughIds = [...new Set(input.doughIds)].filter((id) => doughs.some((d) => d.id === id));
  doughIds.sort((a, b) => doughs.findIndex((d) => d.id === a) - doughs.findIndex((d) => d.id === b));

  const catalog = buildCatalogIndex(await listCatalog(db));
  const now = nowIso();
  const statements: DbStatement[] = [];
  let recipeId = input.recipeId ?? null;
  const created = !recipeId;

  if (recipeId) {
    const existing = await queryFirst<{ id: string; name: string }>(db, 'SELECT id, name FROM pizza_recipes WHERE id = ? AND event_id = ?', recipeId, event.id);
    if (!existing) throw new HttpError(404, 'Pizza non trovata.');
    if (!isAdmin) {
      const own = await queryFirst(db, 'SELECT 1 AS ok FROM recipe_creators WHERE recipe_id = ? AND user_id = ?', recipeId, actor.id);
      if (!own) throw new HttpError(403, 'Puoi modificare solo le pizze che hai creato tu.');
    }
    statements.push(sql(db, 'UPDATE pizza_recipes SET name = ?, description = ?, updated_at = ? WHERE id = ?', name, description, now, recipeId));
    statements.push(sql(db, 'DELETE FROM recipe_creators WHERE recipe_id = ?', recipeId));
    statements.push(sql(db, 'DELETE FROM pizza_ingredients WHERE recipe_id = ?', recipeId));

    // Versioni: aggiunge i panetti nuovi, toglie quelli deselezionati.
    const versions = await queryAll<{ id: string; dough_id: string | null }>(db, 'SELECT id, dough_id FROM pizza_versions WHERE recipe_id = ?', recipeId);
    const votes = await versionVoteCounts(db, recipeId);
    const keepNull = doughIds.length === 0;
    const toRemove = versions.filter((v) => (v.dough_id ? !doughIds.includes(v.dough_id) : !keepNull));
    const lostVotes = toRemove.reduce((sum, v) => sum + (votes.get(v.id) ?? 0), 0);
    if (lostVotes > 0 && !(isAdmin && input.confirmVoteLoss)) {
      throw new HttpError(409, `Togliendo quel panetto si cancellano ${lostVotes} voti.`, 'VOTES_WOULD_BE_LOST', { votes: lostVotes });
    }
    for (const v of toRemove) statements.push(sql(db, 'DELETE FROM pizza_versions WHERE id = ?', v.id));
    const existingDoughs = new Set(versions.map((v) => v.dough_id));
    const maxOrder = await queryFirst<{ n: number }>(db, 'SELECT COALESCE(MAX(tasting_order), 0) AS n FROM pizza_versions WHERE event_id = ?', event.id);
    let next = (maxOrder?.n ?? 0) + 1;
    for (const doughId of doughIds) {
      if (existingDoughs.has(doughId)) continue;
      statements.push(sql(db, 'INSERT INTO pizza_versions (id, event_id, recipe_id, dough_id, tasting_order, voting_locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)', newId(), event.id, recipeId, doughId, next++, now, now));
    }
    if (keepNull && !versions.some((v) => v.dough_id === null)) {
      statements.push(sql(db, 'INSERT INTO pizza_versions (id, event_id, recipe_id, dough_id, tasting_order, voting_locked, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, 0, ?, ?)', newId(), event.id, recipeId, next++, now, now));
    }
  } else {
    recipeId = newId();
    statements.push(
      sql(db, 'INSERT INTO pizza_recipes (id, event_id, name, description, is_demo, created_by, art_seed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)', recipeId, event.id, name, description, actor.id, input.artSeed ?? randomSeed(), now, now),
    );
    const maxOrder = await queryFirst<{ n: number }>(db, 'SELECT COALESCE(MAX(tasting_order), 0) AS n FROM pizza_versions WHERE event_id = ?', event.id);
    let next = (maxOrder?.n ?? 0) + 1;
    const targets = doughIds.length ? doughIds : [null];
    for (const doughId of targets) {
      statements.push(sql(db, 'INSERT INTO pizza_versions (id, event_id, recipe_id, dough_id, tasting_order, voting_locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)', newId(), event.id, recipeId, doughId, next++, now, now));
    }
  }

  for (const userId of creatorIds) statements.push(sql(db, 'INSERT INTO recipe_creators (recipe_id, user_id) VALUES (?, ?)', recipeId, userId));
  labels.forEach((label, position) => {
    statements.push(sql(db, 'INSERT INTO pizza_ingredients (recipe_id, position, label, ingredient_id) VALUES (?, ?, ?, ?)', recipeId, position, label, matchLabel(label, catalog)));
  });
  statements.push(bumpRevision(db, event.id));
  statements.push(auditStatement(db, { eventId: event.id, actor, action: created ? 'pizza.created' : 'pizza.updated', entity: 'recipe', entityId: recipeId, details: { name, ingredients: labels } }));

  await db.batch(statements);
  if (!created) {
    const renumber = await renumberStatements(db, event.id);
    if (renumber.length) await db.batch(renumber);
  }
  return { recipeId, created };
}

export async function deleteRecipe(ctx: SaveContext, recipeId: string): Promise<number> {
  const { db, event, actor, isAdmin } = ctx;
  const recipe = await queryFirst<{ id: string; name: string }>(db, 'SELECT id, name FROM pizza_recipes WHERE id = ? AND event_id = ?', recipeId, event.id);
  if (!recipe) throw new HttpError(404, 'Pizza non trovata.');
  const votes = await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM votes vo JOIN pizza_versions v ON v.id = vo.pizza_version_id WHERE v.recipe_id = ?', recipeId);
  if (!isAdmin) {
    if (!capabilities(event.status).canCreatePizza) throw new HttpError(409, 'In questo momento non si possono eliminare pizze.');
    const own = await queryFirst(db, 'SELECT 1 AS ok FROM recipe_creators WHERE recipe_id = ? AND user_id = ?', recipeId, actor.id);
    if (!own) throw new HttpError(403, 'Puoi eliminare solo le pizze che hai creato tu.');
    if ((votes?.n ?? 0) > 0) throw new HttpError(409, 'Questa pizza ha già dei voti: può eliminarla solo l’admin.');
  }
  await db.batch([
    sql(db, 'DELETE FROM pizza_recipes WHERE id = ?', recipeId),
    bumpRevision(db, event.id),
    auditStatement(db, { eventId: event.id, actor, action: 'pizza.deleted', entity: 'recipe', entityId: recipeId, details: { name: recipe.name, votes: votes?.n ?? 0 } }),
  ]);
  const renumber = await renumberStatements(db, event.id);
  if (renumber.length) await db.batch(renumber);
  return votes?.n ?? 0;
}

async function versionWithName(db: Db, eventId: string, versionId: string) {
  const row = await queryFirst<{ id: string; recipe_id: string; name: string; dough_id: string | null; voting_locked: number; tasting_order: number }>(
    db,
    'SELECT v.id, v.recipe_id, r.name, v.dough_id, v.voting_locked, v.tasting_order FROM pizza_versions v JOIN pizza_recipes r ON r.id = v.recipe_id WHERE v.id = ? AND v.event_id = ?',
    versionId,
    eventId,
  );
  if (!row) throw new HttpError(404, 'Pizza non trovata.');
  return row;
}

export async function moveVersion(ctx: SaveContext, versionId: string, direction: 'up' | 'down'): Promise<void> {
  const { db, event, actor } = ctx;
  const ordered = await queryAll<{ id: string }>(db, 'SELECT id FROM pizza_versions WHERE event_id = ? ORDER BY tasting_order, created_at', event.id);
  const ids = ordered.map((r) => r.id);
  const index = ids.indexOf(versionId);
  if (index < 0) throw new HttpError(404, 'Pizza non trovata.');
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  const version = await versionWithName(db, event.id, versionId);
  await db.batch([
    ...(await renumberStatements(db, event.id, ids)),
    bumpRevision(db, event.id),
    auditStatement(db, { eventId: event.id, actor, action: 'version.updated', entity: 'pizza_version', entityId: versionId, details: { name: version.name, change: `spostata al n. ${target + 1}` } }),
  ]);
}

export async function setVersionDough(ctx: SaveContext, versionId: string, doughId: string | null): Promise<void> {
  const { db, event, actor } = ctx;
  const version = await versionWithName(db, event.id, versionId);
  let doughName = 'nessun panetto';
  if (doughId) {
    const dough = await queryFirst<{ name: string }>(db, 'SELECT name FROM doughs WHERE id = ? AND event_id = ?', doughId, event.id);
    if (!dough) throw new HttpError(400, 'Panetto non valido.');
    doughName = dough.name;
  }
  try {
    await db.batch([
      sql(db, 'UPDATE pizza_versions SET dough_id = ?, updated_at = ? WHERE id = ?', doughId, nowIso(), versionId),
      bumpRevision(db, event.id),
      auditStatement(db, { eventId: event.id, actor, action: 'version.updated', entity: 'pizza_version', entityId: versionId, details: { name: version.name, change: `panetto: ${doughName}` } }),
    ]);
  } catch (error) {
    if (dbErrorCode(error) === 'UNIQUE') throw new HttpError(409, `“${version.name}” ha già una versione con ${doughName}.`);
    throw error;
  }
}

export async function setVersionLocked(ctx: SaveContext, versionId: string, locked: boolean): Promise<void> {
  const { db, event, actor } = ctx;
  const version = await versionWithName(db, event.id, versionId);
  await db.batch([
    sql(db, 'UPDATE pizza_versions SET voting_locked = ?, updated_at = ? WHERE id = ?', locked, nowIso(), versionId),
    bumpRevision(db, event.id),
    auditStatement(db, { eventId: event.id, actor, action: 'version.updated', entity: 'pizza_version', entityId: versionId, details: { name: version.name, change: locked ? 'voto bloccato' : 'voto sbloccato' } }),
  ]);
}

export async function deleteVersion(ctx: SaveContext, versionId: string): Promise<number> {
  const { db, event, actor } = ctx;
  const version = await versionWithName(db, event.id, versionId);
  const siblings = await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM pizza_versions WHERE recipe_id = ?', version.recipe_id);
  const votes = await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM votes WHERE pizza_version_id = ?', versionId);
  const statements: DbStatement[] =
    (siblings?.n ?? 0) <= 1
      ? [sql(db, 'DELETE FROM pizza_recipes WHERE id = ?', version.recipe_id)]
      : [sql(db, 'DELETE FROM pizza_versions WHERE id = ?', versionId)];
  statements.push(bumpRevision(db, event.id));
  statements.push(auditStatement(db, { eventId: event.id, actor, action: 'version.deleted', entity: 'pizza_version', entityId: versionId, details: { name: version.name, votes: votes?.n ?? 0 } }));
  await db.batch(statements);
  const renumber = await renumberStatements(db, event.id);
  if (renumber.length) await db.batch(renumber);
  return votes?.n ?? 0;
}

/** Elimina tutte le pizze dimostrative e i loro voti. */
export async function deleteDemoData(ctx: SaveContext): Promise<number> {
  const { db, event, actor } = ctx;
  const demo = await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM pizza_recipes WHERE event_id = ? AND is_demo = 1', event.id);
  if (!demo?.n) return 0;
  await db.batch([
    sql(db, 'DELETE FROM pizza_recipes WHERE event_id = ? AND is_demo = 1', event.id),
    bumpRevision(db, event.id),
    auditStatement(db, { eventId: event.id, actor, action: 'demo.deleted', entity: 'event', entityId: event.id, details: { pizzas: demo.n } }),
  ]);
  const renumber = await renumberStatements(db, event.id);
  if (renumber.length) await db.batch(renumber);
  return demo.n;
}
