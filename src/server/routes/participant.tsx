/** Rotte dei partecipanti: accesso, pizze, voto, creazione, risultati. */
import { currentAdmin, requireParticipant, safeNext } from '../../auth/guards';
import { verifyPin } from '../../auth/crypto';
import { ipKey, recordThrottleFailure, recordUserFailure, recordUserSuccess, throttleState, userLockState } from '../../auth/rate-limit';
import { createSession, destroySession, readSession } from '../../auth/session';
import { getCurrentEvent, type EventRecord } from '../../features/event/repo';
import { capabilities } from '../../features/event/state-machine';
import { listCatalog } from '../../features/ingredients/repo';
import { findLoginUser, listParticipants } from '../../features/participants/repo';
import { listDoughs, listVersions } from '../../features/pizzas/repo';
import { deleteRecipe, savePizza } from '../../features/pizzas/service';
import type { PizzaVersion } from '../../features/pizzas/types';
import { loadRevealedResults } from '../../features/results/repo';
import type { Results } from '../../features/results/compute';
import { getMyVote, listMyVotes, saveMyVote } from '../../features/voting/repo';
import { randomSeed } from '../../utils/ids';
import { joinNames } from '../../utils/text';
import { CreatePage } from '../../ui/pages/CreatePage';
import { HomePage } from '../../ui/pages/HomePage';
import { LoginPage } from '../../ui/pages/LoginPage';
import { OfflinePage } from '../../ui/pages/ErrorPage';
import { PizzaPage } from '../../ui/pages/PizzaPage';
import { ResultsPage } from '../../ui/pages/ResultsPage';
import type { IslandProps } from '../../ui/islands';
import { HttpError, json, readBody, redirect, RedirectSignal, type Ctx, type Router } from '../http';
import { page } from '../render';
import { loginSchema, parse, pizzaSchema, voteSchema } from '../validation';

export const POPULAR_INGREDIENTS = ['pomodoro', 'fior-di-latte', 'bufala', 'basilico', 'olio', 'parmigiano', 'provola', 'salsiccia', 'friarielli', 'funghi', 'pomodorini', 'burrata', 'prosciutto', 'mortadella', 'pistacchio', 'rucola', 'olive-nere', 'peperoncino'];

export const SEEN_REVEAL_COOKIE = 'pc_verdetto';

export function eventOf(c: Ctx): Promise<EventRecord> {
  return c.once('event', () => getCurrentEvent(c.env.DB));
}

async function participantContext(c: Ctx) {
  const user = await requireParticipant(c);
  const [event, admin] = await Promise.all([eventOf(c), currentAdmin(c)]);
  return { user, event, hasAdmin: !!admin, rev: String(event.revision) };
}

function revealProps(c: Ctx, event: EventRecord, results: Results): IslandProps<'RevealShow'> {
  const toReveal = (v: PizzaVersion, score: number | null) => ({
    id: v.id,
    name: v.name,
    creators: joinNames(v.creators.map((p) => p.name)) || '—',
    dough: v.dough ? { name: v.dough.name, short: v.dough.shortName, tone: v.dough.tone } : null,
    artUrl: v.artUrl,
    score,
  });
  const positions = [...new Set(results.ranking.map((r) => r.position).filter((p): p is number => p !== null && p <= 3))].sort((a, b) => a - b);
  const revealKey = `${event.id}:${event.revealedAt ?? ''}`;
  return {
    seenCookie: SEEN_REVEAL_COOKIE,
    revealKey,
    initiallyOpen: c.cookies.get(SEEN_REVEAL_COOKIE) !== revealKey,
    doughs: results.doughs.map((d) => ({ name: d.dough.name, tone: d.dough.tone, overall: d.overall, wins: d.wins, pizzas: d.pizzas })),
    headToHeadCount: results.headToHead.length,
    awards: results.awards.map((a) => ({ label: a.label, title: a.title, value: a.value, winners: a.winners.map((w) => toReveal(w.version, w.scores[a.key])) })),
    bestRecipes: results.recipes
      .filter((r) => r.position === 1)
      .map((r) => ({ name: r.name, creators: joinNames(r.creators.map((p) => p.name)) || '—', artUrl: r.artUrl, score: r.score, versions: r.versions.map((v) => ({ doughName: v.dough?.name ?? 'Senza panetto', overall: v.overall })) })),
    podium: positions.map((position) => {
      const at = results.ranking.filter((r) => r.position === position);
      return { position, tied: at.length > 1, pizzas: at.map((r) => toReveal(r.version, r.scores.overall)) };
    }),
    totals: { votes: results.totals.votes, voters: results.totals.voters },
  };
}

export function registerParticipantRoutes(router: Router): void {
  // ——— Accesso ———
  router.get('/accedi', async (c) => {
    if (await readSession(c, 'participant')) return redirect(safeNext(c.url.searchParams.get('next')));
    const event = await eventOf(c);
    const people = event.showNamesOnLogin ? (await listParticipants(c.env.DB)).filter((p) => p.hasPin).map((p) => ({ id: p.id, name: p.name })) : [];
    return page(<LoginPage eventName={event.name} people={people} showNames={event.showNamesOnLogin} next={safeNext(c.url.searchParams.get('next'))} />);
  });

  router.post('/api/login', async (c) => {
    const input = parse(loginSchema, await readBody(c));
    const db = c.env.DB;
    const ip = await ipKey(c.clientIp());
    const ipState = await throttleState(db, ip);
    if (ipState.locked) throw new HttpError(429, `Troppi tentativi da questo dispositivo. Riprova tra ${Math.ceil(ipState.retryAfter / 60)} minuti.`, 'LOCKED', { retryAfter: ipState.retryAfter });

    const user = await findLoginUser(db, { id: input.userId, name: input.name });
    if (!user) {
      await recordThrottleFailure(db, ip, 'ip');
      throw new HttpError(401, 'Nome o PIN non corretti.', 'BAD_LOGIN');
    }
    const lock = userLockState(user);
    if (lock.locked) throw new HttpError(429, `Troppi tentativi. Riprova tra ${lock.retryAfter} secondi.`, 'LOCKED', { retryAfter: lock.retryAfter });
    if (!user.pin_hash) throw new HttpError(401, 'Il tuo PIN non è ancora pronto: chiedilo all’organizzatore.', 'NO_PIN');

    if (!(await verifyPin(input.pin, user.pin_hash, c.env.PIN_PEPPER ?? ''))) {
      await recordThrottleFailure(db, ip, 'ip');
      const { attemptsLeft, lockedFor } = await recordUserFailure(db, user.id);
      if (lockedFor) throw new HttpError(429, `Troppi tentativi. Riprova tra ${lockedFor} secondi.`, 'LOCKED', { retryAfter: lockedFor });
      throw new HttpError(401, attemptsLeft <= 2 ? `PIN errato. Ancora ${attemptsLeft} ${attemptsLeft === 1 ? 'tentativo' : 'tentativi'} prima di una pausa.` : 'PIN errato. Riprova.', 'BAD_PIN', { attemptsLeft });
    }
    await recordUserSuccess(db, user.id);
    await createSession(c, { id: user.id, name: user.display_name, role: 'PARTICIPANT' }, 'participant');
    return json({ ok: true });
  });

  router.post('/esci', async (c) => {
    await destroySession(c, 'participant');
    return redirect('/accedi');
  });

  router.get('/api/live', async (c) => {
    await requireParticipant(c);
    const event = await eventOf(c);
    return json({ rev: String(event.revision) });
  });

  // ——— Pizze ———
  router.get('/', async (c) => {
    const { user, event, hasAdmin, rev } = await participantContext(c);
    const [versions, myVotes] = await Promise.all([listVersions(c.env.DB, event.id, event.catalogRev), listMyVotes(c.env.DB, event.id, user.id)]);
    const mine = new Map<string, { id: string; name: string; artUrl: string }>();
    for (const v of versions) if (v.creators.some((p) => p.id === user.id)) mine.set(v.recipeId, { id: v.recipeId, name: v.name, artUrl: v.artUrl });
    return page(
      <HomePage
        user={user}
        hasAdmin={hasAdmin}
        event={event}
        rev={rev}
        versions={versions.map((v) => ({ ...v, voted: myVotes.has(v.id) }))}
        myRecipes={[...mine.values()]}
        justVotedId={c.url.searchParams.get('votata')}
      />,
    );
  });

  router.get('/pizza/:id', async (c) => {
    const { user, event, hasAdmin, rev } = await participantContext(c);
    const versions = await listVersions(c.env.DB, event.id, event.catalogRev);
    const index = versions.findIndex((v) => v.id === c.params.id);
    const version = versions[index];
    if (!version) throw new HttpError(404, 'Questa pizza non esiste (o è stata tolta dal menù).');
    const myVote = await getMyVote(c.env.DB, event.id, user.id, version.id);
    const twin = versions.find((v) => v.recipeId === version.recipeId && v.id !== version.id) ?? null;
    let result = null;
    if (capabilities(event.status).resultsVisible) {
      const results = await loadRevealedResults(c.env.DB, event, versions);
      const ranked = results?.ranking.find((r) => r.version.id === version.id);
      if (results && ranked) {
        result = { ranked, total: results.ranking.filter((r) => r.position !== null).length, twin: twin ? results.ranking.find((r) => r.version.id === twin.id) ?? null : null };
      }
    }
    return page(
      <PizzaPage
        user={user}
        hasAdmin={hasAdmin}
        event={event}
        rev={rev}
        version={version}
        myVote={myVote ? { taste: myVote.taste, rewant: myVote.rewant, idea: myVote.idea, smell: myVote.smell } : null}
        twin={twin}
        prev={versions[index - 1] ?? null}
        next={versions[index + 1] ?? null}
        result={result}
        canEdit={capabilities(event.status).canCreatePizza && version.creators.some((p) => p.id === user.id)}
      />,
    );
  });

  router.post('/api/votes', async (c) => {
    const user = await requireParticipant(c);
    const input = parse(voteSchema, await readBody(c));
    const event = await eventOf(c);
    const result = await saveMyVote(c.env.DB, event, user, input.versionId, input.scores);
    return json({ ok: true, created: result.created });
  });

  // ——— Crea la tua pizza ———
  async function builderPage(c: Ctx, recipeId: string | null) {
    const { user, event, hasAdmin, rev } = await participantContext(c);
    if (!capabilities(event.status).canCreatePizza) throw new RedirectSignal('/');
    const db = c.env.DB;
    const [people, doughs, catalog, versions] = await Promise.all([listParticipants(db), listDoughs(db, event.id), listCatalog(db), listVersions(db, event.id, event.catalogRev)]);
    let initial: IslandProps<'PizzaBuilder'>['initial'] = { recipeId: null, name: '', description: '', creatorIds: [user.id], ingredients: [], doughIds: doughs.map((d) => d.id), artSeed: randomSeed() };
    if (recipeId) {
      const own = versions.filter((v) => v.recipeId === recipeId);
      const first = own[0];
      if (!first) throw new HttpError(404, 'Pizza non trovata.');
      if (!first.creators.some((p) => p.id === user.id)) throw new HttpError(403, 'Puoi modificare solo le pizze che hai creato tu.');
      const seedRow = await db.prepare('SELECT art_seed FROM pizza_recipes WHERE id = ?').bind(recipeId).first<{ art_seed: number }>();
      initial = {
        recipeId,
        name: first.name,
        description: first.description ?? '',
        creatorIds: first.creators.map((p) => p.id),
        ingredients: first.ingredients.map((i) => i.label),
        doughIds: own.map((v) => v.dough?.id).filter((x): x is string => !!x),
        artSeed: seedRow?.art_seed ?? 1,
      };
    }
    return page(
      <CreatePage
        user={user}
        hasAdmin={hasAdmin}
        event={event}
        rev={rev}
        builder={{
          mode: recipeId ? 'edit' : 'create',
          initial,
          people: people.map((p) => ({ id: p.id, name: p.name })),
          doughs: doughs.map((d) => ({ id: d.id, name: d.name, shortName: d.shortName, tone: d.tone })),
          catalog: catalog.map(({ isBuiltin: _b, updatedAt: _u, ...def }) => def),
          popular: POPULAR_INGREDIENTS,
          lockedCreatorId: user.id,
          isAdmin: false,
          saveUrl: '/api/pizzas',
          deleteUrl: recipeId ? `/api/pizzas/${recipeId}/delete` : null,
          doneHref: '/',
        }}
      />,
    );
  }

  router.get('/crea', (c) => builderPage(c, null));
  router.get('/crea/:id', (c) => builderPage(c, c.params.id ?? null));

  router.post('/api/pizzas', async (c) => {
    const user = await requireParticipant(c);
    const input = parse(pizzaSchema, await readBody(c));
    const event = await eventOf(c);
    const result = await savePizza({ db: c.env.DB, event, actor: user, isAdmin: false }, { ...input, artSeed: input.artSeed, confirmVoteLoss: false });
    return json({ ok: true, ...result });
  });

  router.post('/api/pizzas/:id/delete', async (c) => {
    const user = await requireParticipant(c);
    const event = await eventOf(c);
    await deleteRecipe({ db: c.env.DB, event, actor: user, isAdmin: false }, c.params.id ?? '');
    return json({ ok: true });
  });

  // ——— Risultati ———
  router.get('/risultati', async (c) => {
    const { user, event, hasAdmin, rev } = await participantContext(c);
    const db = c.env.DB;
    const [versions, myVotes] = await Promise.all([listVersions(db, event.id, event.catalogRev), listMyVotes(db, event.id, user.id)]);
    const results = await loadRevealedResults(db, event, versions);
    const open = versions.filter((v) => !v.votingLocked);
    return page(
      <ResultsPage
        user={user}
        hasAdmin={hasAdmin}
        event={event}
        rev={rev}
        results={results}
        myProgress={{ voted: open.filter((v) => myVotes.has(v.id)).length, total: open.length }}
        reveal={results ? revealProps(c, event, results) : null}
      />,
    );
  });

  router.get('/offline', () => page(<OfflinePage />));
}
