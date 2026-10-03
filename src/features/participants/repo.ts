/** Partecipanti: elenco, creazione, rinomina, PIN, disattivazione, eliminazione. */
import { generatePin, hashPin } from '../../auth/crypto';
import { endSessionsFor } from '../../auth/session';
import { dbErrorCode, queryAll, queryFirst, sql, type Db, type DbStatement } from '../../database/types';
import { HttpError } from '../../server/http';
import { newId } from '../../utils/ids';
import { cleanText, nameKey } from '../../utils/text';
import { nowIso } from '../../utils/time';
import { auditStatement, type Actor } from '../audit/repo';
import { bumpRevision } from '../event/repo';

export interface Participant {
  id: string;
  name: string;
  isActive: boolean;
  hasPin: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  sortOrder: number;
}

interface UserRow {
  id: string;
  display_name: string;
  is_active: number;
  pin_hash: string | null;
  last_login_at: string | null;
  locked_until: string | null;
  sort_order: number;
}

const toParticipant = (r: UserRow): Participant => ({
  id: r.id,
  name: r.display_name,
  isActive: r.is_active === 1,
  hasPin: !!r.pin_hash,
  lastLoginAt: r.last_login_at,
  lockedUntil: r.locked_until,
  sortOrder: r.sort_order,
});

export async function listParticipants(db: Db, options: { includeInactive?: boolean } = {}): Promise<Participant[]> {
  const rows = await queryAll<UserRow>(
    db,
    `SELECT id, display_name, is_active, pin_hash, last_login_at, locked_until, sort_order FROM users
     WHERE role = 'PARTICIPANT' ${options.includeInactive ? '' : 'AND is_active = 1'}
     ORDER BY is_active DESC, sort_order, display_name COLLATE NOCASE`,
  );
  return rows.map(toParticipant);
}

export async function getParticipant(db: Db, id: string): Promise<Participant | null> {
  const row = await queryFirst<UserRow>(
    db,
    `SELECT id, display_name, is_active, pin_hash, last_login_at, locked_until, sort_order FROM users WHERE id = ? AND role = 'PARTICIPANT'`,
    id,
  );
  return row ? toParticipant(row) : null;
}

/** Riga completa per il login (con hash del PIN e stato di blocco). */
export interface LoginUserRow {
  id: string;
  display_name: string;
  pin_hash: string | null;
  is_active: number;
  locked_until: string | null;
}

export async function findLoginUser(db: Db, by: { id?: string; name?: string }): Promise<LoginUserRow | null> {
  if (by.id) {
    return queryFirst<LoginUserRow>(db, `SELECT id, display_name, pin_hash, is_active, locked_until FROM users WHERE id = ? AND role = 'PARTICIPANT' AND is_active = 1`, by.id);
  }
  if (by.name) {
    return queryFirst<LoginUserRow>(
      db,
      `SELECT id, display_name, pin_hash, is_active, locked_until FROM users WHERE name_key = ? AND role = 'PARTICIPANT' AND is_active = 1`,
      nameKey(by.name),
    );
  }
  return null;
}

async function assertNameAvailable(db: Db, name: string, exceptId?: string): Promise<void> {
  const clash = await queryFirst<{ id: string }>(
    db,
    `SELECT id FROM users WHERE role = 'PARTICIPANT' AND is_active = 1 AND name_key = ? AND id IS NOT ?`,
    nameKey(name),
    exceptId ?? null,
  );
  if (clash) throw new HttpError(409, `Esiste già un partecipante attivo che si chiama "${name}".`, 'NAME_TAKEN');
}

function rethrowNameClash(error: unknown, name: string): never {
  if (dbErrorCode(error) === 'UNIQUE') throw new HttpError(409, `Esiste già un partecipante attivo che si chiama "${name}".`, 'NAME_TAKEN');
  throw error;
}

export async function createParticipant(db: Db, eventId: string, rawName: string, pin: string | null, pepper: string, actor: Actor): Promise<{ id: string; name: string; pin: string }> {
  const name = cleanText(rawName);
  await assertNameAvailable(db, name);
  const finalPin = pin ?? generatePin();
  const id = newId();
  const now = nowIso();
  const order = await queryFirst<{ n: number }>(db, `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM users WHERE role = 'PARTICIPANT'`);
  try {
    await db.batch([
      sql(
        db,
        `INSERT INTO users (id, display_name, name_key, role, pin_hash, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, 'PARTICIPANT', ?, 1, ?, ?, ?)`,
        id,
        name,
        nameKey(name),
        await hashPin(finalPin, pepper),
        order?.n ?? 0,
        now,
        now,
      ),
      bumpRevision(db, eventId),
      auditStatement(db, { eventId, actor, action: 'participant.created', entity: 'user', entityId: id, details: { name } }),
    ]);
  } catch (error) {
    rethrowNameClash(error, name);
  }
  return { id, name, pin: finalPin };
}

export async function renameParticipant(db: Db, eventId: string, id: string, rawName: string, actor: Actor): Promise<void> {
  const current = await getParticipant(db, id);
  if (!current) throw new HttpError(404, 'Partecipante non trovato.');
  const name = cleanText(rawName);
  if (current.isActive) await assertNameAvailable(db, name, id);
  try {
    await db.batch([
      sql(db, 'UPDATE users SET display_name = ?, name_key = ?, updated_at = ? WHERE id = ?', name, nameKey(name), nowIso(), id),
      bumpRevision(db, eventId),
      auditStatement(db, { eventId, actor, action: 'participant.renamed', entity: 'user', entityId: id, details: { from: current.name, to: name } }),
    ]);
  } catch (error) {
    rethrowNameClash(error, name);
  }
}

export async function setParticipantPin(db: Db, eventId: string, id: string, pin: string | null, pepper: string, actor: Actor): Promise<string> {
  const current = await getParticipant(db, id);
  if (!current) throw new HttpError(404, 'Partecipante non trovato.');
  const finalPin = pin ?? generatePin();
  await db.batch([
    sql(db, 'UPDATE users SET pin_hash = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?', await hashPin(finalPin, pepper), nowIso(), id),
    endSessionsFor(db, id),
    bumpRevision(db, eventId),
    auditStatement(db, { eventId, actor, action: 'participant.pin', entity: 'user', entityId: id, details: { name: current.name } }),
  ]);
  return finalPin;
}

/** Genera i PIN per chi non lo ha (o per tutti): l'unico momento in cui l'admin li vede in chiaro. */
export async function generatePins(db: Db, eventId: string, onlyMissing: boolean, pepper: string, actor: Actor): Promise<Array<{ id: string; name: string; pin: string }>> {
  const people = (await listParticipants(db)).filter((p) => p.isActive && (!onlyMissing || !p.hasPin));
  const out: Array<{ id: string; name: string; pin: string }> = [];
  const statements: DbStatement[] = [];
  const now = nowIso();
  for (const p of people) {
    const pin = generatePin();
    out.push({ id: p.id, name: p.name, pin });
    statements.push(sql(db, 'UPDATE users SET pin_hash = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?', await hashPin(pin, pepper), now, p.id));
    statements.push(endSessionsFor(db, p.id));
    statements.push(auditStatement(db, { eventId, actor, action: 'participant.pin', entity: 'user', entityId: p.id, details: { name: p.name } }));
  }
  if (statements.length) {
    statements.push(bumpRevision(db, eventId));
    await db.batch(statements);
  }
  return out;
}

export async function setParticipantActive(db: Db, eventId: string, id: string, active: boolean, actor: Actor): Promise<void> {
  const current = await getParticipant(db, id);
  if (!current) throw new HttpError(404, 'Partecipante non trovato.');
  if (active) await assertNameAvailable(db, current.name, id);
  const statements: DbStatement[] = [sql(db, 'UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?', active, nowIso(), id)];
  if (!active) statements.push(endSessionsFor(db, id));
  statements.push(bumpRevision(db, eventId));
  statements.push(auditStatement(db, { eventId, actor, action: 'participant.active', entity: 'user', entityId: id, details: { name: current.name, active } }));
  try {
    await db.batch(statements);
  } catch (error) {
    rethrowNameClash(error, current.name);
  }
}

export async function deleteParticipant(db: Db, eventId: string, id: string, actor: Actor): Promise<number> {
  const current = await getParticipant(db, id);
  if (!current) throw new HttpError(404, 'Partecipante non trovato.');
  const votes = await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM votes WHERE user_id = ?', id);
  await db.batch([
    sql(db, 'DELETE FROM users WHERE id = ?', id),
    bumpRevision(db, eventId),
    auditStatement(db, { eventId, actor, action: 'participant.deleted', entity: 'user', entityId: id, details: { name: current.name, votes: votes?.n ?? 0 } }),
  ]);
  return votes?.n ?? 0;
}
