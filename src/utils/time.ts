export const APP_TIME_ZONE = 'Europe/Rome';

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoInSeconds(seconds: number, from: Date = new Date()): string {
  return new Date(from.getTime() + seconds * 1000).toISOString();
}

export function isPast(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return true;
  return new Date(iso).getTime() <= now.getTime();
}

const dateTimeFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** "3 ott, 21:42" nel fuso orario della serata. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateTimeFormat.format(new Date(iso));
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return timeFormat.format(new Date(iso));
}

/** Secondi rimanenti fino a una data ISO (0 se passata). */
export function secondsUntil(iso: string | null | undefined, now: Date = new Date()): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 1000));
}
