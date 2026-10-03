/**
 * I casi di verifica richiesti, contro il server vero (Node + SQLite), via HTTP come farebbe un telefono.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { openSqliteDb } from '../../src/database/sqlite';
import { startNodeServer } from '../../src/server/node';
import { ISLANDS } from '../../src/ui/islands';
import { ISLAND_LOADERS } from '../../src/client/islands';

const dir = mkdtempSync(join(tmpdir(), 'pizza-e2e-'));
const dbPath = join(dir, 'test.sqlite');
let base = '';
let close: () => Promise<void>;

class Client {
  jar = new Map<string, string>();
  async req(path: string, init: { method?: string; json?: unknown; form?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { origin: base, cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    let body: string | undefined;
    if (init.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(init.json);
    } else if (init.form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(init.form).toString();
    }
    const res = await fetch(base + path, { method: init.method ?? (body ? 'POST' : 'GET'), headers, body, redirect: 'manual' });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const [k, v] = pair!.split('=');
      if (v) this.jar.set(k!, v);
      else this.jar.delete(k!);
    }
    return res;
  }
  async login(name: string, pin: string) {
    const r = await this.req('/api/login', { json: { name, pin } });
    assert.equal(r.status, 200, `login ${name}`);
    return this;
  }
  vote(versionId: string, s: number[]) {
    return this.req('/api/votes', { json: { versionId, scores: { taste: s[0], rewant: s[1], idea: s[2], smell: s[3] } } });
  }
}

const admin = new Client();
const guido = new Client();
const mauro = new Client();
let versions: Array<{ id: string; name: string; creators: string }> = [];
const status = (to: string) => admin.req('/api/admin/status', { json: { to } });

before(async () => {
  const server = await startNodeServer({ port: 0, host: '127.0.0.1', dbPath, env: { APP_ENV: 'development' } });
  base = server.url.replace('localhost', '127.0.0.1');
  close = server.close;
  assert.equal((await admin.req('/admin/login', { form: { password: 'pizza' } })).status, 303);
  await guido.login('Guido', '1111');
  await mauro.login('Mauro', '3333');
  const db = openSqliteDb(dbPath);
  versions = db.raw
    .prepare(`SELECT v.id, r.name, (SELECT group_concat(u.display_name) FROM recipe_creators rc JOIN users u ON u.id = rc.user_id WHERE rc.recipe_id = r.id) AS creators
              FROM pizza_versions v JOIN pizza_recipes r ON r.id = v.recipe_id ORDER BY v.tasting_order`)
    .all() as typeof versions;
  db.close();
  assert.equal((await status('CREATION_OPEN')).status, 200);
  assert.equal((await status('VOTING_OPEN')).status, 200);
});

after(async () => {
  await close?.();
  rmSync(dir, { recursive: true, force: true });
});

test('3. Mauro può votare la propria pizza', async () => {
  const own = versions.find((v) => v.creators.includes('Mauro'))!;
  assert.equal((await mauro.vote(own.id, [5, 4, 4, 5])).status, 200);
});

test('4. niente doppio voto: il secondo invio aggiorna, non duplica', async () => {
  const v = versions[0]!.id;
  await mauro.vote(v, [3, 3, 3, 3]);
  await mauro.vote(v, [4, 4, 4, 4]);
  const db = openSqliteDb(dbPath);
  const n = (db.raw.prepare('SELECT COUNT(*) n FROM votes v JOIN users u ON u.id = v.user_id WHERE u.display_name = ? AND v.pizza_version_id = ?').get('Mauro', v) as { n: number }).n;
  db.close();
  assert.equal(n, 1);
});

test('5. con votazioni aperte il voto si modifica', async () => {
  assert.equal((await mauro.vote(versions[0]!.id, [2, 2, 2, 2])).status, 200);
  const page = await (await mauro.req(`/pizza/${versions[0]!.id}`)).text();
  assert.match(page, /&quot;taste&quot;:2/);
});

test('voti non validi rifiutati dal server', async () => {
  assert.equal((await mauro.vote(versions[1]!.id, [6, 4, 4, 4])).status, 400);
  assert.equal((await mauro.vote(versions[1]!.id, [4.5, 4, 4, 4])).status, 400);
});

test('1. Guido non vede i voti di Mauro', async () => {
  const page = await (await guido.req(`/pizza/${versions[0]!.id}`)).text();
  assert.match(page, /&quot;initial&quot;:null/);
  assert.equal((await guido.req('/admin/voti')).status, 303);
  assert.equal((await guido.req('/api/admin/votes', { json: {} })).status, 403);
});

test('2. Mauro non vede medie né risultati prima del reveal', async () => {
  const res = await (await mauro.req('/risultati')).text();
  assert.match(res, /I risultati sono ancora segreti/);
  assert.match(res, /Aspetta il verdetto del pizzaiolo/);
  const live = await (await mauro.req('/api/live')).text();
  assert.doesNotMatch(live, /taste|media|score/i);
  const pizza = await (await mauro.req(`/pizza/${versions[0]!.id}`)).text();
  assert.doesNotMatch(pizza, /Classifica|posto/);
});

test('7. solo l’admin entra in /admin', async () => {
  assert.equal((await mauro.req('/admin')).status, 303);
  assert.equal((await new Client().req('/admin')).status, 303);
  assert.equal((await admin.req('/admin')).status, 200);
  assert.equal((await mauro.req('/api/admin/status', { json: { to: 'SETUP' } })).status, 403);
});

test('6. a votazioni chiuse il voto non si modifica', async () => {
  assert.equal((await status('VOTING_CLOSED')).status, 200);
  assert.equal((await mauro.vote(versions[0]!.id, [5, 5, 5, 5])).status >= 400, true);
});

test('8. solo l’admin rivela; 9. dopo il reveal tutti vedono gli stessi risultati', async () => {
  assert.equal((await mauro.req('/api/admin/reveal', { json: {} })).status, 403);
  assert.match(await (await guido.req('/risultati')).text(), /ancora segreti/);
  assert.equal((await admin.req('/api/admin/reveal', { json: {} })).status, 200);
  const ranking = async (c: Client) => {
    const html = await (await c.req('/risultati')).text();
    return html.slice(html.indexOf('id="classifica"'));
  };
  const a = await ranking(guido);
  const b = await ranking(mauro);
  assert.match(a, /Classifica completa/);
  assert.equal(a, b);
});

test('10. un settimo partecipante funziona senza toccare il codice', async () => {
  const r = await admin.req('/api/admin/participants', { json: { name: 'Carmela', pin: '7777' } });
  assert.equal(r.status, 200);
  assert.equal((await admin.req('/api/admin/participants', { json: { name: 'carmela' } })).status, 409, 'nome doppio rifiutato');
  const carmela = await new Client().login('Carmela', '7777');
  assert.equal((await carmela.req('/')).status, 200);
});

test('isole: server e browser conoscono le stesse', () => {
  assert.deepEqual(Object.keys(ISLANDS).sort(), Object.keys(ISLAND_LOADERS).sort());
});
