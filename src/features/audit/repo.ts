/** Registro delle operazioni: chi ha fatto cosa e quando. Visibile solo all'admin. */
import { queryAll, sql, type Db, type DbStatement } from '../../database/types';
import { nowIso } from '../../utils/time';

export interface Actor {
  id: string;
  name: string;
}

export interface AuditEntry {
  eventId: string | null;
  actor: Actor | null;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export function auditStatement(db: Db, entry: AuditEntry): DbStatement {
  return sql(
    db,
    `INSERT INTO audit_log (event_id, actor_id, actor_name, action, entity, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.eventId,
    entry.actor?.id ?? null,
    entry.actor?.name ?? 'Sistema',
    entry.action,
    entry.entity ?? null,
    entry.entityId ?? null,
    JSON.stringify(entry.details ?? {}),
    nowIso(),
  );
}

export interface AuditRow {
  id: number;
  actorName: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export async function listAudit(db: Db, eventId: string, limit = 150): Promise<AuditRow[]> {
  const rows = await queryAll<{ id: number; actor_name: string; action: string; entity: string | null; entity_id: string | null; details: string; created_at: string }>(
    db,
    `SELECT id, actor_name, action, entity, entity_id, details, created_at FROM audit_log WHERE event_id = ? OR event_id IS NULL ORDER BY id DESC LIMIT ?`,
    eventId,
    limit,
  );
  return rows.map((r) => ({
    id: r.id,
    actorName: r.actor_name,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    details: safeParse(r.details),
    createdAt: r.created_at,
  }));
}

function safeParse(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/** Descrizione leggibile di una riga del registro. */
export function describeAudit(row: AuditRow): string {
  const d = row.details;
  switch (row.action) {
    case 'event.status':
      return `Stato: ${str(d.fromLabel)} → ${str(d.toLabel)}`;
    case 'event.reset':
      return `Reset evento${d.deletedPizzas ? ' (anche le pizze)' : ''}: cancellati ${str(d.votes)} voti`;
    case 'event.settings':
      return 'Impostazioni aggiornate';
    case 'event.serving':
      return d.name ? `In tavola: ${str(d.name)}` : 'Nessuna pizza in tavola';
    case 'vote.saved':
      return `Voto ${d.created ? 'inserito' : 'modificato'} per ${str(d.pizza)}`;
    case 'vote.admin_saved':
      return `Voto di ${str(d.participant)} per ${str(d.pizza)} corretto dall'admin`;
    case 'vote.admin_deleted':
      return `Voto di ${str(d.participant)} per ${str(d.pizza)} cancellato`;
    case 'participant.created':
      return `Nuovo partecipante: ${str(d.name)}`;
    case 'participant.renamed':
      return `Rinominato ${str(d.from)} in ${str(d.to)}`;
    case 'participant.pin':
      return `Nuovo PIN per ${str(d.name)}`;
    case 'participant.active':
      return `${str(d.name)} ${d.active ? 'riattivato' : 'disattivato'}`;
    case 'participant.deleted':
      return `Eliminato ${str(d.name)} (${str(d.votes)} voti)`;
    case 'pizza.created':
      return `Nuova pizza: ${str(d.name)}`;
    case 'pizza.updated':
      return `Pizza modificata: ${str(d.name)}`;
    case 'pizza.deleted':
      return `Pizza eliminata: ${str(d.name)} (${str(d.votes)} voti)`;
    case 'version.updated':
      return `${str(d.name)}: ${str(d.change)}`;
    case 'version.deleted':
      return `Versione eliminata: ${str(d.name)} (${str(d.votes)} voti)`;
    case 'ingredient.saved':
      return `Ingrediente salvato: ${str(d.name)}`;
    case 'ingredient.deleted':
      return `Ingrediente eliminato: ${str(d.name)}`;
    case 'demo.deleted':
      return `Dati demo cancellati (${str(d.pizzas)} pizze)`;
    case 'demo.simulated':
      return `Voti demo simulati: ${str(d.votes)}`;
    case 'dough.saved':
      return `Panetto salvato: ${str(d.name)}`;
    case 'dough.deleted':
      return `Panetto eliminato: ${str(d.name)}`;
    case 'auth.admin_login':
      return 'Accesso admin';
    default:
      return row.action;
  }
}
