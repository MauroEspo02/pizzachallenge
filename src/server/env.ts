import type { Db } from '../database/types';

/** Variabili d'ambiente e binding disponibili al server (Cloudflare o Node). */
export interface Env {
  DB: Db;
  /** File statici (solo Cloudflare). */
  ASSETS?: { fetch(request: Request): Promise<Response> };
  /** Password dell'area /admin. Obbligatoria in produzione. */
  ADMIN_PASSWORD?: string;
  /** Segreto facoltativo mescolato ai PIN prima dell'hash. */
  PIN_PEPPER?: string;
  /** 'production' | 'development' | 'test' */
  APP_ENV?: string;
  /** '1' per assegnare PIN dimostrativi (1111, 2222…) ai partecipanti iniziali. Mai in produzione. */
  DEMO_PINS?: string;
}

export function isProduction(env: Env): boolean {
  return env.APP_ENV === 'production';
}

export const DEV_ADMIN_PASSWORD = 'pizza';

/** Password admin effettiva: in sviluppo c'è un valore di comodo, in produzione va impostata. */
export function adminPassword(env: Env): string | null {
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length > 0) return env.ADMIN_PASSWORD;
  return isProduction(env) ? null : DEV_ADMIN_PASSWORD;
}

export function demoPinsEnabled(env: Env): boolean {
  if (isProduction(env)) return false;
  return env.DEMO_PINS === undefined ? true : env.DEMO_PINS === '1';
}
