/** Ingresso Cloudflare Workers. I file statici (public/) li serve Cloudflare prima di arrivare qui. */
import { createApp } from './app';
import type { Env } from './env';
import type { ExecContext } from './http';

const app = createApp();

export default {
  fetch(request: Request, env: Env, ctx: ExecContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
