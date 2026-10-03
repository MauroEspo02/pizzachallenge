/**
 * Server Node: sviluppo locale, test e hosting su qualunque server Node (Railway, VPS…).
 * Database: file SQLite in .data/ (o DB_PATH). Nessun servizio esterno necessario.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { openSqliteDb } from '../database/sqlite';
import { createApp } from './app';
import type { Env } from './env';

const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

export interface NodeServerOptions {
  port?: number;
  host?: string;
  dbPath?: string;
  publicDir?: string;
  env?: Partial<Env>;
}

export function startNodeServer(options: NodeServerOptions = {}) {
  const publicDir = resolve(options.publicDir ?? 'public');
  const db = openSqliteDb(options.dbPath ?? process.env.DB_PATH ?? '.data/pizza-challenge.sqlite');
  const env: Env = {
    DB: db,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    PIN_PEPPER: process.env.PIN_PEPPER,
    APP_ENV: process.env.APP_ENV ?? 'development',
    DEMO_PINS: process.env.DEMO_PINS,
    ...options.env,
  };
  const app = createApp();

  function serveStatic(req: IncomingMessage, res: ServerResponse): boolean {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (pathname === '/') return false;
    const file = normalize(join(publicDir, pathname));
    if (!file.startsWith(publicDir)) return false;
    let stat;
    try {
      stat = statSync(file);
    } catch {
      return false;
    }
    if (!stat.isFile()) return false;
    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const immutable = pathname.startsWith('/fonts/');
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.headers['if-none-match'] === etag) {
      res.statusCode = 304;
      res.end();
      return true;
    }
    res.setHeader('Content-Length', stat.size);
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
    return true;
  }

  const server = createServer(async (req, res) => {
    try {
      if (serveStatic(req, res)) return;
      const host = req.headers.host ?? 'localhost';
      const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
      const url = `${proto}://${host}${req.url ?? '/'}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
        else if (value !== undefined) headers.set(key, value);
      }
      if (!headers.has('x-real-ip')) headers.set('x-real-ip', req.socket.remoteAddress ?? 'local');
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const request = new Request(url, {
        method: req.method,
        headers,
        body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
        duplex: hasBody ? 'half' : undefined,
      } as RequestInit);
      const pending: Promise<unknown>[] = [];
      const response = await app.fetch(request, env, { waitUntil: (p) => pending.push(p) });
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        res.setHeader(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      if (response.body && req.method !== 'HEAD') {
        const body = Buffer.from(await response.arrayBuffer());
        res.end(body);
      } else res.end();
      await Promise.allSettled(pending);
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end('Errore del server');
    }
  });

  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';
  return new Promise<{ url: string; close: () => Promise<void> }>((resolvePromise) => {
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolvePromise({
        url: `http://localhost:${actualPort}`,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => {
              db.close();
              done();
            });
            server.closeAllConnections();
          }),
      });
    });
  });
}

const isMain = process.argv[1] && /server[\\/](node)\.(ts|js|mjs)$|dist[\\/]server\.mjs$/.test(process.argv[1]);
if (isMain) {
  void startNodeServer().then(({ url }) => {
    console.log(`\n  🍕 Pizza Challenge pronta su ${url}\n`);
  });
}
