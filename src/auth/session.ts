/**
 * Sessioni lato server: nel cookie c'è solo un token casuale, nel database il suo hash.
 * Partecipante e admin hanno cookie separati: sullo stesso telefono puoi essere Mauro e anche l'admin.
 */
import { queryFirst, sql, type Db, type DbStatement } from '../database/types';
import type { Ctx } from '../server/http';
import { isoInSeconds, isPast, nowIso } from '../utils/time';
import { randomToken, sha256Hex } from './crypto';

export type SessionKind = 'participant' | 'admin';
export type Role = 'ADMIN' | 'PARTICIPANT';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}

export const SESSION_COOKIE: Record<SessionKind, string> = { participant: 'pc_s', admin: 'pc_a' };
const SESSION_TTL: Record<SessionKind, number> = { participant: 60 * 60 * 24 * 120, admin: 60 * 60 * 24 * 14 };
const REFRESH_AFTER_MS = 1000 * 60 * 60 * 12;

export async function createSession(c: Ctx, user: SessionUser, kind: SessionKind): Promise<void> {
  const token = randomToken(32);
  const now = nowIso();
  await c.env.DB.batch([
    sql(
      c.env.DB,
      'INSERT INTO sessions (token_hash, user_id, kind, created_at, last_seen_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      await sha256Hex(token),
      user.id,
      kind,
      now,
      now,
      isoInSeconds(SESSION_TTL[kind]),
      (c.req.headers.get('user-agent') ?? '').slice(0, 200),
    ),
    sql(c.env.DB, 'DELETE FROM sessions WHERE expires_at < ?', now),
  ]);
  c.setCookie(SESSION_COOKIE[kind], token, { maxAge: SESSION_TTL[kind] });
}

interface SessionRow {
  id: string;
  display_name: string;
  role: Role;
  is_active: number;
  expires_at: string;
  last_seen_at: string;
  token_hash: string;
}

export function readSession(c: Ctx, kind: SessionKind): Promise<SessionUser | null> {
  return c.once(`session:${kind}`, async () => {
    const token = c.cookies.get(SESSION_COOKIE[kind]);
    if (!token || token.length > 128) return null;
    const hash = await sha256Hex(token);
    const row = await queryFirst<SessionRow>(
      c.env.DB,
      `SELECT u.id, u.display_name, u.role, u.is_active, s.expires_at, s.last_seen_at, s.token_hash
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.kind = ?`,
      hash,
      kind,
    );
    const expectedRole: Role = kind === 'admin' ? 'ADMIN' : 'PARTICIPANT';
    if (!row || isPast(row.expires_at) || row.is_active !== 1 || row.role !== expectedRole) {
      c.deleteCookie(SESSION_COOKIE[kind]);
      return null;
    }
    // Sessione "scorrevole": chi usa l'app resta dentro senza rifare il login.
    if (Date.now() - new Date(row.last_seen_at).getTime() > REFRESH_AFTER_MS) {
      const expires = isoInSeconds(SESSION_TTL[kind]);
      c.exec.waitUntil(
        c.env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?').bind(nowIso(), expires, row.token_hash).run(),
      );
      c.setCookie(SESSION_COOKIE[kind], token, { maxAge: SESSION_TTL[kind] });
    }
    return { id: row.id, name: row.display_name, role: row.role };
  });
}

export async function destroySession(c: Ctx, kind: SessionKind): Promise<void> {
  const token = c.cookies.get(SESSION_COOKIE[kind]);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  c.deleteCookie(SESSION_COOKIE[kind]);
}

/** Chiude tutte le sessioni di una persona (cambio PIN, disattivazione). */
export function endSessionsFor(db: Db, userId: string): DbStatement {
  return sql(db, 'DELETE FROM sessions WHERE user_id = ?', userId);
}
