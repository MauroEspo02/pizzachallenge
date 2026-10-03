/** Guscio dell'area admin: barra laterale su desktop, schede scorrevoli su telefono. */
import type { ReactNode } from 'react';
import { STATUS_INFO, type EventStatus } from '../../features/event/state-machine';
import { Brand, cx } from '../components/base';
import { Icon, type IconName } from '../components/Icon';
import { Island } from '../islands';
import { Document } from './Document';

export type AdminSection = 'dashboard' | 'pizze' | 'partecipanti' | 'voti' | 'ingredienti' | 'registro' | 'impostazioni' | 'anteprima';

const LINKS: Array<{ key: AdminSection; href: string; label: string; icon: IconName }> = [
  { key: 'dashboard', href: '/admin', label: 'Dashboard', icon: 'home' },
  { key: 'pizze', href: '/admin/pizze', label: 'Pizze', icon: 'pizza' },
  { key: 'partecipanti', href: '/admin/partecipanti', label: 'Partecipanti', icon: 'users' },
  { key: 'voti', href: '/admin/voti', label: 'Voti', icon: 'grid' },
  { key: 'ingredienti', href: '/admin/ingredienti', label: 'Ingredienti', icon: 'leaf' },
  { key: 'registro', href: '/admin/registro', label: 'Registro', icon: 'clock' },
  { key: 'impostazioni', href: '/admin/impostazioni', label: 'Impostazioni', icon: 'settings' },
];

export interface AdminShellProps {
  title: string;
  section: AdminSection;
  status: EventStatus;
  eventName: string;
  rev: string;
  devPassword?: boolean;
  children: ReactNode;
}

export function AdminShell(props: AdminShellProps) {
  return (
    <Document title={`${props.title} · Admin`}>
      <div className="admin">
        <aside className="admin__side">
          <div className="admin__brand">
            <a href="/admin">
              <Brand size="s" />
            </a>
            <span className="admin__tag">Admin</span>
          </div>
          <p className="admin__event">
            {props.eventName}
            <span className={`status-dot status-dot--${props.status}`}>{STATUS_INFO[props.status].label}</span>
          </p>
          <nav className="admin__nav" aria-label="Sezioni admin">
            {LINKS.map((l) => (
              <a key={l.key} href={l.href} className={cx('admin__link', props.section === l.key && 'is-active')} aria-current={props.section === l.key ? 'page' : undefined}>
                <Icon name={l.icon} size={20} />
                <span>{l.label}</span>
              </a>
            ))}
          </nav>
          <div className="admin__foot">
            <a className="admin__link" href="/">
              <Icon name="pizza" size={20} />
              <span>Apri l’app</span>
            </a>
            <form method="post" action="/admin/esci">
              <button className="admin__link" type="submit">
                <Icon name="logout" size={20} />
                <span>Esci dall’admin</span>
              </button>
            </form>
          </div>
        </aside>
        <main className="admin__main" id="main">
          {props.devPassword ? (
            <p className="devnote">
              Ambiente di sviluppo: la password admin è quella predefinita. In produzione impostala con la variabile ADMIN_PASSWORD.
            </p>
          ) : null}
          {props.children}
        </main>
        <Island name="LiveSync" props={{ endpoint: '/api/admin/live', rev: props.rev, mode: 'banner', intervalMs: 5000 }} />
      </div>
    </Document>
  );
}

export function AdminHeader({ title, children, lead }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="admin-head">
      <div>
        <h1 className="admin-head__title">{title}</h1>
        {lead ? <p className="admin-head__lead">{lead}</p> : null}
      </div>
      {children ? <div className="admin-head__actions">{children}</div> : null}
    </header>
  );
}
