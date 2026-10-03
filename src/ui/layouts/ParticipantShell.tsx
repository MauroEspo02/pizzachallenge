/** Guscio delle pagine dei partecipanti: piastrelle, intestazione, navigazione in basso, aggiornamento live. */
import type { ReactNode } from 'react';
import { Brand, cx, TileBand } from '../components/base';
import { Icon } from '../components/Icon';
import { Island } from '../islands';
import { Document } from './Document';

export type NavKey = 'pizze' | 'crea' | 'verdetto' | null;

export interface ParticipantShellProps {
  title: string;
  user: { name: string };
  hasAdmin: boolean;
  nav: NavKey;
  canCreate: boolean;
  resultsVisible: boolean;
  rev: string;
  liveMode?: 'reload' | 'banner';
  hideNav?: boolean;
  children: ReactNode;
}

export function ParticipantShell(props: ParticipantShellProps) {
  return (
    <Document title={props.title}>
      <div className={cx('app', props.hideNav && 'app--no-nav')}>
        <TileBand />
        <header className="topbar">
          <a href="/" className="topbar__brand" aria-label="Pizza Challenge, torna alle pizze">
            <Brand size="s" />
          </a>
          <Island name="AccountMenu" props={{ name: props.user.name, hasAdmin: props.hasAdmin }} />
        </header>
        <main className="main" id="main">
          {props.children}
        </main>
        {props.hideNav ? null : (
          <nav className="tabbar" aria-label="Navigazione principale">
            <a href="/" className={cx('tabbar__item', props.nav === 'pizze' && 'is-active')} aria-current={props.nav === 'pizze' ? 'page' : undefined}>
              <Icon name="pizza" size={24} />
              <span>Pizze</span>
            </a>
            {props.canCreate ? (
              <a href="/crea" className={cx('tabbar__item', props.nav === 'crea' && 'is-active')} aria-current={props.nav === 'crea' ? 'page' : undefined}>
                <Icon name="peel" size={24} />
                <span>Crea</span>
              </a>
            ) : null}
            <a href="/risultati" className={cx('tabbar__item', props.nav === 'verdetto' && 'is-active', props.resultsVisible && 'is-hot')} aria-current={props.nav === 'verdetto' ? 'page' : undefined}>
              <Icon name={props.resultsVisible ? 'seal' : 'lock'} size={24} />
              <span>Verdetto</span>
            </a>
          </nav>
        )}
        <Island name="LiveSync" props={{ endpoint: '/api/live', rev: props.rev, mode: props.liveMode ?? 'reload' }} />
      </div>
    </Document>
  );
}
