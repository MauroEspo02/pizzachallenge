/** Scheda di voto: quattro parametri, cinque gettoni ciascuno, salvataggio con un tocco. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CRITERIA, type CriterionKey, type Scores } from '../../features/voting/criteria';
import { api, errorMessage } from '../lib/api';
import { toast, toastAfterNavigation } from '../lib/toast';
import { Icon } from '../components/Icon';

export interface VoteFormProps {
  versionId: string;
  pizzaName: string;
  initial: Scores | null;
  canVote: boolean;
  lockedMessage: string | null;
}

type Draft = Partial<Record<CriterionKey, number>>;

const draftKey = (id: string) => `pc-draft-${id}`;

export default function VoteForm({ versionId, pizzaName, initial, canVote, lockedMessage }: VoteFormProps) {
  const [scores, setScores] = useState<Draft>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [popped, setPopped] = useState<string | null>(null);
  const restored = useRef(false);

  // Bozza locale: se la pagina si ricarica a metà voto, i tocchi non vanno persi.
  useEffect(() => {
    if (restored.current || initial || !canVote) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey(versionId));
      if (raw) setScores(JSON.parse(raw) as Draft);
    } catch {
      /* niente bozza */
    }
  }, [initial, canVote, versionId]);

  const missing = useMemo(() => CRITERIA.filter((c) => !scores[c.key]), [scores]);
  const complete = missing.length === 0;
  const changed = useMemo(() => !initial || CRITERIA.some((c) => initial[c.key] !== scores[c.key]), [initial, scores]);

  function choose(key: CriterionKey, value: number) {
    if (!canVote || saving) return;
    if (navigator.vibrate) navigator.vibrate(6);
    const next = { ...scores, [key]: value };
    setScores(next);
    setSaved(false);
    setPopped(`${key}-${value}`);
    try {
      localStorage.setItem(draftKey(versionId), JSON.stringify(next));
    } catch {
      /* ignora */
    }
  }

  async function save() {
    if (!complete || saving) return;
    setSaving(true);
    try {
      await api('/api/votes', { versionId, scores });
      try {
        localStorage.removeItem(draftKey(versionId));
      } catch {
        /* ignora */
      }
      setSaved(true);
      toastAfterNavigation(`Voto salvato per ${pizzaName}`, 'ok');
      window.setTimeout(() => {
        window.location.href = `/?votata=${encodeURIComponent(versionId)}`;
      }, 650);
    } catch (error) {
      setSaving(false);
      toast(errorMessage(error), 'error');
    }
  }

  return (
    <section className={`vote${canVote ? '' : ' vote--readonly'}`} aria-labelledby="vote-title">
      <div className="vote__head">
        <h2 id="vote-title" className="section-title">
          {canVote ? 'Il tuo voto' : 'Il tuo voto'}
        </h2>
        {lockedMessage ? <p className="vote__locked">{lockedMessage}</p> : null}
      </div>

      {CRITERIA.map((c) => {
        const value = scores[c.key];
        return (
          <fieldset className="crit" key={c.key}>
            <legend className="crit__title">{c.title}</legend>
            <p className="crit__question">{c.question}</p>
            <div className="crit__scale" role="radiogroup" aria-label={c.title}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = value === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${n}: ${c.levels[n - 1]}`}
                    className={`token${active ? ' is-active' : ''}${value && n < value ? ' is-below' : ''}${popped === `${c.key}-${n}` ? ' is-popped' : ''}`}
                    onClick={() => choose(c.key, n)}
                    disabled={!canVote}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className={`crit__level${value ? ' is-set' : ''}`} aria-live="polite">
              {value ? c.levels[value - 1] : canVote ? 'Tocca un numero' : 'Nessun voto'}
            </p>
            {c.note ? <p className="crit__note">{c.note}</p> : null}
          </fieldset>
        );
      })}

      {canVote ? (
        <div className="savebar">
          <button type="button" className={`btn btn--primary btn--block btn--big${saved ? ' is-saved' : ''}`} disabled={!complete || saving || (!changed && !!initial)} onClick={save}>
            {saved ? (
              <>
                <Icon name="check" size={22} /> <span>Voto salvato</span>
              </>
            ) : saving ? (
              <>
                <span className="spinner spinner--light" /> <span>Salvo…</span>
              </>
            ) : (
              <span>{initial ? (changed ? 'Aggiorna il voto' : 'Voto già salvato') : 'Salva il voto'}</span>
            )}
          </button>
          <p className="savebar__hint" aria-live="polite">
            {complete ? (initial && !changed ? 'Puoi cambiarlo finché le votazioni sono aperte.' : 'Pronto: un tocco e passi alla prossima.') : `Manca: ${missing.map((m) => m.short).join(', ')}`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
