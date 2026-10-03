import type { EventRecord } from '../../features/event/repo';
import { capabilities, STATUS_INFO } from '../../features/event/state-machine';
import type { PizzaVersion } from '../../features/pizzas/types';
import { joinNames, plural } from '../../utils/text';
import { ButtonLink, cx, DoughBadge, EmptyState, PizzaImage, ProgressSegments, Stamp, Ticket } from '../components/base';
import { Icon } from '../components/Icon';
import { ParticipantShell } from '../layouts/ParticipantShell';

export type HomeVersion = PizzaVersion & { voted: boolean };

export interface HomePageProps {
  user: { id: string; name: string };
  hasAdmin: boolean;
  event: EventRecord;
  rev: string;
  versions: HomeVersion[];
  myRecipes: Array<{ id: string; name: string; artUrl: string }>;
  justVotedId: string | null;
}

export function pizzaAlt(v: { name: string }): string {
  return `Illustrazione della pizza ${v.name}`;
}

function PizzaRow({ v, canVote, justVoted }: { v: HomeVersion; canVote: boolean; justVoted: boolean }) {
  return (
    <li>
      <a className={cx('prow', v.voted && 'is-voted', v.votingLocked && 'is-locked')} href={`/pizza/${v.id}`}>
        <Ticket n={v.tastingOrder} />
        <PizzaImage src={v.artUrl} alt={pizzaAlt(v)} size="s" />
        <span className="prow__body">
          <span className="prow__name">{v.name}</span>
          <DoughBadge dough={v.dough} compact />
          {v.creators.length ? <span className="prow__by">di {joinNames(v.creators.map((c) => c.name))}</span> : null}
        </span>
        <span className="prow__status">
          {v.voted ? (
            <Stamp animate={justVoted}>Votata</Stamp>
          ) : v.votingLocked ? (
            <span className="prow__wait">
              <Icon name="clock" size={16} /> In attesa
            </span>
          ) : canVote ? (
            <span className="prow__todo">Da votare</span>
          ) : (
            <Icon name="chevron" size={20} />
          )}
        </span>
      </a>
    </li>
  );
}

export function HomePage({ user, hasAdmin, event, rev, versions, myRecipes, justVotedId }: HomePageProps) {
  const caps = capabilities(event.status);
  const firstName = user.name.split(' ')[0];
  const votable = versions.filter((v) => !v.votingLocked);
  const voted = votable.filter((v) => v.voted).length;
  const serving = event.servingVersionId ? versions.find((v) => v.id === event.servingVersionId) ?? null : null;
  const nextToVote = caps.canVote ? votable.find((v) => !v.voted) ?? null : null;
  const showProgress = event.status === 'VOTING_OPEN' || event.status === 'VOTING_CLOSED' || event.status === 'RESULTS_REVEALED';

  return (
    <ParticipantShell title={event.name} user={user} hasAdmin={hasAdmin} nav="pizze" canCreate={caps.canCreatePizza} resultsVisible={caps.resultsVisible} rev={rev}>
      <section className="hello">
        <h1 className="hello__title">Ciao, {firstName}</h1>
        <p className="hello__line">{STATUS_INFO[event.status].participantLine}</p>
      </section>

      {caps.resultsVisible ? (
        <a className="verdict-cta" href="/risultati">
          <span className="verdict-cta__title">Il verdetto è pronto</span>
          <span className="verdict-cta__go">
            Scopri la classifica <Icon name="chevron" size={20} />
          </span>
        </a>
      ) : null}

      {caps.canVote && serving ? (
        <section className="serving" aria-labelledby="serving-title">
          <div className="serving__art">
            <PizzaImage src={serving.artUrl} alt={pizzaAlt(serving)} size="l" eager />
          </div>
          <div className="serving__body">
            <p className="serving__kicker" id="serving-title">
              <span className="pulse" aria-hidden="true" /> In tavola ora
            </p>
            <Ticket n={serving.tastingOrder} large />
            <h2 className="serving__name">{serving.name}</h2>
            <DoughBadge dough={serving.dough} />
            <ButtonLink href={`/pizza/${serving.id}`} variant={serving.voted ? 'secondary' : 'primary'} block className="serving__cta">
              {serving.voted ? 'Votata: rivedi il voto' : 'Vota questa pizza'}
            </ButtonLink>
          </div>
        </section>
      ) : null}

      {showProgress && votable.length ? (
        <section className="progress" aria-label="Il tuo progresso">
          <div className="progress__head">
            <span className="progress__count">
              <strong>{voted}</strong> / {votable.length}
            </span>
            <span className="progress__label">
              {voted === votable.length
                ? caps.canVote
                  ? 'Hai votato tutto. Puoi ancora cambiare idea.'
                  : 'Hai votato tutte le pizze.'
                : `${plural(voted, 'pizza votata', 'pizze votate')}${caps.canVote ? '' : ' prima della chiusura'}`}
            </span>
          </div>
          <ProgressSegments items={versions.map((v) => ({ id: v.id, done: v.voted, current: v.id === serving?.id, locked: v.votingLocked }))} />
          {nextToVote && nextToVote.id !== serving?.id ? (
            <a className="progress__next" href={`/pizza/${nextToVote.id}`}>
              Prossima da votare: <strong>n. {nextToVote.tastingOrder} {nextToVote.name}</strong> <Icon name="chevron" size={18} />
            </a>
          ) : null}
        </section>
      ) : null}

      {caps.canCreatePizza ? (
        <section className="create-cta">
          <div>
            <h2 className="create-cta__title">Crea la tua pizza</h2>
            <p className="create-cta__text">Scrivi gli ingredienti e guardala prendere forma sulla pala.</p>
          </div>
          <ButtonLink href="/crea" icon="peel">
            Inizia
          </ButtonLink>
          {myRecipes.length ? (
            <ul className="mine">
              {myRecipes.map((r) => (
                <li key={r.id}>
                  <a href={`/crea/${r.id}`}>
                    <img src={r.artUrl} alt="" width={40} height={40} />
                    <span>{r.name}</span>
                    <Icon name="edit" size={18} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="menu" aria-labelledby="menu-title">
        <h2 className="section-title" id="menu-title">
          Le pizze della serata
        </h2>
        {versions.length ? (
          <ol className="plist">
            {versions.map((v) => (
              <PizzaRow key={v.id} v={v} canVote={caps.canVote} justVoted={v.id === justVotedId} />
            ))}
          </ol>
        ) : (
          <EmptyState title="Il forno si sta scaldando">
            {caps.canCreatePizza ? 'Le pizze compariranno qui appena qualcuno le crea.' : 'Le pizze compariranno qui appena l’organizzatore le aggiunge.'}
          </EmptyState>
        )}
      </section>
    </ParticipantShell>
  );
}
