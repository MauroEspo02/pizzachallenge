/** Evento corrente, cambi di stato, pizza in tavola, impostazioni. */
import { queryAll, queryFirst, sql, type Db, type DbStatement } from '../../database/types';
import { HttpError } from '../../server/http';
import { nowIso } from '../../utils/time';
import { auditStatement, type Actor } from '../audit/repo';
import { canTransition, isEventStatus, STATUS_INFO, type EventStatus } from './state-machine';

export interface EventRecord {
  id: string;
  name: string;
  status: EventStatus;
  servingVersionId: string | null;
  showNamesOnLogin: boolean;
  revision: number;
  revealedAt: string | null;
  catalogRev: string;
  updatedAt: string;
}

interface EventRow {
  id: string;
  name: string;
  status: string;
  serving_version_id: string | null;
  show_names_on_login: number;
  revision: number;
  revealed_at: string | null;
  updated_at: string;
  catalog_rev: string | null;
}

export async function getCurrentEvent(db: Db): Promise<EventRecord> {
  const row = await queryFirst<EventRow>(
    db,
    `SELECT e.*, (SELECT value FROM app_meta WHERE key = 'catalog_rev') AS catalog_rev FROM events e WHERE e.is_current = 1`,
  );
  if (!row || !isEventStatus(row.status)) throw new HttpError(503, 'Evento non disponibile.');
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    servingVersionId: row.serving_version_id,
    showNamesOnLogin: row.show_names_on_login === 1,
    revision: row.revision,
    revealedAt: row.revealed_at,
    catalogRev: row.catalog_rev ?? '0',
    updatedAt: row.updated_at,
  };
}

/** Incrementa la revisione: i telefoni aperti se ne accorgono e si aggiornano. */
export function bumpRevision(db: Db, eventId: string): DbStatement {
  return sql(db, 'UPDATE events SET revision = revision + 1, updated_at = ? WHERE id = ?', nowIso(), eventId);
}

export async function changeStatus(db: Db, event: EventRecord, to: EventStatus, actor: Actor): Promise<void> {
  if (event.status === to) return;
  if (!canTransition(event.status, to)) {
    throw new HttpError(409, `Non si può passare da "${STATUS_INFO[event.status].label}" a "${STATUS_INFO[to].label}".`);
  }
  const now = nowIso();
  await db.batch([
    sql(
      db,
      `UPDATE events SET status = ?, revealed_at = CASE WHEN ? = 'RESULTS_REVEALED' THEN ? ELSE NULL END, revision = revision + 1, updated_at = ? WHERE id = ? AND status = ?`,
      to,
      to,
      now,
      now,
      event.id,
      event.status,
    ),
    auditStatement(db, {
      eventId: event.id,
      actor,
      action: 'event.status',
      entity: 'event',
      entityId: event.id,
      details: { from: event.status, to, fromLabel: STATUS_INFO[event.status].label, toLabel: STATUS_INFO[to].label },
    }),
  ]);
}

export async function setServing(db: Db, event: EventRecord, versionId: string | null, versionName: string | null, actor: Actor): Promise<void> {
  await db.batch([
    sql(db, 'UPDATE events SET serving_version_id = ?, revision = revision + 1, updated_at = ? WHERE id = ?', versionId, nowIso(), event.id),
    auditStatement(db, { eventId: event.id, actor, action: 'event.serving', entity: 'pizza_version', entityId: versionId ?? undefined, details: { name: versionName } }),
  ]);
}

export async function updateSettings(db: Db, event: EventRecord, input: { name: string; showNamesOnLogin: boolean }, actor: Actor): Promise<void> {
  await db.batch([
    sql(db, 'UPDATE events SET name = ?, show_names_on_login = ?, revision = revision + 1, updated_at = ? WHERE id = ?', input.name, input.showNamesOnLogin, nowIso(), event.id),
    auditStatement(db, { eventId: event.id, actor, action: 'event.settings', entity: 'event', entityId: event.id, details: input }),
  ]);
}

/** Reset: cancella i voti (ed eventualmente le pizze) e riporta l'evento in preparazione. */
export async function resetEvent(db: Db, event: EventRecord, options: { deletePizzas: boolean }, actor: Actor): Promise<{ votes: number }> {
  const count = await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM votes WHERE event_id = ?', event.id);
  const now = nowIso();
  const statements: DbStatement[] = [
    sql(db, 'DELETE FROM votes WHERE event_id = ?', event.id),
    sql(db, `UPDATE events SET status = 'SETUP', serving_version_id = NULL, revealed_at = NULL, revision = revision + 1, updated_at = ? WHERE id = ?`, now, event.id),
  ];
  if (options.deletePizzas) statements.push(sql(db, 'DELETE FROM pizza_recipes WHERE event_id = ?', event.id));
  statements.push(
    auditStatement(db, { eventId: event.id, actor, action: 'event.reset', entity: 'event', entityId: event.id, details: { votes: count?.n ?? 0, deletedPizzas: options.deletePizzas } }),
  );
  await db.batch(statements);
  return { votes: count?.n ?? 0 };
}

export async function listEventDoughIds(db: Db, eventId: string): Promise<string[]> {
  const rows = await queryAll<{ id: string }>(db, 'SELECT id FROM doughs WHERE event_id = ? ORDER BY sort_order', eventId);
  return rows.map((r) => r.id);
}
