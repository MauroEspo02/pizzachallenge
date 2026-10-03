import type { EventRecord } from '../../../features/event/repo';
import {
  EVENT_STATUSES,
  FLOW_TRANSITIONS,
  primaryTransition,
  REVEAL_CONFIRM_TEXT,
  STATUS_INFO,
  transitionConfirmation,
  transitionLabel,
  type EventStatus,
} from '../../../features/event/state-machine';
import { formatPercent } from '../../../utils/format';
import { plural } from '../../../utils/text';
import { cx } from '../../components/base';
import { Icon, type IconName } from '../../components/Icon';
import { Island } from '../../islands';
import { AdminHeader, AdminShell } from '../../layouts/AdminShell';

export interface DashboardProps {
  event: EventRecord;
  rev: string;
  devPassword: boolean;
  appUrl: string;
  stats: {
    activeParticipants: number;
    versions: number;
    openVersions: number;
    votesCast: number;
    votesExpected: number;
    completeParticipants: number;
    totalVotes: number;
    recipes: number;
  };
  serving: { id: string; name: string; tastingOrder: number; artUrl: string } | null;
  nextToServe: { id: string; name: string; tastingOrder: number } | null;
  checklist: Array<{ tone: 'warn' | 'info'; text: string; href: string; action: string }>;
  demoCount: number;
}

function TransitionButton({ from, to, primary }: { from: EventStatus; to: EventStatus; primary: boolean }) {
  const message = transitionConfirmation(from, to);
  const reveal = to === 'RESULTS_REVEALED';
  return (
    <Island
      name="AdminAction"
      props={{
        label: transitionLabel(from, to),
        endpoint: '/api/admin/status',
        body: { to },
        variant: reveal ? 'reveal' : primary ? 'primary' : 'secondary',
        big: primary || reveal,
        block: primary || reveal,
        icon: reveal ? 'seal' : to === 'VOTING_CLOSED' ? 'lock' : to === 'VOTING_OPEN' ? 'check' : undefined,
        successMessage: `Stato: ${STATUS_INFO[to].label}`,
        confirm: message ? { title: reveal ? 'Rivelare i risultati?' : transitionLabel(from, to), message, confirmLabel: reveal ? 'Sì, rivela a tutti' : 'Conferma', danger: reveal } : undefined,
      }}
    />
  );
}

const QUICK: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/admin/pizze', label: 'Gestisci pizze', icon: 'pizza' },
  { href: '/admin/partecipanti', label: 'Gestisci partecipanti', icon: 'users' },
  { href: '/admin/voti', label: 'Vedi voti', icon: 'grid' },
  { href: '/admin/anteprima', label: 'Anteprima risultati', icon: 'eye' },
];

export function DashboardPage({ event, rev, devPassword, appUrl, stats, serving, nextToServe, checklist, demoCount }: DashboardProps) {
  const status = event.status;
  const primary = primaryTransition(status);
  const others = FLOW_TRANSITIONS[status].filter((t) => t !== primary && !(t === 'RESULTS_REVEALED' && primary === 'VOTING_CLOSED'));
  const revealFrom: EventStatus | null = status === 'VOTING_OPEN' || status === 'VOTING_CLOSED' ? status : null;
  const completion = stats.votesExpected ? stats.votesCast / stats.votesExpected : 0;

  return (
    <AdminShell title="Dashboard" section="dashboard" status={status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Dashboard" lead={STATUS_INFO[status].adminLine} />

      <section className="status-card" id="stato" aria-label="Stato dell’evento">
        <div className="status-card__now">
          <span className="status-card__label">Stato</span>
          <span className={`status-card__value status-card__value--${status}`}>{STATUS_INFO[status].label}</span>
          <code className="status-card__code">{status}</code>
        </div>
        <ol className="stepper" aria-label="Fasi della serata">
          {EVENT_STATUSES.map((s, i) => {
            const index = EVENT_STATUSES.indexOf(status);
            return (
              <li key={s} className={cx('stepper__step', s === status && 'is-current', i < index && 'is-past')}>
                <span className="stepper__dot" aria-hidden="true" />
                <span className="stepper__label">{STATUS_INFO[s].label}</span>
              </li>
            );
          })}
        </ol>
        <div className="status-card__actions">
          {primary && primary !== 'RESULTS_REVEALED' ? <TransitionButton from={status} to={primary} primary /> : null}
          {revealFrom ? (
            <Island
              name="AdminAction"
              props={{
                label: 'Rivela risultati',
                endpoint: '/api/admin/reveal',
                variant: 'reveal',
                big: true,
                block: true,
                icon: 'seal',
                hint: revealFrom === 'VOTING_OPEN' ? 'Chiude anche le votazioni' : undefined,
                confirm: {
                  title: 'Rivelare i risultati?',
                  message: revealFrom === 'VOTING_OPEN' ? `${REVEAL_CONFIRM_TEXT} Le votazioni verranno chiuse.` : REVEAL_CONFIRM_TEXT,
                  confirmLabel: 'Sì, rivela a tutti',
                  danger: true,
                },
                successMessage: 'Risultati rivelati',
              }}
            />
          ) : null}
          {status === 'RESULTS_REVEALED' ? (
            <a className="btn btn--primary btn--big btn--block" href="/risultati">
              <Icon name="seal" size={20} /> <span>Apri il verdetto</span>
            </a>
          ) : null}
          <div className="status-card__more">
            {others
              .filter((t) => t !== 'RESULTS_REVEALED')
              .map((t) => (
                <TransitionButton key={t} from={status} to={t} primary={false} />
              ))}
          </div>
        </div>
      </section>

      <section className="kpis" aria-label="Numeri della serata">
        <div className="kpi">
          <span className="kpi__label">Partecipanti</span>
          <span className="kpi__value">{stats.activeParticipants}</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Pizze</span>
          <span className="kpi__value">{stats.versions}</span>
          <span className="kpi__sub">
            {stats.recipes} {plural(stats.recipes, 'gusto', 'gusti')}
          </span>
        </div>
        <div className="kpi kpi--wide">
          <span className="kpi__label">Voti completati</span>
          <span className="kpi__value">
            {stats.votesCast}
            <small> / {stats.votesExpected}</small>
          </span>
          <span className="kpi__bar" aria-hidden="true">
            <span style={{ width: formatPercent(completion) }} />
          </span>
          <span className="kpi__sub">{formatPercent(completion)}</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Hanno votato tutto</span>
          <span className="kpi__value">
            {stats.completeParticipants}
            <small> / {stats.activeParticipants}</small>
          </span>
        </div>
      </section>

      <div className="dash-grid">
        <section className="card">
          <h2 className="card__title">In tavola ora</h2>
          {serving ? (
            <div className="serve-now">
              <img src={serving.artUrl} alt="" width={64} height={64} />
              <span>
                <strong>n. {serving.tastingOrder}</strong> {serving.name}
              </span>
            </div>
          ) : (
            <p className="card__text">Nessuna pizza segnalata. Quando ne sforni una, segnala qui: comparirà in cima al telefono di tutti.</p>
          )}
          <div className="card__actions">
            {nextToServe ? (
              <Island name="AdminAction" props={{ label: `Servi la n. ${nextToServe.tastingOrder}`, endpoint: '/api/admin/serve', body: { versionId: nextToServe.id }, variant: 'primary', icon: 'plate', successMessage: `In tavola: ${nextToServe.name}` }} />
            ) : null}
            {serving ? <Island name="AdminAction" props={{ label: 'Nessuna in tavola', endpoint: '/api/admin/serve', body: { versionId: null }, variant: 'ghost' }} /> : null}
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Azioni rapide</h2>
          <div className="quick">
            {QUICK.map((q) => (
              <a key={q.href} className="quick__item" href={q.href}>
                <Icon name={q.icon} size={22} />
                <span>{q.label}</span>
              </a>
            ))}
            <a className="quick__item" href="#stato">
              <Icon name="lock" size={22} />
              <span>{status === 'VOTING_OPEN' ? 'Chiudi votazioni' : 'Apri votazioni'}</span>
            </a>
            <a className="quick__item" href="/admin/impostazioni#reset">
              <Icon name="trash" size={22} />
              <span>Reset evento</span>
            </a>
          </div>
        </section>

        {checklist.length ? (
          <section className="card card--warn">
            <h2 className="card__title">Da sistemare</h2>
            <ul className="checklist">
              {checklist.map((c) => (
                <li key={c.text}>
                  <span>{c.text}</span>
                  <a href={c.href}>{c.action}</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="card">
          <h2 className="card__title">Link per gli invitati</h2>
          <Island name="ShareLink" props={{ url: appUrl, eventName: event.name }} />
        </section>

        {demoCount ? (
          <section className="card">
            <h2 className="card__title">Dati dimostrativi</h2>
            <p className="card__text">
              Ci sono {demoCount} {plural(demoCount, 'gusto demo', 'gusti demo')}. Puoi simulare dei voti per provare il reveal, poi cancellare tutto.
            </p>
            <div className="card__actions">
              <Island name="AdminAction" props={{ label: 'Simula voti demo', endpoint: '/api/admin/demo/simulate', variant: 'secondary', icon: 'spark' }} />
              <Island
                name="AdminAction"
                props={{
                  label: 'Cancella dati demo',
                  endpoint: '/api/admin/demo/delete',
                  variant: 'danger',
                  icon: 'trash',
                  confirm: { title: 'Cancellare i dati demo?', message: 'Spariscono le pizze dimostrative e i loro voti. Partecipanti e pizze vere restano.', confirmLabel: 'Cancella', danger: true },
                }}
              />
            </div>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}
