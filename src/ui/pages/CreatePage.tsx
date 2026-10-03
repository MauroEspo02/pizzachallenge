import type { EventRecord } from '../../features/event/repo';
import { capabilities } from '../../features/event/state-machine';
import { Island, type IslandProps } from '../islands';
import { ParticipantShell } from '../layouts/ParticipantShell';

export interface CreatePageProps {
  user: { id: string; name: string };
  hasAdmin: boolean;
  event: EventRecord;
  rev: string;
  builder: IslandProps<'PizzaBuilder'>;
}

export function CreatePage({ user, hasAdmin, event, rev, builder }: CreatePageProps) {
  const caps = capabilities(event.status);
  return (
    <ParticipantShell title={`Crea la tua pizza · ${event.name}`} user={user} hasAdmin={hasAdmin} nav="crea" canCreate={caps.canCreatePizza} resultsVisible={caps.resultsVisible} rev={rev} liveMode="banner" hideNav>
      <div className="create">
        <header className="create__head">
          <a href="/" className="crumbs__back">
            ‹ Le pizze
          </a>
          <h1 className="page-title">{builder.mode === 'create' ? 'Crea la tua pizza' : 'Modifica la tua pizza'}</h1>
        </header>
        <Island name="PizzaBuilder" props={builder} />
      </div>
    </ParticipantShell>
  );
}
