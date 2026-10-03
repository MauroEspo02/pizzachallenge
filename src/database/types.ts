/**
 * Interfaccia minima del database, compatibile con Cloudflare D1.
 * In produzione è il binding D1; in locale e nei test è un adattatore su node:sqlite.
 */
export type DbValue = string | number | null;

export interface DbRunResult {
  meta: { changes: number; last_row_id: number };
}

export interface DbStatement {
  bind(...values: DbValue[]): DbStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<DbRunResult>;
}

export interface Db {
  prepare(sql: string): DbStatement;
  /** Esegue più istruzioni in un'unica transazione atomica. */
  batch(statements: DbStatement[]): Promise<unknown[]>;
}

/** Prepara un'istruzione con i parametri già collegati. */
export function sql(db: Db, query: string, ...params: Array<DbValue | boolean | undefined>): DbStatement {
  return db.prepare(query).bind(...params.map(toDbValue));
}

export async function queryAll<T>(db: Db, query: string, ...params: Array<DbValue | boolean | undefined>): Promise<T[]> {
  const { results } = await sql(db, query, ...params).all<T>();
  return results;
}

export async function queryFirst<T>(db: Db, query: string, ...params: Array<DbValue | boolean | undefined>): Promise<T | null> {
  return sql(db, query, ...params).first<T>();
}

export async function execute(db: Db, query: string, ...params: Array<DbValue | boolean | undefined>): Promise<DbRunResult> {
  return sql(db, query, ...params).run();
}

export function toDbValue(value: DbValue | boolean | undefined): DbValue {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/** Riconosce gli errori sollevati dai trigger del database (RAISE(ABORT, 'CODICE')). */
export function dbErrorCode(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  const known = [
    'VOTING_NOT_OPEN',
    'PIZZA_VOTING_LOCKED',
    'USER_INACTIVE',
    'VOTE_EVENT_MISMATCH',
    'VOTE_USER_NOT_PARTICIPANT',
    'VOTE_IDENTITY_IMMUTABLE',
    'EVENT_TRANSITION_NOT_ALLOWED',
  ];
  for (const code of known) if (message.includes(code)) return code;
  if (message.includes('UNIQUE constraint failed')) return 'UNIQUE';
  if (message.includes('FOREIGN KEY constraint failed')) return 'FOREIGN_KEY';
  if (message.includes('CHECK constraint failed')) return 'CHECK';
  return null;
}
