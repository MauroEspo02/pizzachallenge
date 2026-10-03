/**
 * Limite ai tentativi di accesso. Con PIN di 4 cifre è la difesa principale:
 * - per persona: dopo 5 errori blocco di 1 minuto, poi 2, 4, 8… (max 1 ora);
 * - per dispositivo/rete: max 20 errori ogni 15 minuti;
 * - per l'admin: max 8 errori ogni 15 minuti.
 */
import { queryFirst, sql, type Db } from '../database/types';
import { isoInSeconds, isPast, nowIso, secondsUntil } from '../utils/time';
import { sha256Hex } from './crypto';

const WINDOW_SECONDS = 15 * 60;
const IP_MAX_FAILURES = 20;
const ADMIN_MAX_FAILURES = 8;
const USER_FAILURES_PER_STEP = 5;

export interface LockState {
  locked: boolean;
  retryAfter: number;
}

export async function ipKey(ip: string): Promise<string> {
  return `ip:${(await sha256Hex(ip)).slice(0, 32)}`;
}

export async function throttleState(db: Db, key: string): Promise<LockState> {
  const row = await queryFirst<{ locked_until: string | null }>(db, 'SELECT locked_until FROM login_throttle WHERE key = ?', key);
  if (row?.locked_until && !isPast(row.locked_until)) return { locked: true, retryAfter: secondsUntil(row.locked_until) };
  return { locked: false, retryAfter: 0 };
}

export async function recordThrottleFailure(db: Db, key: string, scope: 'ip' | 'admin'): Promise<void> {
  const now = nowIso();
  const windowStart = isoInSeconds(-WINDOW_SECONDS);
  const max = scope === 'admin' ? ADMIN_MAX_FAILURES : IP_MAX_FAILURES;
  await sql(
    db,
    `INSERT INTO login_throttle (key, failures, window_started_at, locked_until) VALUES (?, 1, ?, NULL)
     ON CONFLICT(key) DO UPDATE SET
       failures = CASE WHEN window_started_at < ? THEN 1 ELSE failures + 1 END,
       locked_until = CASE WHEN (CASE WHEN window_started_at < ? THEN 1 ELSE failures + 1 END) >= ? THEN ? ELSE locked_until END,
       window_started_at = CASE WHEN window_started_at < ? THEN ? ELSE window_started_at END`,
    key,
    now,
    windowStart,
    windowStart,
    max,
    isoInSeconds(WINDOW_SECONDS),
    windowStart,
    now,
  ).run();
}

export async function clearThrottle(db: Db, key: string): Promise<void> {
  await sql(db, 'DELETE FROM login_throttle WHERE key = ?', key).run();
}

/** Blocco per singola persona, salvato su users. */
export function userLockState(user: { locked_until: string | null }): LockState {
  if (user.locked_until && !isPast(user.locked_until)) return { locked: true, retryAfter: secondsUntil(user.locked_until) };
  return { locked: false, retryAfter: 0 };
}

export async function recordUserFailure(db: Db, userId: string): Promise<{ attemptsLeft: number; lockedFor: number }> {
  const row = await queryFirst<{ failed_logins: number }>(db, 'SELECT failed_logins FROM users WHERE id = ?', userId);
  const failures = (row?.failed_logins ?? 0) + 1;
  const reachedStep = failures % USER_FAILURES_PER_STEP === 0;
  const step = Math.floor(failures / USER_FAILURES_PER_STEP);
  const lockSeconds = reachedStep ? Math.min(3600, 60 * 2 ** (step - 1)) : 0;
  await sql(
    db,
    'UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?',
    failures,
    lockSeconds ? isoInSeconds(lockSeconds) : null,
    userId,
  ).run();
  return { attemptsLeft: USER_FAILURES_PER_STEP - (failures % USER_FAILURES_PER_STEP), lockedFor: lockSeconds };
}

export async function recordUserSuccess(db: Db, userId: string): Promise<void> {
  await sql(db, 'UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = ? WHERE id = ?', nowIso(), userId).run();
}
