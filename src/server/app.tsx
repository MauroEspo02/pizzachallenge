/**
 * L'applicazione: un unico gestore fetch(Request) → Response.
 * Lo usano sia Cloudflare Workers (worker.ts) sia il server Node (node.ts).
 */
import { ensureDatabase } from '../database/migrate';
import { ErrorPage } from '../ui/pages/ErrorPage';
import type { Env } from './env';
import { assertSameOrigin, Ctx, HttpError, json, redirect, RedirectSignal, Router, withCookiesAndHeaders, type ExecContext } from './http';
import { page } from './render';
import { registerAdminRoutes } from './routes/admin';
import { registerArtRoutes } from './routes/art';
import { registerParticipantRoutes } from './routes/participant';

export function createApp() {
  const router = new Router();
  registerParticipantRoutes(router);
  registerAdminRoutes(router);
  registerArtRoutes(router);

  async function handle(c: Ctx): Promise<Response> {
    const isApi = c.url.pathname.startsWith('/api/');
    try {
      await ensureDatabase(c.env);
      assertSameOrigin(c);
      const match = router.match(c.req.method, c.url.pathname);
      if (match === null) throw new HttpError(404, 'Qui non c’è niente: forse il link è vecchio.');
      if (match === 'method-not-allowed') throw new HttpError(405, 'Metodo non consentito.');
      c.params = match.params;
      return await match.handler(c);
    } catch (error) {
      if (error instanceof RedirectSignal) return redirect(error.location);
      if (error instanceof HttpError) {
        if (isApi || c.wantsJson) return json({ error: error.message, code: error.code, ...(error.extra ?? {}) }, error.status);
        return page(<ErrorPage status={error.status} message={error.message} />, error.status);
      }
      console.error('Errore inatteso', error);
      if (isApi || c.wantsJson) return json({ error: 'Errore inatteso del server. Riprova.' }, 500);
      return page(<ErrorPage status={500} message="Riprova tra un attimo. Se continua, avvisa l’organizzatore." />, 500);
    }
  }

  return {
    async fetch(request: Request, env: Env, exec: ExecContext): Promise<Response> {
      const c = new Ctx(request, env, exec);
      const response = await handle(c);
      return withCookiesAndHeaders(c, response);
    },
  };
}
