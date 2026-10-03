/** Validazione lato server di tutto ciò che arriva dai browser. */
import { z } from 'zod';
import { EVENT_STATUSES } from '../features/event/state-machine';
import { isVisualKey } from '../pizza-builder/art/visuals';
import { CATEGORIES, LAYERS } from '../pizza-builder/types';
import { HttpError } from './http';

const id = z.string().uuid('Identificativo non valido.');
const score = z.number({ invalid_type_error: 'Ogni voto deve essere un numero.' }).int('Niente mezzi punti: solo numeri interi.').min(1, 'Il voto minimo è 1.').max(5, 'Il voto massimo è 5.');

export const personName = z
  .string()
  .trim()
  .min(1, 'Scrivi un nome.')
  .max(40, 'Nome troppo lungo (massimo 40 caratteri).')
  .regex(/^[\p{L}\p{N} '’.-]+$/u, 'Usa solo lettere, numeri e spazi.');

export const pin = z.string().regex(/^\d{4}$/, 'Il PIN deve avere 4 cifre.');

export const loginSchema = z
  .object({ userId: id.optional(), name: z.string().trim().max(40).optional(), pin })
  .refine((d) => !!d.userId || !!d.name, 'Chi sei?');

export const scoresSchema = z.object({ taste: score, rewant: score, idea: score, smell: score }, { required_error: 'Mancano dei voti.' });

export const voteSchema = z.object({ versionId: id, scores: scoresSchema });

export const pizzaSchema = z.object({
  recipeId: id.nullable().optional(),
  name: z.string().trim().min(1, 'Dai un nome alla pizza.').max(60, 'Nome troppo lungo (massimo 60 caratteri).'),
  description: z.string().max(280, 'Descrizione troppo lunga (massimo 280 caratteri).').nullable().optional(),
  creatorIds: z.array(id).max(20),
  ingredients: z.array(z.string().trim().min(1).max(48, 'Un ingrediente ha un nome troppo lungo.')).min(1, 'Aggiungi almeno un ingrediente.').max(20, 'Massimo 20 ingredienti.'),
  doughIds: z.array(id).max(10),
  artSeed: z.number().int().min(0).max(2147483647).optional(),
  confirmVoteLoss: z.boolean().optional(),
});

export const statusSchema = z.object({ to: z.enum(EVENT_STATUSES) });
export const serveSchema = z.object({ versionId: id.nullable() });
export const newParticipantSchema = z.object({ name: personName, pin: pin.optional() });
export const renameSchema = z.object({ name: personName });
export const setPinSchema = z.object({ pin: pin.optional() });
export const activeSchema = z.object({ active: z.boolean() });
export const generatePinsSchema = z.object({ onlyMissing: z.boolean().default(true) });
export const moveSchema = z.object({ direction: z.enum(['up', 'down']) });
export const doughAssignSchema = z.object({ doughId: id.nullable() });
export const lockSchema = z.object({ locked: z.boolean() });
export const adminVoteSchema = z.object({ userId: id, versionId: id, scores: scoresSchema });
export const resetSchema = z.object({ confirm: z.string(), deletePizzas: z.boolean().default(false) });
export const settingsSchema = z.object({ name: z.string().trim().min(1, 'Dai un nome alla serata.').max(60), showNamesOnLogin: z.boolean() });
export const doughSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, 'Dai un nome al panetto.').max(40),
  shortName: z.string().trim().min(1).max(24),
  tone: z.enum(['pomodoro', 'basilico', 'legno', 'forno']).default('legno'),
});

export const ingredientSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/).nullable().optional(),
  name: z.string().trim().min(1, 'Dai un nome all’ingrediente.').max(40),
  aliases: z.array(z.string().trim().min(1).max(48)).max(30),
  category: z.enum(Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...Array<keyof typeof CATEGORIES>]),
  visual: z.string().refine(isVisualKey, 'Aspetto grafico non valido.'),
  layer: z.enum(LAYERS),
  density: z.number().min(0.2).max(3),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido.')).min(1).max(3),
});

/** Valida o risponde 400 con un messaggio leggibile. */
export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data as z.infer<S>;
  const issue = result.error.issues[0];
  throw new HttpError(400, issue?.message && !issue.message.startsWith('Expected') && !issue.message.startsWith('Required') ? issue.message : 'Dati non validi.', 'INVALID');
}
