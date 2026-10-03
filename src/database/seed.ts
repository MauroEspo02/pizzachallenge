/**
 * Dati iniziali: evento, due panetti, sei partecipanti, account admin e tre gusti dimostrativi
 * (ognuno in due versioni, una per panetto). I dati demo sono marcati is_demo e si cancellano dall'admin.
 */
import { hashPin } from '../auth/crypto';
import { buildCatalogIndex, matchLabel } from '../pizza-builder/match';
import { DEFAULT_INGREDIENTS } from '../pizza-builder/catalog';
import { newId, randomSeed } from '../utils/ids';
import { nameKey } from '../utils/text';
import { nowIso } from '../utils/time';
import { sql, type Db, type DbStatement } from './types';

export const INITIAL_PARTICIPANTS = ['Guido', 'Leticia', 'Mauro', 'Terry', 'Lorenzo', 'Gigio'];
export const DEMO_PINS = ['1111', '2222', '3333', '4444', '5555', '6666'];

export const INITIAL_DOUGHS = [
  { name: 'Panetto Terry', shortName: 'Terry', tone: 'pomodoro' },
  { name: 'Panetto Mamma di Guido', shortName: 'Mamma di Guido', tone: 'basilico' },
];

export const DEMO_RECIPES = [
  {
    name: 'Zucca e funghi',
    description: 'Dolce, terrosa, profumata di bosco.',
    creators: ['Leticia', 'Lorenzo'],
    ingredients: ['Crema di zucca', 'Funghi porcini', 'Fior di latte', 'Parmigiano', 'Basilico'],
  },
  {
    name: 'Salsiccia e friarielli',
    description: 'Il classico napoletano, senza discussioni.',
    creators: ['Guido'],
    ingredients: ['Provola affumicata', 'Salsiccia', 'Friarielli', 'Peperoncino'],
  },
  {
    name: 'Mortadella e pistacchio',
    description: 'Cremosa, croccante, da dividere.',
    creators: ['Mauro', 'Terry'],
    ingredients: ['Fior di latte', 'Mortadella', 'Burrata', 'Granella di pistacchio'],
  },
];

export interface SeedOptions {
  demoPins: boolean;
}

/** Crea i dati iniziali solo se il database è vuoto. */
export async function seedDatabase(db: Db, options: SeedOptions): Promise<boolean> {
  const existing = await db.prepare('SELECT id FROM events WHERE is_current = 1').first<{ id: string }>();
  if (existing) return false;

  const now = nowIso();
  const eventId = newId();
  const statements: DbStatement[] = [
    sql(db, `INSERT INTO events (id, name, status, is_current, show_names_on_login, revision, created_at, updated_at) VALUES (?, ?, 'SETUP', 1, 1, 1, ?, ?)`, eventId, 'Pizza Challenge', now, now),
  ];

  const doughIds = INITIAL_DOUGHS.map(() => newId());
  INITIAL_DOUGHS.forEach((dough, i) => {
    statements.push(sql(db, `INSERT INTO doughs (id, event_id, name, short_name, tone, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, doughIds[i]!, eventId, dough.name, dough.shortName, dough.tone, i, now, now));
  });

  const userIds = new Map<string, string>();
  const pinHashes = options.demoPins ? await Promise.all(DEMO_PINS.map((pin) => hashPin(pin))) : [];
  INITIAL_PARTICIPANTS.forEach((name, i) => {
    const id = newId();
    userIds.set(name, id);
    statements.push(sql(db, `INSERT INTO users (id, display_name, name_key, role, pin_hash, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, 'PARTICIPANT', ?, 1, ?, ?, ?)`, id, name, nameKey(name), pinHashes[i] ?? null, i, now, now));
  });
  statements.push(sql(db, `INSERT INTO users (id, display_name, name_key, role, pin_hash, is_active, sort_order, created_at, updated_at) VALUES (?, 'Admin', 'admin', 'ADMIN', NULL, 1, 0, ?, ?)`, newId(), now, now));

  const catalog = buildCatalogIndex(DEFAULT_INGREDIENTS);
  let order = 1;
  for (const recipe of DEMO_RECIPES) {
    const recipeId = newId();
    statements.push(sql(db, `INSERT INTO pizza_recipes (id, event_id, name, description, is_demo, created_by, art_seed, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NULL, ?, ?, ?)`, recipeId, eventId, recipe.name, recipe.description, randomSeed(), now, now));
    for (const creator of recipe.creators) {
      statements.push(sql(db, `INSERT INTO recipe_creators (recipe_id, user_id) VALUES (?, ?)`, recipeId, userIds.get(creator)!));
    }
    recipe.ingredients.forEach((label, position) => {
      statements.push(sql(db, `INSERT INTO pizza_ingredients (recipe_id, position, label, ingredient_id) VALUES (?, ?, ?, ?)`, recipeId, position, label, matchLabel(label, catalog)));
    });
    for (const doughId of doughIds) {
      statements.push(sql(db, `INSERT INTO pizza_versions (id, event_id, recipe_id, dough_id, tasting_order, voting_locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`, newId(), eventId, recipeId, doughId, order++, now, now));
    }
  }

  try {
    await db.batch(statements);
    return true;
  } catch (error) {
    // Un'altra istanza può aver creato l'evento nello stesso istante: in quel caso va bene così.
    const again = await db.prepare('SELECT id FROM events WHERE is_current = 1').first();
    if (again) return false;
    throw error;
  }
}
