import type { EventRecord } from '../../features/event/repo';
import { capabilities } from '../../features/event/state-machine';
import type { RankedPizza, Results } from '../../features/results/compute';
import { CRITERIA } from '../../features/voting/criteria';
import { formatScore, ordinal } from '../../utils/format';
import { joinNames, plural } from '../../utils/text';
import { DoughBadge, PizzaImage } from '../components/base';
import { Icon } from '../components/Icon';
import { BigScore, ScoreBars } from '../components/scores';
import { Island, type IslandProps } from '../islands';
import { ParticipantShell } from '../layouts/ParticipantShell';
import { pizzaAlt } from './HomePage';

export interface ResultsPageProps {
  user: { id: string; name: string };
  hasAdmin: boolean;
  event: EventRecord;
  rev: string;
  results: Results | null;
  myProgress: { voted: number; total: number };
  reveal: IslandProps<'RevealShow'> | null;
}

function tieNote(r: RankedPizza): string | null {
  if (r.tied) return 'Pari merito';
  if (r.tieBreak === 'taste') return 'Stessa media: decide il Gusto';
  if (r.tieBreak === 'rewant') return 'Stessa media: decide la Voglia di rimangiarla';
  return null;
}

export function Ranking({ results, linkPrefix = '/pizza/' }: { results: Results; linkPrefix?: string }) {
  return (
    <ol className="ranking">
      {results.ranking.map((r) => (
        <li key={r.version.id} className={`rank${r.position === 1 ? ' rank--first' : ''}`}>
          <div className="rank__head">
            <span className="rank__pos">{r.position ? ordinal(r.position) : '—'}</span>
            <PizzaImage src={r.version.artUrl} alt={pizzaAlt(r.version)} size="s" />
            <div className="rank__title">
              <a className="rank__name" href={`${linkPrefix}${r.version.id}`}>
                {r.version.name}
              </a>
              <span className="rank__meta">
                <DoughBadge dough={r.version.dough} compact />
                <span>{plural(r.scores.votes, '1 voto', `${r.scores.votes} voti`)}</span>
              </span>
            </div>
            <span className="rank__score">{formatScore(r.scores.overall)}</span>
          </div>
          {tieNote(r) ? <span className="rank__tie">{tieNote(r)}</span> : null}
          <ScoreBars scores={r.scores} compact />
        </li>
      ))}
    </ol>
  );
}

export function ResultsBody({ results }: { results: Results }) {
  const winners = results.ranking.filter((r) => r.position === 1);
  const bestRecipes = results.recipes.filter((r) => r.position === 1);
  const doughs = results.doughs.filter((d) => d.pizzas > 0);
  return (
    <>
      <section className="podium-hero" aria-labelledby="best-title">
        <p className="eyebrow" id="best-title">
          Miglior pizza
        </p>
        {winners.map((w) => (
          <div key={w.version.id} className="podium-hero__item">
            <PizzaImage src={w.version.artUrl} alt={pizzaAlt(w.version)} size="xl" eager />
            <h2 className="podium-hero__name">{w.version.name}</h2>
            <p className="podium-hero__by">di {joinNames(w.version.creators.map((c) => c.name)) || '—'}</p>
            {w.version.dough ? <DoughBadge dough={w.version.dough} /> : null}
            <BigScore value={w.scores.overall} />
          </div>
        ))}
        {winners.length > 1 ? <p className="podium-hero__tie">Primo posto a pari merito.</p> : null}
      </section>

      {bestRecipes.length ? (
        <section className="card result-card">
          <h2 className="card__title">Miglior gusto</h2>
          <p className="card__text">Media delle versioni dello stesso gusto con i diversi panetti.</p>
          {bestRecipes.map((r) => (
            <div key={r.recipeId} className="best-recipe">
              <img src={r.artUrl} alt="" width={88} height={88} />
              <div>
                <span className="best-recipe__name">{r.name}</span>
                <span className="best-recipe__by">di {joinNames(r.creators.map((c) => c.name))}</span>
                <ul className="best-recipe__versions">
                  {r.versions.map((v) => (
                    <li key={v.versionId}>
                      <span>{v.dough?.name ?? 'Senza panetto'}</span>
                      <b>{formatScore(v.overall)}</b>
                    </li>
                  ))}
                </ul>
              </div>
              <span className="best-recipe__score">{formatScore(r.score)}</span>
            </div>
          ))}
        </section>
      ) : null}

      {doughs.length >= 2 ? (
        <section className="card result-card">
          <h2 className="card__title">Panetto contro panetto</h2>
          <div className="duel duel--static">
            {doughs.map((d) => (
              <div key={d.dough.id} className={`duel__side duel__side--${d.dough.tone}`}>
                <span className="duel__name">{d.dough.name}</span>
                <span className="duel__score">{formatScore(d.overall)}</span>
                <span className="duel__meta">
                  {results.headToHead.length ? `${d.wins} ${plural(d.wins, 'sfida vinta', 'sfide vinte')} su ${results.headToHead.length}` : `${d.pizzas} pizze`}
                </span>
              </div>
            ))}
          </div>
          <dl className="dough-bars">
            {CRITERIA.map((c) => (
              <div key={c.key} className="dough-bars__row">
                <dt>{c.short}</dt>
                {doughs.map((d) => (
                  <dd key={d.dough.id} className={`dough-bars__val dough-bars__val--${d.dough.tone}`}>
                    <span className="dough-bars__fill" style={{ width: `${((d.criteria[c.key] ?? 0) / 5) * 100}%` }} />
                    <span className="dough-bars__num">{formatScore(d.criteria[c.key], 1)}</span>
                  </dd>
                ))}
              </div>
            ))}
          </dl>
          {results.headToHead.length ? (
            <ul className="h2h">
              {results.headToHead.map((h) => (
                <li key={h.recipeId}>
                  <span className="h2h__name">{h.name}</span>
                  <span className="h2h__winner">{h.winnerDoughId ? `vince ${h.entries.find((e) => e.dough.id === h.winnerDoughId)?.dough.shortName}` : 'pareggio'}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="awards-grid" aria-label="Premi speciali">
        {results.awards.map((a) => (
          <div key={a.key} className="award-card">
            <span className="award-card__label">
              {a.label}
              {a.winners.length > 1 ? <span className="award-card__tie"> · pari merito</span> : null}
            </span>
            {a.winners.length ? (
              <ul className="award-card__who">
                {a.winners.slice(0, 3).map((w) => (
                  <li key={w.version.id}>
                    <span className="award-card__name">{w.version.name}</span>
                    {w.version.dough ? <DoughBadge dough={w.version.dough} compact /> : null}
                  </li>
                ))}
                {a.winners.length > 3 ? <li className="award-card__more">e altre {a.winners.length - 3}</li> : null}
              </ul>
            ) : (
              <span className="award-card__name">—</span>
            )}
            <span className="award-card__value">
              {a.title} {formatScore(a.value, 1)}
            </span>
          </div>
        ))}
      </section>

      <section id="classifica" className="ranking-section" aria-labelledby="ranking-title">
        <h2 className="section-title" id="ranking-title">
          Classifica completa
        </h2>
        <Ranking results={results} />
      </section>

      {results.creators.some((c) => c.score !== null) ? (
        <section className="card result-card">
          <h2 className="card__title">I pizzaioli</h2>
          <p className="card__text">Media dei gusti che ognuno ha firmato.</p>
          <ol className="chefs">
            {results.creators
              .filter((c) => c.score !== null)
              .map((c) => (
                <li key={c.person.id}>
                  <span className="chefs__pos">{c.position ? ordinal(c.position) : '—'}</span>
                  <span className="chefs__name">{c.person.name}</span>
                  <span className="chefs__score">{formatScore(c.score)}</span>
                </li>
              ))}
          </ol>
        </section>
      ) : null}

      <details className="howto">
        <summary>Come si calcola</summary>
        <ul>
          <li>Il punteggio di una pizza è la media dei quattro parametri su tutti i voti ricevuti.</li>
          <li>Il miglior gusto è la media delle sue versioni (una per panetto).</li>
          <li>Il confronto tra panetti fa la media delle pizze fatte con ciascun panetto; le sfide confrontano lo stesso gusto.</li>
          <li>A pari media decide il Gusto, poi la Voglia di rimangiarla. Se resta la parità, la posizione è condivisa. Nessun sorteggio.</li>
          <li>Nei premi speciali, a pari punteggio vince la pizza più in alto in classifica; se sono appaiate anche lì, il premio è condiviso.</li>
          <li>
            Contano {results.totals.votes} voti di {results.totals.voters} {plural(results.totals.voters, 'giudice', 'giudici')}.
          </li>
        </ul>
      </details>
    </>
  );
}

export function ResultsPage({ user, hasAdmin, event, rev, results, myProgress, reveal }: ResultsPageProps) {
  const caps = capabilities(event.status);
  return (
    <ParticipantShell title={`Verdetto · ${event.name}`} user={user} hasAdmin={hasAdmin} nav="verdetto" canCreate={caps.canCreatePizza} resultsVisible={caps.resultsVisible} rev={rev}>
      {results ? (
        <div className="results">
          <header className="results__head">
            <h1 className="page-title">Il verdetto</h1>
            {reveal ? <Island name="RevealShow" props={reveal} /> : null}
          </header>
          <ResultsBody results={results} />
        </div>
      ) : (
        <section className="vault">
          <div className="vault__oven" aria-hidden="true">
            <span className="vault__fire" />
            <span className="vault__lock">
              <Icon name="lock" size={30} />
            </span>
          </div>
          <h1 className="vault__title">I risultati sono ancora segreti.</h1>
          <p className="vault__text">Aspetta il verdetto del pizzaiolo.</p>
          {myProgress.total ? (
            <p className="vault__me">
              Hai votato {myProgress.voted} {plural(myProgress.voted, 'pizza', 'pizze')} su {myProgress.total}.
            </p>
          ) : null}
        </section>
      )}
    </ParticipantShell>
  );
}
