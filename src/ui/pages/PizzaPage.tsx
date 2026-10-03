import type { EventRecord } from '../../features/event/repo';
import { capabilities } from '../../features/event/state-machine';
import type { PizzaVersion } from '../../features/pizzas/types';
import type { RankedPizza } from '../../features/results/compute';
import type { Scores } from '../../features/voting/criteria';
import { ordinal } from '../../utils/format';
import { joinNames } from '../../utils/text';
import { cx, DoughBadge, IngredientChips, PizzaImage, Ticket } from '../components/base';
import { Icon } from '../components/Icon';
import { BigScore, ScoreBars } from '../components/scores';
import { Island } from '../islands';
import { ParticipantShell } from '../layouts/ParticipantShell';
import { pizzaAlt } from './HomePage';

export interface PizzaPageProps {
  user: { id: string; name: string };
  hasAdmin: boolean;
  event: EventRecord;
  rev: string;
  version: PizzaVersion;
  myVote: Scores | null;
  twin: PizzaVersion | null;
  prev: PizzaVersion | null;
  next: PizzaVersion | null;
  result: { ranked: RankedPizza; total: number; twin: RankedPizza | null } | null;
  canEdit: boolean;
}

export function PizzaPage({ user, hasAdmin, event, rev, version, myVote, twin, prev, next, result, canEdit }: PizzaPageProps) {
  const caps = capabilities(event.status);
  const canVote = caps.canVote && !version.votingLocked;
  let lockedMessage: string | null = null;
  if (event.status === 'SETUP' || event.status === 'CREATION_OPEN') lockedMessage = 'Le votazioni non sono ancora aperte.';
  else if (event.status === 'VOTING_CLOSED') lockedMessage = 'Le votazioni sono chiuse: il tuo voto è registrato così.';
  else if (version.votingLocked && caps.canVote) lockedMessage = 'Il voto per questa pizza non è ancora aperto.';

  return (
    <ParticipantShell
      title={`${version.name} · ${event.name}`}
      user={user}
      hasAdmin={hasAdmin}
      nav={caps.resultsVisible ? 'verdetto' : 'pizze'}
      canCreate={caps.canCreatePizza}
      resultsVisible={caps.resultsVisible}
      rev={rev}
      liveMode={canVote ? 'banner' : 'reload'}
      hideNav={canVote}
    >
      <div className="pizza-page">
        <nav className="crumbs" aria-label="Navigazione pizza">
          <a href={caps.resultsVisible ? '/risultati#classifica' : '/'} className="crumbs__back">
            <Icon name="back" size={20} /> {caps.resultsVisible ? 'Classifica' : 'Le pizze'}
          </a>
          <Ticket n={version.tastingOrder} />
        </nav>

        <header className="pizza-hero">
          <div className="pizza-hero__art">
            <PizzaImage src={version.artUrl} alt={pizzaAlt(version)} size="xl" eager className="enter" />
          </div>
          <h1 className="pizza-hero__name">{version.name}</h1>
          <div className="pizza-hero__meta">
            <DoughBadge dough={version.dough} />
            {version.creators.length ? <span className="pizza-hero__by">di {joinNames(version.creators.map((c) => c.name))}</span> : null}
          </div>
          {version.description ? <p className="pizza-hero__desc">{version.description}</p> : null}
          <IngredientChips ingredients={version.ingredients} />
          {canEdit ? (
            <a className="btn btn--ghost btn--small" href={`/crea/${version.recipeId}`}>
              <Icon name="edit" size={16} /> <span>Modifica la tua pizza</span>
            </a>
          ) : null}
        </header>

        {result ? (
          <section className="pizza-result" aria-label="Risultato">
            <div className="pizza-result__top">
              <BigScore value={result.ranked.scores.overall} label="Punteggio totale" />
              <p className="pizza-result__pos">
                {result.ranked.position ? (
                  <>
                    <strong>{ordinal(result.ranked.position)}</strong> su {result.total}
                    {result.ranked.tied ? ' a pari merito' : ''}
                  </>
                ) : (
                  'Nessun voto'
                )}
                <small>{result.ranked.scores.votes} voti</small>
              </p>
            </div>
            <ScoreBars scores={result.ranked.scores} />
            {twin && result.twin ? (
              <a className="twin" href={`/pizza/${twin.id}`}>
                Stesso gusto con {twin.dough?.name ?? 'l’altro panetto'}: <strong>{result.twin.scores.overall?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}</strong>
                <Icon name="chevron" size={18} />
              </a>
            ) : null}
          </section>
        ) : null}

        {result && myVote ? (
          <details className="myvote">
            <summary>Il tuo voto</summary>
            <ScoreBars scores={{ votes: 1, overall: null, ...myVote }} compact />
          </details>
        ) : null}

        {!result ? (
          <Island name="VoteForm" props={{ versionId: version.id, pizzaName: version.name, initial: myVote, canVote, lockedMessage }} />
        ) : null}

        {!canVote ? (
          <nav className={cx('pager')} aria-label="Altre pizze">
            {prev ? (
              <a href={`/pizza/${prev.id}`} className="pager__link">
                <Icon name="back" size={18} /> n. {prev.tastingOrder}
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a href={`/pizza/${next.id}`} className="pager__link">
                n. {next.tastingOrder} <Icon name="chevron" size={18} />
              </a>
            ) : null}
          </nav>
        ) : null}
      </div>
    </ParticipantShell>
  );
}
