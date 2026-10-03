/** Reset dell'evento con conferma forte: bisogna scrivere RESET. */
import { useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { toast, toastAfterNavigation } from '../lib/toast';
import { Icon } from '../components/Icon';
import { Dialog } from './parts/Dialog';

export interface ResetPanelProps {
  votes: number;
  pizzas: number;
}

export default function ResetPanel({ votes, pizzas }: ResetPanelProps) {
  const [open, setOpen] = useState(false);
  const [deletePizzas, setDeletePizzas] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await api('/api/admin/reset', { confirm: typed, deletePizzas });
      toastAfterNavigation('Evento azzerato', 'ok');
      window.location.href = '/admin';
    } catch (error) {
      setBusy(false);
      toast(errorMessage(error), 'error');
    }
  }

  return (
    <>
      <button type="button" className="btn btn--danger-soft btn--block" onClick={() => setOpen(true)}>
        <Icon name="trash" size={20} /> <span>Reset evento</span>
      </button>
      <Dialog
        open={open}
        title="Reset dell’evento"
        tone="danger"
        onClose={() => {
          setOpen(false);
          setTyped('');
        }}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setOpen(false)}>
              Annulla
            </button>
            <button type="button" className="btn btn--danger" disabled={busy || typed.trim().toUpperCase() !== 'RESET'} onClick={run}>
              Azzera
            </button>
          </>
        }
      >
        <p>
          Verranno cancellati tutti i {votes} voti e l’evento tornerà in preparazione. Partecipanti, PIN e libreria ingredienti restano.
        </p>
        <label className="check">
          <input type="checkbox" checked={deletePizzas} onChange={(e) => setDeletePizzas(e.target.checked)} />
          <span>Cancella anche le {pizzas} pizze</span>
        </label>
        <label className="field">
          <span className="field__label">
            Scrivi <strong>RESET</strong> per confermare
          </span>
          <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
        </label>
      </Dialog>
    </>
  );
}
