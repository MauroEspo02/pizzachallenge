/**
 * Lettura dei risultati.
 * - loadRevealedResults: usa SOLO la vista revealed_vote_totals, che il database svuota finché
 *   l'evento non è in RESULTS_REVEALED. Doppio controllo: stato dell'evento qui + filtro nel database.
 * - loadAdminPreview: anteprima riservata all'admin.
 */
import { queryAll, queryFirst, type Db } from '../../database/types';
import type { EventRecord } from '../event/repo';
import { capabilities } from '../event/state-machine';
import type { PizzaVersion } from '../pizzas/types';
import { computeResults, type Results, type VersionTotals } from './compute';

export async function loadRevealedResults(db: Db, event: EventRecord, versions: PizzaVersion[]): Promise<Results | null> {
  if (!capabilities(event.status).resultsVisible) return null;
  const totals = await queryAll<VersionTotals & { event_id: string }>(db, 'SELECT * FROM revealed_vote_totals WHERE event_id = ?', event.id);
  const voters = await queryFirst<{ n: number }>(
    db,
    `SELECT COUNT(DISTINCT v.user_id) AS n FROM votes v JOIN events e ON e.id = v.event_id WHERE v.event_id = ? AND e.status = 'RESULTS_REVEALED'`,
    event.id,
  );
  return computeResults(versions, totals, voters?.n ?? 0);
}

export async function loadAdminPreview(db: Db, eventId: string, versions: PizzaVersion[]): Promise<Results> {
  const totals = await queryAll<VersionTotals>(db, 'SELECT * FROM vote_totals WHERE event_id = ?', eventId);
  const voters = await queryFirst<{ n: number }>(db, 'SELECT COUNT(DISTINCT user_id) AS n FROM votes WHERE event_id = ?', eventId);
  return computeResults(versions, totals, voters?.n ?? 0);
}
