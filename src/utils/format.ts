/** Formattazione dei punteggi all'italiana: 4,62. */
export function formatScore(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** "1°", "2°"… per le posizioni in classifica. */
export function ordinal(position: number): string {
  return `${position}°`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
