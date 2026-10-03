import type { EventRecord } from '../../../features/event/repo';
import { ButtonLink, EmptyState } from '../../components/base';
import { Island, type IslandProps } from '../../islands';
import { AdminHeader, AdminShell } from '../../layouts/AdminShell';

interface Base {
  event: EventRecord;
  rev: string;
  devPassword: boolean;
}

export function AdminPizzasPage({ event, rev, devPassword, manager }: Base & { manager: IslandProps<'PizzasManager'> }) {
  return (
    <AdminShell title="Pizze" section="pizze" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Pizze" lead="Ogni gusto può avere una versione per panetto: ciascuna si vota a parte. L’ordine è quello di degustazione.">
        <ButtonLink href="/admin/pizze/nuova" icon="plus">
          Nuova pizza
        </ButtonLink>
      </AdminHeader>
      {manager.versions.length ? <Island name="PizzasManager" props={manager} /> : <EmptyState title="Ancora nessuna pizza">Creane una o apri la creazione ai partecipanti dalla dashboard.</EmptyState>}
    </AdminShell>
  );
}

export function AdminPizzaEditPage({ event, rev, devPassword, builder }: Base & { builder: IslandProps<'PizzaBuilder'> }) {
  return (
    <AdminShell title={builder.mode === 'create' ? 'Nuova pizza' : builder.initial.name} section="pizze" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title={builder.mode === 'create' ? 'Nuova pizza' : `Modifica: ${builder.initial.name}`} lead="Come admin puoi modificare qualunque pizza in qualunque momento.">
        <ButtonLink href="/admin/pizze" variant="ghost" icon="back">
          Tutte le pizze
        </ButtonLink>
      </AdminHeader>
      <div className="admin-builder">
        <Island name="PizzaBuilder" props={builder} />
      </div>
    </AdminShell>
  );
}

export function AdminParticipantsPage({ event, rev, devPassword, manager }: Base & { manager: IslandProps<'ParticipantsManager'> }) {
  return (
    <AdminShell title="Partecipanti" section="partecipanti" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Partecipanti" lead="Un account per persona: nome e PIN di 4 cifre. Due persone attive non possono avere lo stesso nome." />
      <Island name="ParticipantsManager" props={manager} />
    </AdminShell>
  );
}

export function AdminVotesPage({ event, rev, devPassword, board, summary }: Base & { board: IslandProps<'VotesBoard'>; summary: { cast: number; expected: number; complete: number; active: number } }) {
  return (
    <AdminShell title="Voti" section="voti" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Voti" lead={`${summary.cast} voti su ${summary.expected}. Hanno completato ${summary.complete} partecipanti su ${summary.active}. Visibile solo a te.`} />
      <Island name="VotesBoard" props={board} />
    </AdminShell>
  );
}

export function AdminIngredientsPage({ event, rev, devPassword, manager }: Base & { manager: IslandProps<'IngredientsManager'> }) {
  return (
    <AdminShell title="Ingredienti" section="ingredienti" status={event.status} eventName={event.name} rev={rev} devPassword={devPassword}>
      <AdminHeader title="Ingredienti" lead="La libreria che il Pizza Builder usa per riconoscere e disegnare gli ingredienti. Aggiungerne uno aggiorna subito tutte le pizze che lo usano." />
      <Island name="IngredientsManager" props={manager} />
    </AdminShell>
  );
}
