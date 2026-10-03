/** Pulsante admin che chiama il server, con conferma (anche "scrivi PAROLA per confermare"). */
import { useState, type ReactNode } from 'react';
import { api, errorMessage } from '../lib/api';
import { toast, toastAfterNavigation } from '../lib/toast';
import { Icon, type IconName } from '../components/Icon';
import { Dialog } from './parts/Dialog';

export interface AdminActionProps {
  label: string;
  endpoint: string;
  body?: Record<string, unknown>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'reveal' | 'basil';
  icon?: IconName;
  block?: boolean;
  big?: boolean;
  small?: boolean;
  successMessage?: string;
  /** Dopo il successo: ricarica la pagina (default) o vai a un indirizzo. */
  redirectTo?: string;
  confirm?: {
    title: string;
    message: string;
    confirmLabel: string;
    typeToConfirm?: string;
    danger?: boolean;
  };
  hint?: string;
}

export default function AdminAction(props: AdminActionProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const { confirm } = props;

  async function run() {
    setBusy(true);
    try {
      const data = await api<{ message?: string }>(props.endpoint, { ...(props.body ?? {}), confirm: confirm?.typeToConfirm ? typed : undefined });
      const message = props.successMessage ?? data.message;
      if (message) toastAfterNavigation(message, 'ok');
      if (props.redirectTo) window.location.href = props.redirectTo;
      else window.location.reload();
    } catch (error) {
      setBusy(false);
      toast(errorMessage(error), 'error');
    }
  }

  const ready = !confirm?.typeToConfirm || typed.trim().toUpperCase() === confirm.typeToConfirm;
  const cls = ['btn', `btn--${props.variant ?? 'secondary'}`, props.block && 'btn--block', props.big && 'btn--big', props.small && 'btn--small'].filter(Boolean).join(' ');

  let content: ReactNode = (
    <>
      {busy ? <span className="spinner" /> : props.icon ? <Icon name={props.icon} size={props.small ? 16 : 20} /> : null}
      <span>{props.label}</span>
    </>
  );
  if (props.hint) content = (
    <>
      {content}
      <small className="btn__hint">{props.hint}</small>
    </>
  );

  return (
    <>
      <button type="button" className={cls} disabled={busy} onClick={() => (confirm ? setOpen(true) : run())}>
        {content}
      </button>
      {confirm ? (
        <Dialog
          open={open}
          title={confirm.title}
          tone={confirm.danger ? 'danger' : 'default'}
          onClose={() => {
            setOpen(false);
            setTyped('');
          }}
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setOpen(false)}>
                Annulla
              </button>
              <button type="button" className={`btn ${confirm.danger ? 'btn--danger' : 'btn--primary'}`} disabled={!ready || busy} onClick={run}>
                {busy ? <span className="spinner spinner--light" /> : null}
                <span>{confirm.confirmLabel}</span>
              </button>
            </>
          }
        >
          <p>{confirm.message}</p>
          {confirm.typeToConfirm ? (
            <label className="field">
              <span className="field__label">
                Scrivi <strong>{confirm.typeToConfirm}</strong> per confermare
              </span>
              <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
            </label>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}
