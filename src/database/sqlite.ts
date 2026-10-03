/**
 * Adattatore D1 → node:sqlite per lo sviluppo locale, i test e l'hosting su un server Node.
 * Riproduce il comportamento di Cloudflare D1: chiavi esterne attive e batch transazionali.
 */
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Db, DbRunResult, DbStatement, DbValue } from './types';

export interface SqliteDb extends Db {
  close(): void;
  /** Accesso diretto, usato solo dai test. */
  raw: DatabaseSync;
}

export function openSqliteDb(path: string): SqliteDb {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const sqlite = new DatabaseSync(path);
  if (path !== ':memory:') sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec('PRAGMA busy_timeout = 5000');

  const cache = new Map<string, StatementSync>();
  const prepared = (query: string): StatementSync => {
    let statement = cache.get(query);
    if (!statement) {
      statement = sqlite.prepare(query);
      cache.set(query, statement);
    }
    return statement;
  };

  class Statement implements DbStatement {
    constructor(
      readonly query: string,
      readonly values: DbValue[] = [],
    ) {}

    bind(...values: DbValue[]): DbStatement {
      return new Statement(this.query, values.map((v) => (v === undefined ? null : v)));
    }

    async first<T>(): Promise<T | null> {
      const row = prepared(this.query).get(...this.values);
      return row ? (toPlain(row) as T) : null;
    }

    async all<T>(): Promise<{ results: T[] }> {
      return { results: prepared(this.query).all(...this.values).map((row) => toPlain(row) as T) };
    }

    async run(): Promise<DbRunResult> {
      return this.runSync();
    }

    runSync(): DbRunResult {
      const result = prepared(this.query).run(...this.values);
      return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
    }

    executeInBatch(): unknown {
      if (/^\s*(select|with)\b/i.test(this.query)) {
        return { results: prepared(this.query).all(...this.values).map((row) => toPlain(row)) };
      }
      return this.runSync();
    }
  }

  return {
    raw: sqlite,
    prepare: (query: string) => new Statement(query),
    async batch(statements: DbStatement[]) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const out = statements.map((statement) => (statement as Statement).executeInBatch());
        sqlite.exec('COMMIT');
        return out;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => sqlite.close(),
  };
}

function toPlain(row: unknown): Record<string, unknown> {
  return { ...(row as Record<string, unknown>) };
}
