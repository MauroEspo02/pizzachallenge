/** Panetti dell'evento: rinomina, aggiunta, eliminazione (solo se non usati). */
import { dbErrorCode, queryFirst, sql, type Db } from '../../database/types';
import { HttpError } from '../../server/http';
import { newId } from '../../utils/ids';
import { nowIso } from '../../utils/time';
import { auditStatement, type Actor } from '../audit/repo';
import { bumpRevision } from '../event/repo';

export async function saveDough(db: Db, eventId: string, input: { id?: string; name: string; shortName: string; tone: string }, actor: Actor): Promise<string> {
  const now = nowIso();
  const id = input.id ?? newId();
  try {
    if (input.id) {
      const existing = await queryFirst(db, 'SELECT id FROM doughs WHERE id = ? AND event_id = ?', input.id, eventId);
      if (!existing) throw new HttpError(404, 'Panetto non trovato.');
      await db.batch([
        sql(db, 'UPDATE doughs SET name = ?, short_name = ?, tone = ?, updated_at = ? WHERE id = ?', input.name, input.shortName, input.tone, now, id),
        bumpRevision(db, eventId),
        auditStatement(db, { eventId, actor, action: 'dough.saved', entity: 'dough', entityId: id, details: { name: input.name } }),
      ]);
    } else {
      const order = await queryFirst<{ n: number }>(db, 'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM doughs WHERE event_id = ?', eventId);
      await db.batch([
        sql(db, 'INSERT INTO doughs (id, event_id, name, short_name, tone, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, eventId, input.name, input.shortName, input.tone, order?.n ?? 0, now, now),
        bumpRevision(db, eventId),
        auditStatement(db, { eventId, actor, action: 'dough.saved', entity: 'dough', entityId: id, details: { name: input.name } }),
      ]);
    }
  } catch (error) {
    if (dbErrorCode(error) === 'UNIQUE') throw new HttpError(409, `Esiste già un panetto chiamato "${input.name}".`);
    throw error;
  }
  return id;
}

export async function deleteDough(db: Db, eventId: string, id: string, actor: Actor): Promise<void> {
  const dough = await queryFirst<{ name: string }>(db, 'SELECT name FROM doughs WHERE id = ? AND event_id = ?', id, eventId);
  if (!dough) throw new HttpError(404, 'Panetto non trovato.');
  const used = await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM pizza_versions WHERE dough_id = ?', id);
  if ((used?.n ?? 0) > 0) throw new HttpError(409, 'Questo panetto è usato da alcune pizze: prima assegna loro un altro panetto.');
  await db.batch([
    sql(db, 'DELETE FROM doughs WHERE id = ?', id),
    bumpRevision(db, eventId),
    auditStatement(db, { eventId, actor, action: 'dough.deleted', entity: 'dough', entityId: id, details: { name: dough.name } }),
  ]);
}
