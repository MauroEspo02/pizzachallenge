/** Impostazioni: nome della serata, nomi nella schermata di accesso, panetti. */
import { useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { toast, toastAfterNavigation } from '../lib/toast';
import { Icon } from '../components/Icon';

export interface SettingsFormProps {
  eventName: string;
  showNamesOnLogin: boolean;
  doughs: Array<{ id: string; name: string; shortName: string; tone: string; versions: number }>;
}

const TONES = [
  { key: 'pomodoro', label: 'Pomodoro' },
  { key: 'basilico', label: 'Basilico' },
  { key: 'legno', label: 'Legno' },
  { key: 'forno', label: 'Forno' },
];

export default function SettingsForm({ eventName, showNamesOnLogin, doughs }: SettingsFormProps) {
  const [name, setName] = useState(eventName);
  const [showNames, setShowNames] = useState(showNamesOnLogin);
  const [list, setList] = useState(doughs.map((d) => ({ ...d })));
  const [newDough, setNewDough] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(url: string, body: unknown, message: string) {
    setBusy(true);
    try {
      await api(url, body);
      toastAfterNavigation(message, 'ok');
      window.location.reload();
    } catch (error) {
      setBusy(false);
      toast(errorMessage(error), 'error');
    }
  }

  return (
    <div className="settings">
      <section className="card">
        <h2 className="card__title">La serata</h2>
        <label className="field">
          <span className="field__label">Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <label className="switch">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          <span className="switch__track" aria-hidden="true" />
          <span>Mostra i nomi nella schermata di accesso (basta toccare il proprio nome)</span>
        </label>
        <button type="button" className="btn btn--primary" disabled={busy || !name.trim()} onClick={() => run('/api/admin/settings', { name, showNamesOnLogin: showNames }, 'Impostazioni salvate')}>
          Salva
        </button>
      </section>

      <section className="card">
        <h2 className="card__title">Panetti</h2>
        <ul className="dough-list">
          {list.map((d, i) => (
            <li key={d.id} className="dough-list__row">
              <input className="input" value={d.name} aria-label="Nome del panetto" onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" value={d.shortName} aria-label="Nome breve" onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, shortName: e.target.value } : x)))} />
              <select className="select" value={d.tone} aria-label="Colore" onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, tone: e.target.value } : x)))}>
                {TONES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--small btn--secondary" disabled={busy} onClick={() => run('/api/admin/doughs', d, 'Panetto salvato')}>
                Salva
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                disabled={busy || d.versions > 0}
                title={d.versions > 0 ? 'Usato da alcune pizze: prima cambia il loro panetto' : 'Elimina'}
                aria-label={`Elimina ${d.name}`}
                onClick={() => run(`/api/admin/doughs/${d.id}/delete`, {}, 'Panetto eliminato')}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
        <div className="inline-form">
          <input className="input" value={newDough} onChange={(e) => setNewDough(e.target.value)} placeholder="Es. Panetto Lorenzo" maxLength={40} />
          <button type="button" className="btn btn--secondary" disabled={busy || !newDough.trim()} onClick={() => run('/api/admin/doughs', { name: newDough, shortName: newDough.replace(/^panetto\s+/i, '').slice(0, 24), tone: 'legno' }, 'Panetto aggiunto')}>
            <Icon name="plus" size={18} /> <span>Aggiungi panetto</span>
          </button>
        </div>
      </section>
    </div>
  );
}
