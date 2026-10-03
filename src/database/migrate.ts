/**
 * Prepara il database al primo utilizzo: migrazioni, libreria ingredienti e dati iniziali.
 * Gira da solo alla prima richiesta (su Cloudflare e su Node): niente comandi da lanciare a mano.
 */
import { syncBuiltinCatalog } from '../features/ingredients/repo';
import { demoPinsEnabled, type Env } from '../server/env';
import { nowIso } from '../utils/time';
import { MIGRATIONS } from './migrations';
import { seedDatabase } from './seed';
import type { Db } from './types';

const ready = new WeakMap<Db, Promise<void>>();

export function ensureDatabase(env: Env): Promise<void> {
  const db = env.DB;
  let promise = ready.get(db);
  if (!promise) {
    promise = prepare(db, env).catch((error: unknown) => {
      ready.delete(db);
      throw error;
    });
    ready.set(db, promise);
  }
  return promise;
}

export async function runMigrations(db: Db): Promise<number[]> {
  await db
    .prepare('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)')
    .run();
  const { results } = await db.prepare('SELECT version FROM schema_migrations').all<{ version: number }>();
  const applied = new Set(results.map((r) => r.version));
  const done: number[] = [];
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    try {
      await db.batch([
        ...migration.statements.map((statement) => db.prepare(statement)),
        db
          .prepare('INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
          .bind(migration.version, migration.name, nowIso()),
      ]);
      done.push(migration.version);
    } catch (error) {
      // Se un'altra istanza l'ha applicata nello stesso momento, proseguiamo.
      const row = await db.prepare('SELECT version FROM schema_migrations WHERE version = ?').bind(migration.version).first();
      if (!row) throw error;
    }
  }
  return done;
}

async function prepare(db: Db, env: Env): Promise<void> {
  await runMigrations(db);
  await syncBuiltinCatalog(db);
  await seedDatabase(db, { demoPins: demoPinsEnabled(env) });
}
