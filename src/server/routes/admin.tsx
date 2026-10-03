/** Rotte dell'area admin. Ogni pagina e ogni API verifica la sessione admin sul server. */
import { requireAdmin } from '../../auth/guards';
import { secretsMatch } from '../../auth/crypto';
import { clearThrottle, ipKey, recordThrottleFailure, throttleState } from '../../auth/rate-limit';
import { createSession, destroySession, readSession } from '../../auth/session';
import { auditStatement, listAudit } from '../../features/audit/repo';
import { changeStatus, resetEvent, setServing, updateSettings, type EventRecord } from '../../features/event/repo';
import { canTransition, STATUS_INFO } from '../../features/event/state-machine';
import { deleteIngredient, ingredientUsage, listCatalog, listUnmatchedLabels, saveIngredient } from '../../features/ingredients/repo';
import { createParticipant, deleteParticipant, generatePins, listParticipants, renameParticipant, setParticipantActive, setParticipantPin } from '../../features/participants/repo';
import { deleteDough, saveDough } from '../../features/pizzas/doughs';
import { listDoughs, listRecipes, listVersions } from '../../features/pizzas/repo';
import { deleteDemoData, deleteRecipe, deleteVersion, moveVersion, savePizza, setVersionDough, setVersionLocked } from '../../features/pizzas/service';
import type { PizzaVersion } from '../../features/pizzas/types';
import { loadAdminPreview } from '../../features/results/repo';
import { adminDeleteVote, adminSaveVote, listAllVotes, simulateDemoVotes } from '../../features/voting/repo';
import { VISUALS, type VisualKey } from '../../pizza-builder/art/visuals';
import { CATEGORIES, LAYER_LABELS, LAYERS } from '../../pizza-builder/types';
import { queryFirst } from '../../database/types';
import { randomSeed } from '../../utils/ids';
import { joinNames, plural } from '../../utils/text';
import { isPast } from '../../utils/time';
import type { IslandProps } from '../../ui/islands';
import { AdminLoginPage } from '../../ui/pages/admin/AdminLoginPage';
import { DashboardPage } from '../../ui/pages/admin/DashboardPage';
import { AdminIngredientsPage, AdminParticipantsPage, AdminPizzaEditPage, AdminPizzasPage, AdminVotesPage } from '../../ui/pages/admin/ManagePages';
import { AdminLogPage, AdminPreviewPage, AdminSettingsPage } from '../../ui/pages/admin/OtherPages';
import { adminPassword, isProduction } from '../env';
import { HttpError, json, readBody, redirect, type Ctx, type Router } from '../http';
import { page } from '../render';
import {
  activeSchema,
  adminVoteSchema,
  doughAssignSchema,
  doughSchema,
  generatePinsSchema,
  ingredientSchema,
  lockSchema,
  moveSchema,
  newParticipantSchema,
  parse,
  pizzaSchema,
  renameSchema,
  resetSchema,
  serveSchema,
  setPinSchema,
  settingsSchema,
  statusSchema,
} from '../validation';
import { eventOf, POPULAR_INGREDIENTS } from './participant';

async function adminContext(c: Ctx) {
  const admin = await requireAdmin(c);
  const event = await eventOf(c);
  return { admin, event, devPassword: !isProduction(c.env) && !c.env.ADMIN_PASSWORD };
}

async function adminRev(c: Ctx, event: EventRecord): Promise<string> {
  const row = await queryFirst<{ n: number; m: string | null }>(c.env.DB, 'SELECT COUNT(*) AS n, MAX(updated_at) AS m FROM votes WHERE event_id = ?', event.id);
  return `${event.revision}.${row?.n ?? 0}.${row?.m ?? ''}`;
}

async function voteStats(c: Ctx, event: EventRecord, versions: PizzaVersion[]) {
  const [participants, votes] = await Promise.all([listParticipants(c.env.DB, { includeInactive: true }), listAllVotes(c.env.DB, event.id)]);
  const active = participants.filter((p) => p.isActive);
  const open = versions.filter((v) => !v.votingLocked);
  const openIds = new Set(open.map((v) => v.id));
  const activeIds = new Set(active.map((p) => p.id));
  const perUser = new Map<string, number>();
  let cast = 0;
  for (const v of votes) {
    if (!openIds.has(v.versionId) || !activeIds.has(v.userId)) continue;
    cast++;
    perUser.set(v.userId, (perUser.get(v.userId) ?? 0) + 1);
  }
  return {
    participants,
    votes,
    active,
    stats: {
      activeParticipants: active.length,
      versions: versions.length,
      openVersions: open.length,
      votesCast: cast,
      votesExpected: active.length * open.length,
      completeParticipants: open.length ? active.filter((p) => (perUser.get(p.id) ?? 0) >= open.length).length : 0,
      totalVotes: votes.length,
      recipes: new Set(versions.map((v) => v.recipeId)).size,
    },
  };
}

function builderProps(
  people: Array<{ id: string; name: string }>,
  doughs: Awaited<ReturnType<typeof listDoughs>>,
  catalog: Awaited<ReturnType<typeof listCatalog>>,
  initial: IslandProps<'PizzaBuilder'>['initial'],
): IslandProps<'PizzaBuilder'> {
  return {
    mode: initial.recipeId ? 'edit' : 'create',
    initial,
    people,
    doughs: doughs.map((d) => ({ id: d.id, name: d.name, shortName: d.shortName, tone: d.tone })),
    catalog: catalog.map(({ isBuiltin: _b, updatedAt: _u, ...def }) => def),
    popular: POPULAR_INGREDIENTS,
    lockedCreatorId: null,
    isAdmin: true,
    saveUrl: '/api/admin/pizzas',
    deleteUrl: initial.recipeId ? `/api/admin/pizzas/${initial.recipeId}/delete` : null,
    doneHref: '/admin/pizze',
  };
}

export function registerAdminRoutes(router: Router): void {
  // ——— Accesso admin ———
  router.get('/admin/login', async (c) => {
    if (await readSession(c, 'admin')) return redirect('/admin');
    const configured = adminPassword(c.env) !== null;
    const code = c.url.searchParams.get('errore');
    const error = code === 'bloccato' ? 'Troppi tentativi: riprova tra qualche minuto.' : code ? 'Password non corretta.' : null;
    const devHint = !isProduction(c.env) && !c.env.ADMIN_PASSWORD ? 'Sviluppo locale: la password è “pizza”.' : null;
    return page(<AdminLoginPage error={error} configured={configured} devHint={devHint} />);
  });

  router.post('/admin/login', async (c) => {
    const expected = adminPassword(c.env);
    if (!expected) return redirect('/admin/login');
    const body = await readBody(c);
    const password = typeof body.password === 'string' ? body.password : '';
    const db = c.env.DB;
    const ip = await ipKey(`admin:${c.clientIp()}`);
    if ((await throttleState(db, ip)).locked || (await throttleState(db, 'admin')).locked) return redirect('/admin/login?errore=bloccato');
    if (!password || !(await secretsMatch(password, expected))) {
      await recordThrottleFailure(db, ip, 'admin');
      await recordThrottleFailure(db, 'admin', 'admin');
      return redirect('/admin/login?errore=1');
    }
    await clearThrottle(db, ip);
    const admin = await queryFirst<{ id: string; display_name: string }>(db, `SELECT id, display_name FROM users WHERE role = 'ADMIN' AND is_active = 1 ORDER BY created_at LIMIT 1`);
    if (!admin) throw new HttpError(500, 'Account admin mancante.');
    await createSession(c, { id: admin.id, name: admin.display_name, role: 'ADMIN' }, 'admin');
    const event = await eventOf(c);
    await auditStatement(db, { eventId: event.id, actor: { id: admin.id, name: admin.display_name }, action: 'auth.admin_login' }).run();
    return redirect('/admin');
  });

  router.post('/admin/esci', async (c) => {
    await destroySession(c, 'admin');
    return redirect('/admin/login');
  });

  router.get('/api/admin/live', async (c) => {
    await requireAdmin(c);
    return json({ rev: await adminRev(c, await eventOf(c)) });
  });

  // ——— Pagine ———
  router.get('/admin', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const db = c.env.DB;
    const versions = await listVersions(db, event.id, event.catalogRev);
    const [{ stats, participants }, unmatched, rev] = await Promise.all([voteStats(c, event, versions), listUnmatchedLabels(db, event.id), adminRev(c, event)]);
    const serving = event.servingVersionId ? versions.find((v) => v.id === event.servingVersionId) ?? null : null;
    const nextToServe = serving ? versions.find((v) => v.tastingOrder > serving.tastingOrder) ?? null : versions[0] ?? null;
    const noPin = participants.filter((p) => p.isActive && !p.hasPin).length;
    const noDough = versions.filter((v) => !v.dough).length;
    const checklist: Array<{ tone: 'warn' | 'info'; text: string; href: string; action: string }> = [];
    if (noPin) checklist.push({ tone: 'warn', text: `${noPin} ${plural(noPin, 'partecipante senza PIN', 'partecipanti senza PIN')}`, href: '/admin/partecipanti', action: 'Genera PIN' });
    if (!versions.length) checklist.push({ tone: 'info', text: 'Nessuna pizza in carta', href: '/admin/pizze/nuova', action: 'Crea pizza' });
    if (noDough) checklist.push({ tone: 'warn', text: `${noDough} ${plural(noDough, 'pizza senza panetto', 'pizze senza panetto')}`, href: '/admin/pizze', action: 'Assegna' });
    if (unmatched.length) checklist.push({ tone: 'info', text: `${unmatched.length} ${plural(unmatched.length, 'ingrediente senza grafica', 'ingredienti senza grafica')}`, href: '/admin/ingredienti', action: 'Disegna' });
    const demoCount = (await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM pizza_recipes WHERE event_id = ? AND is_demo = 1', event.id))?.n ?? 0;
    return page(
      <DashboardPage
        event={event}
        rev={rev}
        devPassword={devPassword}
        appUrl={c.url.origin}
        stats={stats}
        serving={serving ? { id: serving.id, name: serving.name, tastingOrder: serving.tastingOrder, artUrl: serving.artUrl } : null}
        nextToServe={nextToServe && nextToServe.id !== serving?.id ? { id: nextToServe.id, name: nextToServe.name, tastingOrder: nextToServe.tastingOrder } : null}
        checklist={checklist}
        demoCount={demoCount}
      />,
    );
  });

  router.get('/admin/pizze', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const db = c.env.DB;
    const versions = await listVersions(db, event.id, event.catalogRev);
    const [{ votes, active }, doughs, rev] = await Promise.all([voteStats(c, event, versions), listDoughs(db, event.id), adminRev(c, event)]);
    const count = new Map<string, number>();
    for (const v of votes) count.set(v.versionId, (count.get(v.versionId) ?? 0) + 1);
    return page(
      <AdminPizzasPage
        event={event}
        rev={rev}
        devPassword={devPassword}
        manager={{
          versions: versions.map((v) => ({
            id: v.id,
            recipeId: v.recipeId,
            name: v.name,
            artUrl: v.artUrl,
            doughId: v.dough?.id ?? null,
            tastingOrder: v.tastingOrder,
            votingLocked: v.votingLocked,
            votes: count.get(v.id) ?? 0,
            isDemo: v.isDemo,
            creators: joinNames(v.creators.map((p) => p.name)),
            unknownIngredients: v.ingredients.filter((i) => !i.ingredientId).length,
          })),
          doughs: doughs.map((d) => ({ id: d.id, name: d.name })),
          servingId: event.servingVersionId,
          participants: active.length,
        }}
      />,
    );
  });

  async function adminBuilder(c: Ctx, recipeId: string | null) {
    const { event, devPassword } = await adminContext(c);
    const db = c.env.DB;
    const [people, doughs, catalog, rev] = await Promise.all([listParticipants(db), listDoughs(db, event.id), listCatalog(db), adminRev(c, event)]);
    let initial: IslandProps<'PizzaBuilder'>['initial'] = { recipeId: null, name: '', description: '', creatorIds: [], ingredients: [], doughIds: doughs.map((d) => d.id), artSeed: randomSeed() };
    if (recipeId) {
      const [recipe] = await listRecipes(db, event.id, event.catalogRev, recipeId);
      if (!recipe) throw new HttpError(404, 'Pizza non trovata.');
      initial = {
        recipeId,
        name: recipe.name,
        description: recipe.description ?? '',
        creatorIds: recipe.creators.map((p) => p.id),
        ingredients: recipe.ingredients.map((i) => i.label),
        doughIds: recipe.versions.map((v) => v.dough?.id).filter((x): x is string => !!x),
        artSeed: recipe.artSeed,
      };
    }
    return page(<AdminPizzaEditPage event={event} rev={rev} devPassword={devPassword} builder={builderProps(people.map((p) => ({ id: p.id, name: p.name })), doughs, catalog, initial)} />);
  }
  router.get('/admin/pizze/nuova', (c) => adminBuilder(c, null));
  router.get('/admin/pizze/:id', (c) => adminBuilder(c, c.params.id ?? null));

  router.get('/admin/partecipanti', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const versions = await listVersions(c.env.DB, event.id, event.catalogRev);
    const [{ participants, votes }, rev] = await Promise.all([voteStats(c, event, versions), adminRev(c, event)]);
    const count = new Map<string, number>();
    for (const v of votes) count.set(v.userId, (count.get(v.userId) ?? 0) + 1);
    return page(
      <AdminParticipantsPage
        event={event}
        rev={rev}
        devPassword={devPassword}
        manager={{
          participants: participants.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, hasPin: p.hasPin, lastLoginAt: p.lastLoginAt, votes: count.get(p.id) ?? 0, locked: !!p.lockedUntil && !isPast(p.lockedUntil) })),
          totalVersions: versions.length,
          appUrl: c.url.origin,
        }}
      />,
    );
  });

  router.get('/admin/voti', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const versions = await listVersions(c.env.DB, event.id, event.catalogRev);
    const [{ participants, votes, stats }, rev] = await Promise.all([voteStats(c, event, versions), adminRev(c, event)]);
    return page(
      <AdminVotesPage
        event={event}
        rev={rev}
        devPassword={devPassword}
        summary={{ cast: stats.votesCast, expected: stats.votesExpected, complete: stats.completeParticipants, active: stats.activeParticipants }}
        board={{
          participants: participants.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive })),
          versions: versions.map((v) => ({ id: v.id, tastingOrder: v.tastingOrder, name: v.name, doughShort: v.dough?.shortName ?? null, votingLocked: v.votingLocked })),
          votes: votes.map((v) => ({ id: v.id, userId: v.userId, versionId: v.versionId, taste: v.taste, rewant: v.rewant, idea: v.idea, smell: v.smell, updatedAt: v.updatedAt, adminEdit: v.adminEdit })),
        }}
      />,
    );
  });

  router.get('/admin/ingredienti', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const db = c.env.DB;
    const [catalog, unmatched, usage, rev] = await Promise.all([listCatalog(db), listUnmatchedLabels(db, event.id), ingredientUsage(db, event.id), adminRev(c, event)]);
    return page(
      <AdminIngredientsPage
        event={event}
        rev={rev}
        devPassword={devPassword}
        manager={{
          catalog: catalog.map(({ updatedAt: _u, ...def }) => ({ ...def, uses: usage.get(def.id) ?? 0 })),
          unmatched,
          visuals: (Object.keys(VISUALS) as VisualKey[]).map((key) => ({ key, label: VISUALS[key].label, defaultColors: VISUALS[key].defaultColors })),
          categories: Object.entries(CATEGORIES).map(([key, label]) => ({ key, label })),
          layers: LAYERS.map((key) => ({ key, label: LAYER_LABELS[key] })),
        }}
      />,
    );
  });

  router.get('/admin/registro', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const [rows, rev] = await Promise.all([listAudit(c.env.DB, event.id), adminRev(c, event)]);
    return page(<AdminLogPage event={event} rev={rev} devPassword={devPassword} rows={rows} />);
  });

  router.get('/admin/impostazioni', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const db = c.env.DB;
    const [doughs, versions, rev] = await Promise.all([listDoughs(db, event.id), listVersions(db, event.id, event.catalogRev), adminRev(c, event)]);
    const votes = (await queryFirst<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM votes WHERE event_id = ?', event.id))?.n ?? 0;
    return page(
      <AdminSettingsPage
        event={event}
        rev={rev}
        devPassword={devPassword}
        settings={{
          eventName: event.name,
          showNamesOnLogin: event.showNamesOnLogin,
          doughs: doughs.map((d) => ({ id: d.id, name: d.name, shortName: d.shortName, tone: d.tone, versions: versions.filter((v) => v.dough?.id === d.id).length })),
        }}
        reset={{ votes, pizzas: new Set(versions.map((v) => v.recipeId)).size }}
      />,
    );
  });

  router.get('/admin/anteprima', async (c) => {
    const { event, devPassword } = await adminContext(c);
    const versions = await listVersions(c.env.DB, event.id, event.catalogRev);
    const [results, rev] = await Promise.all([loadAdminPreview(c.env.DB, event.id, versions), adminRev(c, event)]);
    return page(<AdminPreviewPage event={event} rev={rev} devPassword={devPassword} results={results} />);
  });

  // ——— API admin ———
  const api = (path: string, handler: (c: Ctx, ctx: { admin: { id: string; name: string }; event: EventRecord; body: Record<string, unknown> }) => Promise<Response>) => {
    router.post(path, async (c) => {
      const admin = await requireAdmin(c);
      const [event, body] = await Promise.all([eventOf(c), readBody(c)]);
      return handler(c, { admin, event, body });
    });
  };

  api('/api/admin/status', async (c, { admin, event, body }) => {
    const { to } = parse(statusSchema, body);
    if (to === 'RESULTS_REVEALED') throw new HttpError(400, 'Per rivelare i risultati usa il pulsante “Rivela risultati”.');
    await changeStatus(c.env.DB, event, to, admin);
    return json({ ok: true, message: `Stato: ${STATUS_INFO[to].label}` });
  });

  api('/api/admin/reveal', async (c, { admin, event }) => {
    if (event.status === 'RESULTS_REVEALED') return json({ ok: true });
    if (!canTransition(event.status, 'RESULTS_REVEALED')) throw new HttpError(409, 'Prima apri e chiudi le votazioni.');
    await changeStatus(c.env.DB, event, 'RESULTS_REVEALED', admin);
    return json({ ok: true, message: 'Risultati rivelati a tutti' });
  });

  api('/api/admin/serve', async (c, { admin, event, body }) => {
    const { versionId } = parse(serveSchema, body);
    let name: string | null = null;
    if (versionId) {
      const row = await queryFirst<{ name: string }>(c.env.DB, 'SELECT r.name FROM pizza_versions v JOIN pizza_recipes r ON r.id = v.recipe_id WHERE v.id = ? AND v.event_id = ?', versionId, event.id);
      if (!row) throw new HttpError(404, 'Pizza non trovata.');
      name = row.name;
    }
    await setServing(c.env.DB, event, versionId, name, admin);
    return json({ ok: true });
  });

  api('/api/admin/participants', async (c, { admin, event, body }) => {
    const input = parse(newParticipantSchema, body);
    const created = await createParticipant(c.env.DB, event.id, input.name, input.pin ?? null, c.env.PIN_PEPPER ?? '', admin);
    return json({ ok: true, ...created });
  });

  api('/api/admin/participants/pins', async (c, { admin, event, body }) => {
    const { onlyMissing } = parse(generatePinsSchema, body);
    const pins = await generatePins(c.env.DB, event.id, onlyMissing, c.env.PIN_PEPPER ?? '', admin);
    return json({ ok: true, pins: pins.map(({ name, pin }) => ({ name, pin })) });
  });

  api('/api/admin/participants/:id/rename', async (c, { admin, event, body }) => {
    const { name } = parse(renameSchema, body);
    await renameParticipant(c.env.DB, event.id, c.params.id ?? '', name, admin);
    return json({ ok: true });
  });

  api('/api/admin/participants/:id/pin', async (c, { admin, event, body }) => {
    const { pin } = parse(setPinSchema, body);
    const finalPin = await setParticipantPin(c.env.DB, event.id, c.params.id ?? '', pin ?? null, c.env.PIN_PEPPER ?? '', admin);
    return json({ ok: true, pin: finalPin });
  });

  api('/api/admin/participants/:id/active', async (c, { admin, event, body }) => {
    const { active } = parse(activeSchema, body);
    await setParticipantActive(c.env.DB, event.id, c.params.id ?? '', active, admin);
    return json({ ok: true });
  });

  api('/api/admin/participants/:id/delete', async (c, { admin, event }) => {
    const votes = await deleteParticipant(c.env.DB, event.id, c.params.id ?? '', admin);
    return json({ ok: true, votes });
  });

  api('/api/admin/pizzas', async (c, { admin, event, body }) => {
    const input = parse(pizzaSchema, body);
    const result = await savePizza({ db: c.env.DB, event, actor: admin, isAdmin: true }, input);
    return json({ ok: true, ...result });
  });

  api('/api/admin/pizzas/:id/delete', async (c, { admin, event }) => {
    const votes = await deleteRecipe({ db: c.env.DB, event, actor: admin, isAdmin: true }, c.params.id ?? '');
    return json({ ok: true, votes });
  });

  api('/api/admin/versions/:id/move', async (c, { admin, event, body }) => {
    const { direction } = parse(moveSchema, body);
    await moveVersion({ db: c.env.DB, event, actor: admin, isAdmin: true }, c.params.id ?? '', direction);
    return json({ ok: true });
  });

  api('/api/admin/versions/:id/dough', async (c, { admin, event, body }) => {
    const { doughId } = parse(doughAssignSchema, body);
    await setVersionDough({ db: c.env.DB, event, actor: admin, isAdmin: true }, c.params.id ?? '', doughId);
    return json({ ok: true });
  });

  api('/api/admin/versions/:id/lock', async (c, { admin, event, body }) => {
    const { locked } = parse(lockSchema, body);
    await setVersionLocked({ db: c.env.DB, event, actor: admin, isAdmin: true }, c.params.id ?? '', locked);
    return json({ ok: true });
  });

  api('/api/admin/versions/:id/delete', async (c, { admin, event }) => {
    const votes = await deleteVersion({ db: c.env.DB, event, actor: admin, isAdmin: true }, c.params.id ?? '');
    return json({ ok: true, votes });
  });

  api('/api/admin/votes', async (c, { admin, event, body }) => {
    const input = parse(adminVoteSchema, body);
    await adminSaveVote(c.env.DB, event, admin, input.userId, input.versionId, input.scores);
    return json({ ok: true });
  });

  api('/api/admin/votes/:id/delete', async (c, { admin, event }) => {
    await adminDeleteVote(c.env.DB, event, admin, c.params.id ?? '');
    return json({ ok: true });
  });

  api('/api/admin/ingredients', async (c, { admin, event, body }) => {
    const input = parse(ingredientSchema, body);
    const result = await saveIngredient(
      c.env.DB,
      input,
      auditStatement(c.env.DB, { eventId: event.id, actor: admin, action: 'ingredient.saved', entity: 'ingredient', entityId: input.id ?? undefined, details: { name: input.name, visual: input.visual } }),
    );
    return json({ ok: true, ...result });
  });

  api('/api/admin/ingredients/:id/delete', async (c, { admin, event }) => {
    const id = c.params.id ?? '';
    await deleteIngredient(c.env.DB, id, auditStatement(c.env.DB, { eventId: event.id, actor: admin, action: 'ingredient.deleted', entity: 'ingredient', entityId: id, details: { name: id } }));
    return json({ ok: true });
  });

  api('/api/admin/demo/simulate', async (c, { admin, event }) => {
    const n = await simulateDemoVotes(c.env.DB, event, admin);
    return json({ ok: true, message: n ? `${n} voti demo inseriti` : 'I voti demo ci sono già' });
  });

  api('/api/admin/demo/delete', async (c, { admin, event }) => {
    const n = await deleteDemoData({ db: c.env.DB, event, actor: admin, isAdmin: true });
    return json({ ok: true, message: `${n} ${plural(n, 'gusto demo cancellato', 'gusti demo cancellati')}` });
  });

  api('/api/admin/reset', async (c, { admin, event, body }) => {
    const input = parse(resetSchema, body);
    if (input.confirm.trim().toUpperCase() !== 'RESET') throw new HttpError(400, 'Per confermare scrivi RESET.');
    const result = await resetEvent(c.env.DB, event, { deletePizzas: input.deletePizzas }, admin);
    return json({ ok: true, ...result });
  });

  api('/api/admin/settings', async (c, { admin, event, body }) => {
    const input = parse(settingsSchema, body);
    await updateSettings(c.env.DB, event, input, admin);
    return json({ ok: true });
  });

  api('/api/admin/doughs', async (c, { admin, event, body }) => {
    const input = parse(doughSchema, body);
    const id = await saveDough(c.env.DB, event.id, input, admin);
    return json({ ok: true, id });
  });

  api('/api/admin/doughs/:id/delete', async (c, { admin, event }) => {
    await deleteDough(c.env.DB, event.id, c.params.id ?? '', admin);
    return json({ ok: true });
  });
}
