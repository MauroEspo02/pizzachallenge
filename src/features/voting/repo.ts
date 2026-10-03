/** Voti: i propri (partecipante) e quelli di tutti (solo admin). */
import { dbErrorCode, queryAll, queryFirst, sql, type Db } from '../../database/types';
import { HttpError } from '../../server/http';
import { newId } from '../../utils/ids';
import { nowIso } from '../../utils/time';
import { auditStatement, type Actor } from '../audit/repo';
import { bumpRevision, type EventRecord } from '../event/repo';
import { capabilities } from '../event/state-machine';
import type { Scores } from './criteria';

export interface MyVote extends Scores {
  versionId: string;
  updatedAt: string;
}

interface VoteRow {
  id: string;
  pizza_version_id: string;
  user_id: string;
  taste_score: number;
  rewant_score: number;
  idea_score: number;
  smell_score: number;
  created_at: string;
  updated_at: string;
  admin_edit: number;
}

const toScores = (r: VoteRow): Scores => ({ taste: r.taste_score, rewant: r.rewant_score, idea: r.idea_score, smell: r.smell_score });

/** Solo i voti della persona collegata: nessuna query del partecipante legge i voti altrui. */
export async function listMyVotes(db: Db, eventId: string, userId: string): Promise<Map<string, MyVote>> {
  const rows = await queryAll<VoteRow>(db, 'SELECT * FROM votes WHERE event_id = ? AND user_id = ?', eventId, userId);
  return new Map(rows.map((r) => [r.pizza_version_id, { versionId: r.pizza_version_id, updatedAt: r.updated_at, ...toScores(r) }]));
}

export async function getMyVote(db: Db, eventId: string, userId: string, versionId: string): Promise<MyVote | null> {
  const row = await queryFirst<VoteRow>(db, 'SELECT * FROM votes WHERE event_id = ? AND user_id = ? AND pizza_version_id = ?', eventId, userId, versionId);
  return row ? { versionId: row.pizza_version_id, updatedAt: row.updated_at, ...toScores(row) } : null;
}

const UPSERT = `INSERT INTO votes (id, event_id, pizza_version_id, user_id, taste_score, rewant_score, idea_score, smell_score, created_at, updated_at, updated_by, admin_edit)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (event_id, pizza_version_id, user_id) DO UPDATE SET
    taste_score = excluded.taste_score,
    rewant_score = excluded.rewant_score,
    idea_score = excluded.idea_score,
    smell_score = excluded.smell_score,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by,
    admin_edit = excluded.admin_edit`;

function translateVoteError(error: unknown): never {
  switch (dbErrorCode(error)) {
    case 'VOTING_NOT_OPEN':
      throw new HttpError(409, 'Le votazioni sono chiuse: il voto non è stato salvato.', 'VOTING_CLOSED');
    case 'PIZZA_VOTING_LOCKED':
      throw new HttpError(409, 'Il voto per questa pizza è bloccato.', 'PIZZA_LOCKED');
    case 'USER_INACTIVE':
      throw new HttpError(403, 'Il tuo account è stato disattivato.', 'USER_INACTIVE');
    case 'VOTE_EVENT_MISMATCH':
      throw new HttpError(404, 'Pizza non trovata.');
    default:
      throw error;
  }
}

/** Voto del partecipante: le regole sono verificate qui e, di nuovo, dai trigger del database. */
export async function saveMyVote(db: Db, event: EventRecord, user: Actor, versionId: string, scores: Scores): Promise<{ created: boolean }> {
  if (!capabilities(event.status).canVote) throw new HttpError(409, 'Le votazioni sono chiuse: il voto non è stato salvato.', 'VOTING_CLOSED');
  const version = await queryFirst<{ id: string; voting_locked: number; name: string }>(
    db,
    'SELECT v.id, v.voting_locked, r.name FROM pizza_versions v JOIN pizza_recipes r ON r.id = v.recipe_id WHERE v.id = ? AND v.event_id = ?',
    versionId,
    event.id,
  );
  if (!version) throw new HttpError(404, 'Pizza non trovata.');
  if (version.voting_locked) throw new HttpError(409, 'Il voto per questa pizza è bloccato.', 'PIZZA_LOCKED');
  const existing = await getMyVote(db, event.id, user.id, versionId);
  const now = nowIso();
  try {
    await db.batch([
      sql(db, UPSERT, newId(), event.id, versionId, user.id, scores.taste, scores.rewant, scores.idea, scores.smell, now, now, user.id, 0),
      auditStatement(db, { eventId: event.id, actor: user, action: 'vote.saved', entity: 'pizza_version', entityId: versionId, details: { pizza: version.name, created: !existing, ...scores } }),
    ]);
  } catch (error) {
    translateVoteError(error);
  }
  return { created: !existing };
}

// ——— Solo admin ———

export interface AdminVote extends Scores {
  id: string;
  versionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  adminEdit: boolean;
}

export async function listAllVotes(db: Db, eventId: string): Promise<AdminVote[]> {
  const rows = await queryAll<VoteRow>(db, 'SELECT * FROM votes WHERE event_id = ? ORDER BY updated_at DESC', eventId);
  return rows.map((r) => ({ id: r.id, versionId: r.pizza_version_id, userId: r.user_id, createdAt: r.created_at, updatedAt: r.updated_at, adminEdit: r.admin_edit === 1, ...toScores(r) }));
}

export async function adminSaveVote(db: Db, event: EventRecord, admin: Actor, userId: string, versionId: string, scores: Scores): Promise<void> {
  const target = await queryFirst<{ name: string }>(db, `SELECT display_name AS name FROM users WHERE id = ? AND role = 'PARTICIPANT'`, userId);
  if (!target) throw new HttpError(404, 'Partecipante non trovato.');
  const version = await queryFirst<{ name: string }>(
    db,
    'SELECT r.name FROM pizza_versions v JOIN pizza_recipes r ON r.id = v.recipe_id WHERE v.id = ? AND v.event_id = ?',
    versionId,
    event.id,
  );
  if (!version) throw new HttpError(404, 'Pizza non trovata.');
  const before = await getMyVote(db, event.id, userId, versionId);
  const now = nowIso();
  try {
    await db.batch([
      sql(db, UPSERT, newId(), event.id, versionId, userId, scores.taste, scores.rewant, scores.idea, scores.smell, now, now, admin.id, 1),
      // Dopo il reveal le classifiche cambiano: i telefoni aperti si aggiornano.
      ...(event.status === 'RESULTS_REVEALED' ? [bumpRevision(db, event.id)] : []),
      auditStatement(db, {
        eventId: event.id,
        actor: admin,
        action: 'vote.admin_saved',
        entity: 'vote',
        entityId: `${userId}:${versionId}`,
        details: { participant: target.name, pizza: version.name, before, after: scores },
      }),
    ]);
  } catch (error) {
    translateVoteError(error);
  }
}

export async function adminDeleteVote(db: Db, event: EventRecord, admin: Actor, voteId: string): Promise<void> {
  const row = await queryFirst<{ id: string; user_name: string; pizza: string } & VoteRow>(
    db,
    `SELECT vo.*, u.display_name AS user_name, r.name AS pizza FROM votes vo
     JOIN users u ON u.id = vo.user_id JOIN pizza_versions v ON v.id = vo.pizza_version_id JOIN pizza_recipes r ON r.id = v.recipe_id
     WHERE vo.id = ? AND vo.event_id = ?`,
    voteId,
    event.id,
  );
  if (!row) throw new HttpError(404, 'Voto non trovato.');
  await db.batch([
    sql(db, 'DELETE FROM votes WHERE id = ?', voteId),
    ...(event.status === 'RESULTS_REVEALED' ? [bumpRevision(db, event.id)] : []),
    auditStatement(db, { eventId: event.id, actor: admin, action: 'vote.admin_deleted', entity: 'vote', entityId: voteId, details: { participant: row.user_name, pizza: row.pizza, before: toScores(row) } }),
  ]);
}

/** Voti dimostrativi (solo sulle pizze demo), utili per provare il reveal. */
export async function simulateDemoVotes(db: Db, event: EventRecord, admin: Actor): Promise<number> {
  const versions = await queryAll<{ id: string }>(db, 'SELECT v.id FROM pizza_versions v JOIN pizza_recipes r ON r.id = v.recipe_id WHERE v.event_id = ? AND r.is_demo = 1', event.id);
  const people = await queryAll<{ id: string }>(db, `SELECT id FROM users WHERE role = 'PARTICIPANT' AND is_active = 1`);
  const existing = new Set((await queryAll<{ k: string }>(db, `SELECT user_id || ':' || pizza_version_id AS k FROM votes WHERE event_id = ?`, event.id)).map((r) => r.k));
  const now = nowIso();
  const statements = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (const v of versions) {
    const bias = 2.6 + rand() * 2;
    for (const p of people) {
      if (existing.has(`${p.id}:${v.id}`)) continue;
      const score = () => Math.max(1, Math.min(5, Math.round(bias + (rand() - 0.5) * 2.2)));
      statements.push(sql(db, UPSERT, newId(), event.id, v.id, p.id, score(), score(), score(), score(), now, now, admin.id, 1));
    }
  }
  if (statements.length) {
    statements.push(auditStatement(db, { eventId: event.id, actor: admin, action: 'demo.simulated', details: { votes: statements.length } }));
    await db.batch(statements);
  }
  return Math.max(0, statements.length - 1);
}
