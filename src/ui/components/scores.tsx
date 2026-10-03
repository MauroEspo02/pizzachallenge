/** Barre dei punteggi (risultati). */
import { CRITERIA } from '../../features/voting/criteria';
import type { ScoreLine } from '../../features/results/compute';
import { formatScore } from '../../utils/format';
import { cx } from './base';

export function ScoreBars({ scores, compact = false }: { scores: ScoreLine; compact?: boolean }) {
  return (
    <dl className={cx('bars', compact && 'bars--compact')}>
      {CRITERIA.map((c) => {
        const value = scores[c.key];
        return (
          <div className="bars__row" key={c.key}>
            <dt>{c.short}</dt>
            <dd>
              <span className="bars__track" aria-hidden="true">
                <span className="bars__fill" style={{ width: `${value ? (value / 5) * 100 : 0}%` }} />
              </span>
              <span className="bars__value">
                {formatScore(value, 1)}
                <small> / 5</small>
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function BigScore({ value, label = 'Punteggio', digits = 2 }: { value: number | null; label?: string; digits?: number }) {
  return (
    <div className="bigscore">
      <span className="bigscore__label">{label}</span>
      <span className="bigscore__value">{formatScore(value, digits)}</span>
      <span className="bigscore__max">su 5</span>
    </div>
  );
}
