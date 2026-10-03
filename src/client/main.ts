/** Punto d'ingresso nel browser: idrata le isole, registra il service worker, mostra i messaggi in sospeso. */
import { createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { flushPendingToast } from '../ui/lib/toast';
import { ISLAND_LOADERS } from './islands';

function hydrateIslands() {
  document.querySelectorAll<HTMLElement>('[data-island]').forEach((el) => {
    const name = el.dataset.island ?? '';
    const loader = ISLAND_LOADERS[name];
    if (!loader) return;
    let props: Record<string, unknown> = {};
    try {
      props = JSON.parse(el.dataset.props ?? '{}') as Record<string, unknown>;
    } catch {
      return;
    }
    void loader().then((mod) => {
      hydrateRoot(el, createElement(mod.default, props));
    });
  });
}

hydrateIslands();
flushPendingToast();

// Rimuove dall'indirizzo i parametri usati una sola volta (es. ?votata=…).
const url = new URL(window.location.href);
if (url.searchParams.has('votata')) {
  url.searchParams.delete('votata');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
