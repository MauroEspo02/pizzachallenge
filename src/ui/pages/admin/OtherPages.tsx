import type { AuditRow } from '../../../features/audit/repo';
import { describeAudit } from '../../../features/audit/repo';
import type { EventRecord } from '../../../features/event/repo';
import type { Results } from '../../../features/results/compute';
import { formatDateTime } from '../../../utils/time';
import { EmptyState, Notice } from '../../components/base';
import { Island, type IslandProps } from '../../islands';
import { AdminHeader, AdminShell } from '../../layouts/AdminShell';
import { ResultsBody } from '../ResultsPage';

interface Base {
  event: EventRecord;
  rev: string;
  devPassword: boolean;
}

export function AdminLogPage({ event, rev, devPassword, rows }: Base & { rows: AuditRow[] }) {
  return (
    <AdminShell title="Registro" section="registro" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Registro" lead="Ogni modifica importante, con data, ora e autore. Gli ultimi 150 eventi." />
      {rows.length ? (
        <ol className="log">
          {rows.map((r) => (
            <li key={r.id} className={`log__row log__row--${r.action.split('.')[0]}`}>
              <time className="log__time" dateTime={r.createdAt}>
                {formatDateTime(r.createdAt)}
              </time>
              <span className="log__who">{r.actorName}</span>
              <span className="log__what">{describeAudit(r)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="Ancora niente da registrare" icon="clock" />
      )}
    </AdminShell>
  );
}

export function AdminSettingsPage({ event, rev, devPassword, settings, reset }: Base & { settings: IslandProps<'SettingsForm'>; reset: IslandProps<'ResetPanel'> }) {
  return (
    <AdminShell title="Impostazioni" section="impostazioni" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Impostazioni" />
      <Island name="SettingsForm" props={settings} />
      <section className="card card--danger" id="reset">
        <h2 className="card__title">Zona pericolosa</h2>
        <p className="card__text">Il reset cancella i voti e riporta la serata in preparazione. Serve una conferma scritta.</p>
        <Island name="ResetPanel" props={reset} />
      </section>
    </AdminShell>
  );
}

export function AdminPreviewPage({ event, rev, devPassword, results }: Base & { results: Results }) {
  return (
    <AdminShell title="Anteprima risultati" section="anteprima" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Anteprima risultati" />
      <Notice tone="warn" icon="eye">
        Spoiler! Questa pagina la vedi solo tu. {event.status === 'RESULTS_REVEALED' ? 'I risultati sono già pubblici.' : 'I partecipanti vedranno il verdetto solo quando premi “Rivela risultati”.'}
      </Notice>
      {results.totals.votes ? (
        <div className="results results--admin">
          <ResultsBody results={results} />
        </div>
      ) : (
        <EmptyState title="Nessun voto ancora" icon="grid" />
      )}
    </AdminShell>
  );
}
