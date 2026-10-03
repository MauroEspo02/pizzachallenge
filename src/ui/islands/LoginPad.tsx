/** Accesso: tocca il tuo nome, digita il PIN di 4 cifre. Invio automatico all'ultima cifra. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { initials } from '../../utils/text';
import { Icon } from '../components/Icon';

export interface LoginPadProps {
  people: Array<{ id: string; name: string }>;
  showNames: boolean;
  next: string;
}

type Status = { kind: 'idle' } | { kind: 'checking' } | { kind: 'error'; message: string } | { kind: 'locked'; seconds: number } | { kind: 'ok' };

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function LoginPad({ people, showNames, next }: LoginPadProps) {
  const [person, setPerson] = useState<{ id?: string; name: string } | null>(null);
  const [typedName, setTypedName] = useState('');
  const [pin, setPinState] = useState('');
  const pinRef = useRef('');
  const setPin = useCallback((value: string) => {
    pinRef.current = value;
    setPinState(value);
  }, []);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shake, setShake] = useState(0);

  const submit = useCallback(
    async (fullPin: string) => {
      if (!person) return;
      setStatus({ kind: 'checking' });
      try {
        await api('/api/login', { userId: person.id, name: person.id ? undefined : person.name, pin: fullPin });
        setStatus({ kind: 'ok' });
        window.location.href = next;
      } catch (error) {
        setPin('');
        setShake((s) => s + 1);
        if (error instanceof ApiError && error.code === 'LOCKED') {
          setStatus({ kind: 'locked', seconds: Number(error.data?.retryAfter ?? 60) });
        } else {
          setStatus({ kind: 'error', message: error instanceof ApiError ? error.message : 'Connessione assente: riprova.' });
        }
      }
    },
    [person, next, setPin],
  );

  const press = useCallback(
    (digit: string) => {
      if (status.kind === 'checking' || status.kind === 'locked' || status.kind === 'ok') return;
      if (pinRef.current.length >= 4) return;
      if (navigator.vibrate) navigator.vibrate(8);
      const value = pinRef.current + digit;
      setPin(value);
      if (status.kind === 'error') setStatus({ kind: 'idle' });
      if (value.length === 4) void submit(value);
    },
    [status.kind, submit, setPin],
  );

  const erase = useCallback(() => setPin(pinRef.current.slice(0, -1)), [setPin]);

  useEffect(() => {
    if (!person) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') erase();
      else if (e.key === 'Escape') setPerson(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [person, press, erase]);

  useEffect(() => {
    if (status.kind !== 'locked') return;
    if (status.seconds <= 0) {
      setStatus({ kind: 'idle' });
      return;
    }
    const t = window.setTimeout(() => setStatus({ kind: 'locked', seconds: status.seconds - 1 }), 1000);
    return () => window.clearTimeout(t);
  }, [status]);

  if (!person) {
    if (!showNames) {
      return (
        <form
          className="login-name"
          onSubmit={(e) => {
            e.preventDefault();
            if (typedName.trim()) setPerson({ name: typedName.trim() });
          }}
        >
          <label className="field">
            <span className="field__label">Il tuo nome</span>
            <input className="input input--big" value={typedName} onChange={(e) => setTypedName(e.target.value)} autoComplete="username" autoCapitalize="words" required />
          </label>
          <button className="btn btn--primary btn--block" type="submit">
            Continua
          </button>
        </form>
      );
    }
    if (people.length === 0) {
      return (
        <p className="login-empty">
          Gli accessi non sono ancora pronti: l’organizzatore deve impostare i PIN. Riprova tra poco.
        </p>
      );
    }
    return (
      <div className="who">
        <h2 className="who__title">Chi sei?</h2>
        <ul className="who__grid">
          {people.map((p) => (
            <li key={p.id}>
              <button type="button" className="who__person" onClick={() => setPerson(p)}>
                <span className="avatar" aria-hidden="true">
                  {initials(p.name)}
                </span>
                <span className="who__name">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const locked = status.kind === 'locked';
  return (
    <div className="pinpad">
      <button
        type="button"
        className="pinpad__back"
        onClick={() => {
          setPerson(null);
          setPin('');
          setStatus({ kind: 'idle' });
        }}
      >
        <Icon name="back" size={18} /> Non sei {person.name}?
      </button>
      <h2 className="pinpad__hello">Ciao {person.name}</h2>
      <p className="pinpad__hint" id="pin-hint">
        {locked ? `Troppi tentativi. Riprova tra ${status.seconds} s.` : status.kind === 'error' ? status.message : 'Inserisci il tuo PIN di 4 cifre'}
      </p>
      <div key={shake} className={`pinpad__dots${shake ? ' is-shaking' : ''}${status.kind === 'error' ? ' is-error' : ''}`} aria-live="polite" aria-describedby="pin-hint">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pinpad__dot${i < pin.length ? ' is-filled' : ''}`} />
        ))}
        <span className="sr-only">{pin.length} cifre su 4</span>
      </div>
      <div className="pinpad__keys" role="group" aria-label="Tastierino">
        {KEYS.map((k) => (
          <button type="button" key={k} className="key" onClick={() => press(k)} disabled={locked}>
            {k}
          </button>
        ))}
        <span className="key key--spacer" aria-hidden="true">
          {status.kind === 'checking' || status.kind === 'ok' ? <span className="spinner" /> : null}
        </span>
        <button type="button" className="key" onClick={() => press('0')} disabled={locked}>
          0
        </button>
        <button type="button" className="key key--erase" onClick={erase} aria-label="Cancella" disabled={locked || pin.length === 0}>
          <Icon name="back" size={24} />
        </button>
      </div>
    </div>
  );
}
