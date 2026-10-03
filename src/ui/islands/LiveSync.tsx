/**
 * Tiene la pagina aggiornata durante la serata: interroga il server ogni pochi secondi
 * (solo se la pagina è visibile) e ricarica quando l'admin cambia qualcosa.
 * Non riceve mai voti o punteggi: solo un numero di revisione.
 */
import { useEffect, useRef, useState } from 'react';

export interface LiveSyncProps {
  endpoint: string;
  rev: string;
  mode: 'reload' | 'banner';
  intervalMs?: number;
}

export default function LiveSync({ endpoint, rev, mode, intervalMs = 6000 }: LiveSyncProps) {
  const [stale, setStale] = useState(false);
  const known = useRef(rev);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== 'visible' || stopped) return;
      try {
        const res = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'same-origin' });
        if (res.status === 401 || res.status === 403) {
          window.location.reload();
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { rev?: string };
        if (data.rev && data.rev !== known.current) {
          if (mode === 'reload') window.location.reload();
          else setStale(true);
        }
      } catch {
        /* rete assente: riproveremo */
      }
    };
    const loop = () => {
      timer = window.setTimeout(async () => {
        await check();
        if (!stopped) loop();
      }, intervalMs);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    loop();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [endpoint, mode, intervalMs]);

  if (!stale) return null;
  return (
    <div className="livebar" role="status">
      <span>Ci sono novità dalla cucina.</span>
      <button type="button" className="btn btn--small btn--secondary" onClick={() => window.location.reload()}>
        Aggiorna
      </button>
    </div>
  );
}
