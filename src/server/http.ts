/**
 * Mini framework HTTP su standard Web (Request/Response): gira identico su Cloudflare Workers e su Node.
 * Router con parametri (/pizza/:id), cookie, risposte, errori, protezione CSRF.
 */
import type { Env } from './env';

export interface ExecContext {
  waitUntil(promise: Promise<unknown>): void;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class RedirectSignal extends Error {
  constructor(readonly location: string) {
    super(`redirect ${location}`);
  }
}

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: 'Lax' | 'Strict';
}

export class Ctx {
  readonly url: URL;
  params: Record<string, string> = {};
  readonly cookies: Map<string, string>;
  readonly outgoingCookies: string[] = [];
  /** Cache per la durata della richiesta (sessione, evento…). */
  readonly memo = new Map<string, Promise<unknown>>();

  constructor(
    readonly req: Request,
    readonly env: Env,
    readonly exec: ExecContext,
  ) {
    this.url = new URL(req.url);
    this.cookies = parseCookies(req.headers.get('cookie') ?? '');
  }

  get isSecure(): boolean {
    return this.url.protocol === 'https:';
  }

  get wantsJson(): boolean {
    return (this.req.headers.get('accept') ?? '').includes('application/json') || (this.req.headers.get('content-type') ?? '').includes('application/json');
  }

  clientIp(): string {
    return this.req.headers.get('cf-connecting-ip') ?? this.req.headers.get('x-real-ip') ?? this.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  }

  setCookie(name: string, value: string, options: CookieOptions = {}): void {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`, `SameSite=${options.sameSite ?? 'Lax'}`];
    if (options.httpOnly !== false) parts.push('HttpOnly');
    if (this.isSecure) parts.push('Secure');
    if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    this.outgoingCookies.push(parts.join('; '));
  }

  deleteCookie(name: string, path = '/'): void {
    this.setCookie(name, '', { maxAge: 0, path });
  }

  once<T>(key: string, factory: () => Promise<T>): Promise<T> {
    let value = this.memo.get(key) as Promise<T> | undefined;
    if (!value) {
      value = factory();
      this.memo.set(key, value);
    }
    return value;
  }
}

function parseCookies(header: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      map.set(key, decodeURIComponent(raw));
    } catch {
      map.set(key, raw);
    }
  }
  return map;
}

// ——— Risposte ———

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function html(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': PAGE_CSP,
      ...headers,
    },
  });
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

export function withCookiesAndHeaders(c: Ctx, response: Response): Response {
  const out = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(key)) out.headers.set(key, value);
  for (const cookie of c.outgoingCookies) out.headers.append('Set-Cookie', cookie);
  return out;
}

// ——— Router ———

export type Handler = (c: Ctx) => Response | Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  get(path: string, handler: Handler): this {
    return this.add('GET', path, handler);
  }

  post(path: string, handler: Handler): this {
    return this.add('POST', path, handler);
  }

  add(method: string, path: string, handler: Handler): this {
    const keys: string[] = [];
    const source = path
      .split('/')
      .map((segment) =>
        segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([a-zA-Z]+)/g, (_, key: string) => {
          keys.push(key);
          return '([^/]+?)';
        }),
      )
      .join('/');
    this.routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, handler });
    return this;
  }

  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null | 'method-not-allowed' {
    let pathMatched = false;
    for (const route of this.routes) {
      const m = route.pattern.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (route.method !== method && !(method === 'HEAD' && route.method === 'GET')) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(m[i + 1] ?? '');
      });
      return { handler: route.handler, params };
    }
    return pathMatched ? 'method-not-allowed' : null;
  }
}

/** Le richieste che modificano dati devono arrivare dal sito stesso. */
export function assertSameOrigin(c: Ctx): void {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') return;
  const origin = c.req.headers.get('origin');
  if (origin && origin !== c.url.origin) throw new HttpError(403, 'Richiesta non consentita.');
  const site = c.req.headers.get('sec-fetch-site');
  if (!origin && site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'Richiesta non consentita.');
}

/** Legge il corpo della richiesta come oggetto (JSON o form). */
export async function readBody(c: Ctx): Promise<Record<string, unknown>> {
  const type = c.req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    try {
      const data: unknown = await c.req.json();
      return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
    } catch {
      throw new HttpError(400, 'Dati non leggibili.');
    }
  }
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await c.req.formData();
    const out: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value !== 'string') continue;
      if (key in out) {
        const prev = out[key];
        out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
      } else out[key] = value;
    }
    return out;
  }
  return {};
}
