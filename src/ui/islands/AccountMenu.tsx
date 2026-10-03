/** Menu personale: nome, installazione sulla Home, area admin, esci. */
import { useState } from 'react';
import { initials } from '../../utils/text';
import { Icon } from '../components/Icon';
import { Dialog } from './parts/Dialog';

export interface AccountMenuProps {
  name: string;
  hasAdmin: boolean;
}

export default function AccountMenu({ name, hasAdmin }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="account" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="avatar avatar--small" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="account__name">{name}</span>
      </button>
      <Dialog open={open} title={name} onClose={() => setOpen(false)}>
        <div className="account-sheet">
          <div className="install">
            <p className="install__title">Mettila sulla schermata Home</p>
            <ol className="install__steps">
              <li>
                Su iPhone apri il sito con Safari e tocca <Icon name="share" size={18} /> Condividi.
              </li>
              <li>Scegli “Aggiungi alla schermata Home”.</li>
              <li>Apri Pizza Challenge dall’icona e accedi un’ultima volta.</li>
            </ol>
          </div>
          {hasAdmin ? (
            <a className="btn btn--secondary btn--block" href="/admin">
              <Icon name="settings" size={20} /> <span>Area admin</span>
            </a>
          ) : null}
          <form method="post" action="/esci">
            <button className="btn btn--ghost btn--block" type="submit">
              <Icon name="logout" size={20} /> <span>Esci</span>
            </button>
          </form>
        </div>
      </Dialog>
    </>
  );
}
