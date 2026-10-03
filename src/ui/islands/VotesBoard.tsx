/** Tabellone dei voti (solo admin): chi ha votato cosa, voti mancanti, correzione manuale. */
import { useEffect, useMemo, useState } from 'react';
import { CRITERIA, type CriterionKey, type Scores } from '../../features/voting/criteria';
import { formatScore } from '../../utils/format';
import { formatDateTime } from '../../utils/time';
import { api, errorMessage } from '../lib/api';
import { toast } from '../lib/toast';
import { Icon } from '../components/Icon';
import { Dialog } from './parts/Dialog';

export interface VotesBoardProps {
  participants: Array<{ id: string; name: string; isActive: boolean }>;
  versions: Array<{ id: string; tastingOrder: number; name: string; doughShort: string | null; votingLocked: boolean }>;
  votes: Array<Scores & { id: string; userId: string; versionId: string; updatedAt: string; adminEdit: boolean }>;
}

type Cell = { userId: string; versionId: string };

export default function VotesBoard({ participants, versions, votes }: VotesBoardProps) {
  const [showScores, setShowScores] = useState(false);
  const [cell, setCell] = useState<Cell | null>(null);
  const [draft, setDraft] = useState<Partial<Scores>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    try {
      setShowScores(localStorage.getItem('pc-admin-scores') === '1');
    } catch {
      /* ignora */
    }
  }, []);

  const byCell = useMemo(() => new Map(votes.map((v) => [`${v.userId}:${v.versionId}`, v])), [votes]);
  const active = participants.filter((p) => p.isActive);
  const openVersions = versions.filter((v) => !v.votingLocked);
  const current = cell ? byCell.get(`${cell.userId}:${cell.versionId}`) ?? null : null;
  const cellPerson = cell ? participants.find((p) => p.id === cell.userId) : null;
  const cellVersion = cell ? versions.find((v) => v.id === cell.versionId) : null;

  function open(c: Cell) {
    const v = byCell.get(`${c.userId}:${c.versionId}`);
    setDraft(v ? { taste: v.taste, rewant: v.rewant, idea: v.idea, smell: v.smell } : {});
    setCell(c);
  }

  async function save() {
    if (!cell) return;
    setBusy(true);
    try {
      await api('/api/admin/votes', { userId: cell.userId, versionId: cell.versionId, scores: draft });
      window.location.reload();
    } catch (error) {
      setBusy(false);
      toast(errorMessage(error), 'error');
    }
  }

  async function remove() {
    if (!current) return;
    setBusy(true);
    try {
      await api(`/api/admin/votes/${current.id}/delete`, {});
      window.location.reload();
    } catch (error) {
      setBusy(false);
      toast(errorMessage(error), 'error');
    }
  }

  const avg = (v: Scores) => (v.taste + v.rewant + v.idea + v.smell) / 4;
  const complete = CRITERIA.every((c) => draft[c.key]);

  return (
    <div className="board">
      <div className="board__tools">
        <label className="switch">
          <input
            type="checkbox"
            checked={showScores}
            onChange={(e) => {
              setShowScores(e.target.checked);
              try {
                localStorage.setItem('pc-admin-scores', e.target.checked ? '1' : '0');
              } catch {
                /* ignora */
              }
            }}
          />
          <span className="switch__track" aria-hidden="true" />
          <span>Mostra i punteggi</span>
        </label>
        <p className="board__hint">{showScores ? 'Attenzione agli spoiler: stai vedendo i voti.' : 'Punteggi nascosti: vedi solo chi ha votato. Tocca una casella per correggere un voto.'}</p>
      </div>

      <div className="board__scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col" className="matrix__corner">
                Chi
              </th>
              {versions.map((v) => (
                <th key={v.id} scope="col" title={`${v.name}${v.doughShort ? ` (${v.doughShort})` : ''}`}>
                  <span className="matrix__num">{v.tastingOrder}</span>
                  {v.doughShort ? <span className="matrix__dough">{v.doughShort.slice(0, 1)}</span> : null}
                </th>
              ))}
              <th scope="col">Tot.</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const done = openVersions.filter((v) => byCell.has(`${p.id}:${v.id}`)).length;
              return (
                <tr key={p.id} className={p.isActive ? '' : 'is-inactive'}>
                  <th scope="row">{p.name}</th>
                  {versions.map((v) => {
                    const vote = byCell.get(`${p.id}:${v.id}`);
                    return (
                      <td key={v.id}>
                        <button
                          type="button"
                          className={`cell${vote ? ' is-voted' : ''}${vote?.adminEdit ? ' is-admin' : ''}`}
                          onClick={() => open({ userId: p.id, versionId: v.id })}
                          aria-label={`${p.name}, pizza ${v.tastingOrder}: ${vote ? 'votata' : 'manca'}`}
                        >
                          {vote ? showScores ? formatScore(avg(vote), 1) : <Icon name="check" size={16} /> : '·'}
                        </button>
                      </td>
                    );
                  })}
                  <td className={`matrix__total${done === openVersions.length ? ' is-complete' : ''}`}>
                    {done}/{openVersions.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="missing">
        <h2 className="card__title">Voti mancanti</h2>
        <ul>
          {active.map((p) => {
            const miss = openVersions.filter((v) => !byCell.has(`${p.id}:${v.id}`));
            return (
              <li key={p.id}>
                <strong>{p.name}</strong>{' '}
                {miss.length ? <span>{miss.map((v) => `n. ${v.tastingOrder}`).join(', ')}</span> : <span className="ok-text">ha votato tutto</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <Dialog
        open={!!cell}
        title={cellPerson && cellVersion ? `${cellPerson.name}, n. ${cellVersion.tastingOrder}` : 'Voto'}
        onClose={() => {
          setCell(null);
          setConfirmDelete(false);
        }}
        footer={
          <>
            {current && !confirmDelete ? (
              <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={18} /> <span>Cancella voto</span>
              </button>
            ) : null}
            {confirmDelete ? (
              <button type="button" className="btn btn--danger" disabled={busy} onClick={remove}>
                Sì, cancella
              </button>
            ) : null}
            <button type="button" className="btn btn--primary" disabled={!complete || busy} onClick={save}>
              {current ? 'Correggi voto' : 'Inserisci voto'}
            </button>
          </>
        }
      >
        {cellVersion ? <p className="dialog__sub">{cellVersion.name}{cellVersion.doughShort ? `, panetto ${cellVersion.doughShort}` : ''}</p> : null}
        {current ? (
          <p className="dialog__sub">
            Ultima modifica {formatDateTime(current.updatedAt)}
            {current.adminEdit ? ' (dall’admin)' : ''}
          </p>
        ) : (
          <p className="dialog__sub">Nessun voto: puoi inserirlo tu.</p>
        )}
        {CRITERIA.map((c) => (
          <div className="mini-crit" key={c.key}>
            <span className="mini-crit__title">{c.short}</span>
            <div className="mini-crit__scale">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`token token--small${draft[c.key as CriterionKey] === n ? ' is-active' : ''}`}
                  aria-pressed={draft[c.key as CriterionKey] === n}
                  onClick={() => setDraft((d) => ({ ...d, [c.key]: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Dialog>
    </div>
  );
}
