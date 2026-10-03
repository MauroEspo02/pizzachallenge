/** Elenco pizze per l'admin: ordine di degustazione, panetto, blocco del voto, "in tavola", eliminazione. */
import { useState } from 'react';
import { plural } from '../../utils/text';
import { api, errorMessage } from '../lib/api';
import { toast } from '../lib/toast';
import { Icon } from '../components/Icon';
import { Dialog } from './parts/Dialog';

export interface PizzasManagerProps {
  versions: Array<{
    id: string;
    recipeId: string;
    name: string;
    artUrl: string;
    doughId: string | null;
    tastingOrder: number;
    votingLocked: boolean;
    votes: number;
    isDemo: boolean;
    creators: string;
    unknownIngredients: number;
  }>;
  doughs: Array<{ id: string; name: string }>;
  servingId: string | null;
  participants: number;
}

export default function PizzasManager({ versions, doughs, servingId, participants }: PizzasManagerProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PizzasManagerProps['versions'][number] | null>(null);

  async function call(key: string, url: string, body: unknown, message?: string) {
    setBusy(key);
    try {
      await api(url, body);
      if (message) toast(message, 'ok');
      window.location.reload();
    } catch (error) {
      setBusy(null);
      toast(errorMessage(error), 'error');
    }
  }

  return (
    <>
      <ol className="pzlist">
        {versions.map((v, i) => {
          const serving = v.id === servingId;
          return (
            <li key={v.id} className={`pzrow${serving ? ' is-serving' : ''}${v.votingLocked ? ' is-locked' : ''}`}>
              <div className="pzrow__order">
                <button type="button" className="icon-btn icon-btn--small" aria-label="Sposta prima" disabled={i === 0 || !!busy} onClick={() => call(`up-${v.id}`, `/api/admin/versions/${v.id}/move`, { direction: 'up' })}>
                  <Icon name="up" size={18} />
                </button>
                <span className="pzrow__num">{v.tastingOrder}</span>
                <button type="button" className="icon-btn icon-btn--small" aria-label="Sposta dopo" disabled={i === versions.length - 1 || !!busy} onClick={() => call(`down-${v.id}`, `/api/admin/versions/${v.id}/move`, { direction: 'down' })}>
                  <Icon name="down" size={18} />
                </button>
              </div>
              <img className="pzrow__img" src={v.artUrl} alt="" width={64} height={64} loading="lazy" />
              <div className="pzrow__main">
                <a className="pzrow__name" href={`/admin/pizze/${v.recipeId}`}>
                  {v.name}
                </a>
                <span className="pzrow__meta">
                  {v.creators ? <span>di {v.creators}</span> : null}
                  <span>
                    {v.votes}/{participants} voti
                  </span>
                  {v.isDemo ? <span className="pill pill--muted">Demo</span> : null}
                  {v.unknownIngredients ? <span className="pill pill--warn">{v.unknownIngredients} senza grafica</span> : null}
                </span>
                <label className="pzrow__dough">
                  <span className="sr-only">Panetto</span>
                  <select className="select" value={v.doughId ?? ''} disabled={!!busy} onChange={(e) => call(`dough-${v.id}`, `/api/admin/versions/${v.id}/dough`, { doughId: e.target.value || null }, 'Panetto aggiornato')}>
                    <option value="">Panetto da assegnare</option>
                    {doughs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="pzrow__actions">
                <button type="button" className={`btn btn--small ${serving ? 'btn--primary' : 'btn--secondary'}`} disabled={!!busy} onClick={() => call(`serve-${v.id}`, '/api/admin/serve', { versionId: serving ? null : v.id })}>
                  <Icon name="plate" size={16} /> <span>{serving ? 'In tavola' : 'Servi'}</span>
                </button>
                <button
                  type="button"
                  className={`btn btn--small ${v.votingLocked ? 'btn--danger-soft' : 'btn--ghost'}`}
                  disabled={!!busy}
                  aria-pressed={v.votingLocked}
                  onClick={() => call(`lock-${v.id}`, `/api/admin/versions/${v.id}/lock`, { locked: !v.votingLocked }, v.votingLocked ? 'Voto riaperto' : 'Voto bloccato')}
                >
                  <Icon name="lock" size={16} /> <span>{v.votingLocked ? 'Voto bloccato' : 'Blocca voto'}</span>
                </button>
                <button type="button" className="icon-btn icon-btn--danger" aria-label={`Elimina ${v.name}`} disabled={!!busy} onClick={() => setToDelete(v)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <Dialog
        open={!!toDelete}
        title="Eliminare questa pizza?"
        tone="danger"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setToDelete(null)}>
              Annulla
            </button>
            <button type="button" className="btn btn--danger" disabled={!!busy} onClick={() => toDelete && call(`del-${toDelete.id}`, `/api/admin/versions/${toDelete.id}/delete`, {}, 'Pizza eliminata')}>
              Elimina
            </button>
          </>
        }
      >
        {toDelete ? (
          <p>
            “{toDelete.name}” (n. {toDelete.tastingOrder}) verrà eliminata
            {toDelete.votes ? ` insieme a ${toDelete.votes} ${plural(toDelete.votes, 'voto', 'voti')}` : ''}. Le altre pizze verranno rinumerate.
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
