/**
 * Migrazioni del database (dialetto SQLite, compatibile con Cloudflare D1).
 * Ogni migrazione è una lista di istruzioni singole, eseguite in un'unica transazione.
 * Per modificare lo schema in futuro: aggiungi una nuova migrazione in fondo, non modificare quelle esistenti.
 */
import { EVENT_STATUSES, FLOW_TRANSITIONS, RESET_TARGET } from '../features/event/state-machine';

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

const statusList = EVENT_STATUSES.map((s) => `'${s}'`).join(',');

function transitionInserts(): string[] {
  const rows: string[] = [];
  for (const from of EVENT_STATUSES) {
    for (const to of FLOW_TRANSITIONS[from]) rows.push(`('${from}','${to}','flow')`);
    if (from !== RESET_TARGET) rows.push(`('${from}','${RESET_TARGET}','reset')`);
  }
  return [`INSERT OR IGNORE INTO event_transitions (from_status, to_status, kind) VALUES ${rows.join(',')}`];
}

const voteChecks = (column: string) => `CHECK (typeof(${column}) = 'integer' AND ${column} BETWEEN 1 AND 5)`;

const voteGuardBody = `
  SELECT RAISE(ABORT, 'VOTE_EVENT_MISMATCH')
    WHERE (SELECT event_id FROM pizza_versions WHERE id = NEW.pizza_version_id) IS NOT NEW.event_id;
  SELECT RAISE(ABORT, 'VOTE_USER_NOT_PARTICIPANT')
    WHERE (SELECT role FROM users WHERE id = NEW.user_id) IS NOT 'PARTICIPANT';
  SELECT RAISE(ABORT, 'VOTING_NOT_OPEN')
    WHERE NEW.admin_edit = 0 AND (SELECT status FROM events WHERE id = NEW.event_id) IS NOT 'VOTING_OPEN';
  SELECT RAISE(ABORT, 'PIZZA_VOTING_LOCKED')
    WHERE NEW.admin_edit = 0 AND (SELECT voting_locked FROM pizza_versions WHERE id = NEW.pizza_version_id) = 1;
  SELECT RAISE(ABORT, 'USER_INACTIVE')
    WHERE NEW.admin_edit = 0 AND (SELECT is_active FROM users WHERE id = NEW.user_id) IS NOT 1;`;

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'schema iniziale',
    statements: [
      `CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,

      // ---------- Evento e macchina a stati ----------
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
        status TEXT NOT NULL DEFAULT 'SETUP' CHECK (status IN (${statusList})),
        is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
        serving_version_id TEXT REFERENCES pizza_versions(id) ON DELETE SET NULL,
        show_names_on_login INTEGER NOT NULL DEFAULT 1 CHECK (show_names_on_login IN (0, 1)),
        revision INTEGER NOT NULL DEFAULT 1,
        revealed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS events_single_current ON events(is_current) WHERE is_current = 1`,
      `CREATE TABLE IF NOT EXISTS event_transitions (
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('flow', 'reset')),
        PRIMARY KEY (from_status, to_status)
      )`,
      ...transitionInserts(),
      `CREATE TRIGGER IF NOT EXISTS events_status_guard
        BEFORE UPDATE OF status ON events
        WHEN NEW.status <> OLD.status AND NOT EXISTS (
          SELECT 1 FROM event_transitions WHERE from_status = OLD.status AND to_status = NEW.status
        )
        BEGIN
          SELECT RAISE(ABORT, 'EVENT_TRANSITION_NOT_ALLOWED');
        END`,

      // ---------- Persone e accessi ----------
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 40),
        name_key TEXT NOT NULL CHECK (length(name_key) > 0),
        role TEXT NOT NULL CHECK (role IN ('ADMIN', 'PARTICIPANT')),
        pin_hash TEXT,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        failed_logins INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        last_login_at TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      // Due account attivi non possono avere lo stesso nome (senza distinguere maiuscole e accenti).
      `CREATE UNIQUE INDEX IF NOT EXISTS users_unique_active_name ON users(role, name_key) WHERE is_active = 1`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('participant', 'admin')),
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        user_agent TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
      `CREATE TABLE IF NOT EXISTS login_throttle (
        key TEXT PRIMARY KEY,
        failures INTEGER NOT NULL DEFAULT 0,
        window_started_at TEXT NOT NULL,
        locked_until TEXT
      )`,

      // ---------- Panetti, gusti e pizze ----------
      `CREATE TABLE IF NOT EXISTS doughs (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
        short_name TEXT NOT NULL CHECK (length(trim(short_name)) BETWEEN 1 AND 24),
        tone TEXT NOT NULL DEFAULT 'pomodoro',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS doughs_unique_name ON doughs(event_id, lower(name))`,
      // GUSTO / RICETTA
      `CREATE TABLE IF NOT EXISTS pizza_recipes (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
        description TEXT CHECK (description IS NULL OR length(description) <= 280),
        is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        art_seed INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS pizza_recipes_event ON pizza_recipes(event_id)`,
      `CREATE TABLE IF NOT EXISTS recipe_creators (
        recipe_id TEXT NOT NULL REFERENCES pizza_recipes(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (recipe_id, user_id)
      )`,
      // PIZZA FISICA / VERSIONE DEL PANETTO: è ciò che si vota.
      `CREATE TABLE IF NOT EXISTS pizza_versions (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        recipe_id TEXT NOT NULL REFERENCES pizza_recipes(id) ON DELETE CASCADE,
        dough_id TEXT REFERENCES doughs(id) ON DELETE RESTRICT,
        tasting_order INTEGER NOT NULL CHECK (tasting_order >= 1),
        voting_locked INTEGER NOT NULL DEFAULT 0 CHECK (voting_locked IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      // Una sola versione per panetto per ogni gusto.
      `CREATE UNIQUE INDEX IF NOT EXISTS pizza_versions_recipe_dough ON pizza_versions(recipe_id, dough_id) WHERE dough_id IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS pizza_versions_event_order ON pizza_versions(event_id, tasting_order)`,

      // ---------- Ingredienti ----------
      `CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 40 AND id NOT GLOB '*[^a-z0-9-]*'),
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
        aliases TEXT NOT NULL DEFAULT '[]',
        category TEXT NOT NULL,
        visual TEXT NOT NULL,
        layer TEXT NOT NULL CHECK (layer IN ('sauce', 'cheese', 'topping', 'finish')),
        density REAL NOT NULL DEFAULT 1 CHECK (density > 0 AND density <= 3),
        colors TEXT NOT NULL DEFAULT '[]',
        is_builtin INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS pizza_ingredients (
        recipe_id TEXT NOT NULL REFERENCES pizza_recipes(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 48),
        ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,
        PRIMARY KEY (recipe_id, position)
      )`,
      `CREATE INDEX IF NOT EXISTS pizza_ingredients_ingredient ON pizza_ingredients(ingredient_id)`,

      // ---------- Voti ----------
      `CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        pizza_version_id TEXT NOT NULL REFERENCES pizza_versions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        taste_score INTEGER NOT NULL ${voteChecks('taste_score')},
        rewant_score INTEGER NOT NULL ${voteChecks('rewant_score')},
        idea_score INTEGER NOT NULL ${voteChecks('idea_score')},
        smell_score INTEGER NOT NULL ${voteChecks('smell_score')},
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        admin_edit INTEGER NOT NULL DEFAULT 0 CHECK (admin_edit IN (0, 1)),
        UNIQUE (event_id, pizza_version_id, user_id)
      )`,
      `CREATE INDEX IF NOT EXISTS votes_user ON votes(event_id, user_id)`,
      `CREATE INDEX IF NOT EXISTS votes_version ON votes(pizza_version_id)`,
      // Le regole del voto valgono anche dentro il database: fuori da VOTING_OPEN solo l'admin può correggere.
      `CREATE TRIGGER IF NOT EXISTS votes_guard_insert
        BEFORE INSERT ON votes
        BEGIN ${voteGuardBody}
        END`,
      `CREATE TRIGGER IF NOT EXISTS votes_guard_update
        BEFORE UPDATE ON votes
        BEGIN
          SELECT RAISE(ABORT, 'VOTE_IDENTITY_IMMUTABLE')
            WHERE NEW.event_id IS NOT OLD.event_id OR NEW.pizza_version_id IS NOT OLD.pizza_version_id OR NEW.user_id IS NOT OLD.user_id;
          ${voteGuardBody}
        END`,
      // Totali per pizza: solo per l'admin.
      `CREATE VIEW IF NOT EXISTS vote_totals AS
        SELECT event_id, pizza_version_id,
          COUNT(*) AS votes,
          SUM(taste_score) AS taste_sum,
          SUM(rewant_score) AS rewant_sum,
          SUM(idea_score) AS idea_sum,
          SUM(smell_score) AS smell_sum
        FROM votes
        GROUP BY event_id, pizza_version_id`,
      // Totali pubblici: restituiscono righe SOLO quando l'evento è in RESULTS_REVEALED.
      `CREATE VIEW IF NOT EXISTS revealed_vote_totals AS
        SELECT t.* FROM vote_totals t
        JOIN events e ON e.id = t.event_id
        WHERE e.status = 'RESULTS_REVEALED'`,

      // ---------- Registro ----------
      `CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT,
        actor_id TEXT,
        actor_name TEXT,
        action TEXT NOT NULL,
        entity TEXT,
        entity_id TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS audit_log_event ON audit_log(event_id, id)`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
