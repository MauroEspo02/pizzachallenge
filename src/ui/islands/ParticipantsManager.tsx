/** Gestione partecipanti: aggiungi, rinomina, PIN, disattiva, elimina. I PIN si vedono solo quando li crei. */
import { useState } from 'react';
import { initials, plural } from '../../utils/text';
import { formatDateTime } from '../../utils/time';
import { api, errorMessage } from '../lib/api';
import { toast } from '../lib/toast';
import { Icon } from '../components/Icon';
import { Dialog } from './parts/Dialog';

export interface ParticipantsManagerProps {
  participants: Array<{ id: string; name: string; isActive: boolean; hasPin: boolean; lastLoginAt: string | null; votes: number; locked: boolean }>;
  totalVersions: number;
  appUrl: string;
}

type Pin = { name: string; pin: string };
type Mode = { kind: 'none' } | { kind: 'rename'; id: string; name: string } | { kind: 'pin'; id: string; name: string } | { kind: 'delete'; id: string; name: string; votes: number } | { kind: 'pins'; pins: Pin[] };

function inviteText(appUrl: string, p: Pin): string {
  return `Ciao ${p.name}! Ecco il tuo accesso alla Pizza Challenge: ${appUrl}\nNome: ${p.name}\nPIN: ${p.pin}`;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiato', 'ok');
  } catch {
    toast('Copia non riuscita: tieni premuto per selezionare', 'error');
  }
}

export default function ParticipantsManager({ participants, totalVersions, appUrl }: ParticipantsManagerProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: 'none' });
  const [field, setField] = useState('');
  const missing = participants.filter((p) => p.isActive && !p.hasPin).length;

  const close = (reload = false) => {
    setMode({ kind: 'none' });
    setField('');
    if (reload) window.location.reload();
  };

  async function call<T>(url: string, body: unknown, after: (data: T) => void) {
    setBusy(true);
    try {
      const data = await api<T>(url, body);
      after(data);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pm">
      <form
        className="card pm__add"
        onSubmit={(e) => {
          e.preventDefault();
          void call<{ name: string; pin: string }>('/api/admin/participants', { name, pin: pin || undefined }, (data) => {
            setName('');
            setPin('');
            setMode({ kind: 'pins', pins: [{ name: data.name, pin: data.pin }] });
          });
        }}
      >
        <h2 className="card__title">Aggiungi partecipante</h2>
        <div className="pm__row">
          <label className="field">
            <span className="field__label">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoCapitalize="words" />
          </label>
          <label className="field pm__pin">
            <span className="field__label">
              PIN <span className="field__optional">vuoto = casuale</span>
            </span>
            <input className="input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" pattern="\d{4}" placeholder="••••" />
          </label>
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy || !name.trim()}>
          <Icon name="plus" size={20} /> <span>Aggiungi</span>
        </button>
      </form>

      {missing > 0 ? (
        <div className="notice notice--warn">
          <Icon name="key" size={20} />
          <div>
            {missing} {plural(missing, 'partecipante non ha', 'partecipanti non hanno')} ancora un PIN e non {plural(missing, 'può', 'possono')} entrare.
            <button type="button" className="btn btn--small btn--primary" disabled={busy} onClick={() => call<{ pins: Pin[] }>('/api/admin/participants/pins', { onlyMissing: true }, (d) => setMode({ kind: 'pins', pins: d.pins }))}>
              Genera i PIN mancanti
            </button>
          </div>
        </div>
      ) : null}

      <ul className="people">
        {participants.map((p) => (
          <li key={p.id} className={`person${p.isActive ? '' : ' is-inactive'}`}>
            <span className="avatar" aria-hidden="true">
              {initials(p.name)}
            </span>
            <div className="person__main">
              <span className="person__name">{p.name}</span>
              <span className="person__meta">
                {!p.isActive ? <span className="pill pill--muted">Disattivato</span> : p.hasPin ? <span className="pill pill--ok">PIN impostato</span> : <span className="pill pill--warn">Senza PIN</span>}
                {p.locked ? <span className="pill pill--danger">Bloccato per troppi tentativi</span> : null}
                <span>
                  {p.votes}/{totalVersions} voti
                </span>
                <span>{p.lastLoginAt ? `Ultimo accesso ${formatDateTime(p.lastLoginAt)}` : 'Mai entrato'}</span>
              </span>
            </div>
            <div className="person__actions">
              <button type="button" className="icon-btn" title="Rinomina" aria-label={`Rinomina ${p.name}`} onClick={() => { setField(p.name); setMode({ kind: 'rename', id: p.id, name: p.name }); }}>
                <Icon name="edit" />
              </button>
              <button type="button" className="icon-btn" title="Nuovo PIN" aria-label={`Nuovo PIN per ${p.name}`} onClick={() => setMode({ kind: 'pin', id: p.id, name: p.name })}>
                <Icon name="key" />
              </button>
              <button
                type="button"
                className="icon-btn"
                title={p.isActive ? 'Disattiva' : 'Riattiva'}
                aria-label={`${p.isActive ? 'Disattiva' : 'Riattiva'} ${p.name}`}
                onClick={() => call(`/api/admin/participants/${p.id}/active`, { active: !p.isActive }, () => window.location.reload())}
              >
                <Icon name={p.isActive ? 'eyeOff' : 'eye'} />
              </button>
              <button type="button" className="icon-btn icon-btn--danger" title="Elimina" aria-label={`Elimina ${p.name}`} onClick={() => setMode({ kind: 'delete', id: p.id, name: p.name, votes: p.votes })}>
                <Icon name="trash" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={mode.kind === 'rename'}
        title="Rinomina"
        onClose={() => close()}
        footer={
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !field.trim()}
            onClick={() => mode.kind === 'rename' && call(`/api/admin/participants/${mode.id}/rename`, { name: field }, () => close(true))}
          >
            Salva
          </button>
        }
      >
        <label className="field">
          <span className="field__label">Nuovo nome</span>
          <input className="input" value={field} onChange={(e) => setField(e.target.value)} maxLength={40} autoFocus />
        </label>
      </Dialog>

      <Dialog
        open={mode.kind === 'pin'}
        title={mode.kind === 'pin' ? `Nuovo PIN per ${mode.name}` : 'Nuovo PIN'}
        onClose={() => close()}
        footer={
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || (field.length > 0 && field.length !== 4)}
            onClick={() =>
              mode.kind === 'pin' && call<{ pin: string }>(`/api/admin/participants/${mode.id}/pin`, { pin: field || undefined }, (d) => setMode({ kind: 'pins', pins: [{ name: mode.name, pin: d.pin }] }))
            }
          >
            {field ? 'Imposta questo PIN' : 'Genera un PIN casuale'}
          </button>
        }
      >
        <p>Il PIN attuale smette di funzionare e la persona dovrà rientrare con quello nuovo.</p>
        <label className="field">
          <span className="field__label">
            PIN di 4 cifre <span className="field__optional">vuoto = casuale</span>
          </span>
          <input className="input" value={field} onChange={(e) => setField(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="••••" />
        </label>
      </Dialog>

      <Dialog
        open={mode.kind === 'delete'}
        title={mode.kind === 'delete' ? `Eliminare ${mode.name}?` : 'Eliminare?'}
        tone="danger"
        onClose={() => close()}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => close()}>
              Annulla
            </button>
            <button type="button" className="btn btn--danger" disabled={busy} onClick={() => mode.kind === 'delete' && call(`/api/admin/participants/${mode.id}/delete`, {}, () => close(true))}>
              Elimina definitivamente
            </button>
          </>
        }
      >
        {mode.kind === 'delete' ? (
          <p>
            Verranno cancellati l’account e {mode.votes} {plural(mode.votes, 'voto', 'voti')}. Se vuoi solo impedire l’accesso, usa “Disattiva”: i voti restano.
          </p>
        ) : null}
      </Dialog>

      <Dialog open={mode.kind === 'pins'} title="PIN da consegnare" onClose={() => close(true)} wide>
        <p>Mostrali o inviali adesso: per sicurezza non saranno più visibili. Se qualcuno lo dimentica, generane uno nuovo.</p>
        <ul className="pins">
          {mode.kind === 'pins'
            ? mode.pins.map((p) => (
                <li key={p.name} className="pins__row">
                  <span className="pins__name">{p.name}</span>
                  <span className="pins__pin">{p.pin}</span>
                  <button type="button" className="icon-btn" aria-label={`Copia invito per ${p.name}`} onClick={() => copy(inviteText(appUrl, p))}>
                    <Icon name="copy" />
                  </button>
                  <a className="icon-btn" aria-label={`Invia a ${p.name} con WhatsApp`} href={`https://wa.me/?text=${encodeURIComponent(inviteText(appUrl, p))}`} target="_blank" rel="noreferrer">
                    <Icon name="share" />
                  </a>
                </li>
              ))
            : null}
        </ul>
      </Dialog>
    </div>
  );
}
