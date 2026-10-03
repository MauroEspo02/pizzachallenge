/** Protezione delle rotte: ogni pagina e ogni azione verifica la sessione sul server. */
import { HttpError, RedirectSignal, type Ctx } from '../server/http';
import { readSession, type SessionUser } from './session';

export function currentParticipant(c: Ctx): Promise<SessionUser | null> {
  return readSession(c, 'participant');
}

export function currentAdmin(c: Ctx): Promise<SessionUser | null> {
  return readSession(c, 'admin');
}

export async function requireParticipant(c: Ctx): Promise<SessionUser> {
  const user = await currentParticipant(c);
  if (user) return user;
  if (c.wantsJson || c.req.method !== 'GET') throw new HttpError(401, 'Sessione scaduta: accedi di nuovo.', 'AUTH_REQUIRED');
  const next = c.url.pathname === '/' ? '' : `?next=${encodeURIComponent(c.url.pathname)}`;
  throw new RedirectSignal(`/accedi${next}`);
}

export async function requireAdmin(c: Ctx): Promise<SessionUser> {
  const admin = await currentAdmin(c);
  if (admin) return admin;
  if (c.wantsJson || c.req.method !== 'GET') throw new HttpError(403, "Serve l'accesso admin.", 'ADMIN_REQUIRED');
  throw new RedirectSignal('/admin/login');
}

/** Solo percorsi interni: evita redirect verso siti esterni dopo il login. */
export function safeNext(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
