/**
 * Macchina a stati dell'evento. È l'unica fonte di verità per:
 * - le transizioni consentite (copiate anche nel database, dove un trigger le fa rispettare);
 * - cosa possono fare i partecipanti in ogni stato.
 */
export const EVENT_STATUSES = ['SETUP', 'CREATION_OPEN', 'VOTING_OPEN', 'VOTING_CLOSED', 'RESULTS_REVEALED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export function isEventStatus(value: unknown): value is EventStatus {
  return typeof value === 'string' && (EVENT_STATUSES as readonly string[]).includes(value);
}

/** Transizioni normali, scelte dall'admin dalla dashboard. */
export const FLOW_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  SETUP: ['CREATION_OPEN', 'VOTING_OPEN'],
  CREATION_OPEN: ['VOTING_OPEN', 'SETUP'],
  VOTING_OPEN: ['VOTING_CLOSED', 'RESULTS_REVEALED', 'CREATION_OPEN'],
  VOTING_CLOSED: ['RESULTS_REVEALED', 'VOTING_OPEN'],
  RESULTS_REVEALED: ['VOTING_CLOSED'],
};

/** Il reset riporta sempre l'evento in preparazione, da qualunque stato. */
export const RESET_TARGET: EventStatus = 'SETUP';

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return FLOW_TRANSITIONS[from].includes(to);
}

export interface Capabilities {
  canCreatePizza: boolean;
  canVote: boolean;
  resultsVisible: boolean;
}

export function capabilities(status: EventStatus): Capabilities {
  return {
    canCreatePizza: status === 'CREATION_OPEN',
    canVote: status === 'VOTING_OPEN',
    resultsVisible: status === 'RESULTS_REVEALED',
  };
}

export const STATUS_INFO: Record<EventStatus, { label: string; participantLine: string; adminLine: string }> = {
  SETUP: {
    label: 'Preparazione',
    participantLine: 'La serata non è ancora cominciata.',
    adminLine: 'I partecipanti possono entrare ma non creare né votare.',
  },
  CREATION_OPEN: {
    label: 'Creazione pizze',
    participantLine: 'Inventa la tua pizza: le votazioni apriranno a breve.',
    adminLine: 'Ognuno può creare e modificare le proprie pizze.',
  },
  VOTING_OPEN: {
    label: 'Votazioni aperte',
    participantLine: 'Assaggia, vota, passa alla prossima.',
    adminLine: 'Ognuno può votare e correggere i propri voti.',
  },
  VOTING_CLOSED: {
    label: 'Votazioni chiuse',
    participantLine: 'Votazioni chiuse. Il verdetto sta arrivando.',
    adminLine: 'Nessuno può più modificare i voti. I risultati restano segreti.',
  },
  RESULTS_REVEALED: {
    label: 'Verdetto',
    participantLine: 'Il verdetto è pronto.',
    adminLine: 'Classifiche e statistiche sono visibili a tutti.',
  },
};

export const TRANSITION_LABELS: Record<string, string> = {
  'SETUP>CREATION_OPEN': 'Apri la creazione delle pizze',
  'SETUP>VOTING_OPEN': 'Apri direttamente le votazioni',
  'CREATION_OPEN>VOTING_OPEN': 'Apri le votazioni',
  'CREATION_OPEN>SETUP': 'Torna in preparazione',
  'VOTING_OPEN>VOTING_CLOSED': 'Chiudi le votazioni',
  'VOTING_OPEN>RESULTS_REVEALED': 'Chiudi e rivela i risultati',
  'VOTING_OPEN>CREATION_OPEN': 'Riapri la creazione',
  'VOTING_CLOSED>RESULTS_REVEALED': 'Rivela i risultati',
  'VOTING_CLOSED>VOTING_OPEN': 'Riapri le votazioni',
  'RESULTS_REVEALED>VOTING_CLOSED': 'Nascondi di nuovo i risultati',
};

export function transitionLabel(from: EventStatus, to: EventStatus): string {
  return TRANSITION_LABELS[`${from}>${to}`] ?? `${STATUS_INFO[from].label} → ${STATUS_INFO[to].label}`;
}

export const REVEAL_CONFIRM_TEXT = 'Sei sicuro? I risultati diventeranno visibili a tutti i partecipanti.';

/** Testo di conferma richiesto prima di una transizione delicata (null = nessuna conferma). */
export function transitionConfirmation(from: EventStatus, to: EventStatus): string | null {
  if (to === 'RESULTS_REVEALED') {
    return from === 'VOTING_OPEN'
      ? `${REVEAL_CONFIRM_TEXT} Le votazioni verranno chiuse.`
      : REVEAL_CONFIRM_TEXT;
  }
  if (to === 'VOTING_CLOSED' && from === 'VOTING_OPEN') return 'Chiudere le votazioni? Nessuno potrà più cambiare i propri voti.';
  if (from === 'RESULTS_REVEALED') return 'Nascondere di nuovo i risultati ai partecipanti?';
  if (from === 'VOTING_OPEN' && to === 'CREATION_OPEN') return 'Riaprire la creazione? Le votazioni verranno sospese.';
  return null;
}

/** L'azione principale suggerita all'admin in ogni stato. */
export function primaryTransition(status: EventStatus): EventStatus | null {
  switch (status) {
    case 'SETUP':
      return 'CREATION_OPEN';
    case 'CREATION_OPEN':
      return 'VOTING_OPEN';
    case 'VOTING_OPEN':
      return 'VOTING_CLOSED';
    case 'VOTING_CLOSED':
      return 'RESULTS_REVEALED';
    case 'RESULTS_REVEALED':
      return null;
  }
}
