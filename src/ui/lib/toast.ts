/** Messaggi brevi in basso allo schermo. Funziona da qualunque isola. */
export function toast(message: string, tone: 'ok' | 'error' | 'info' = 'info'): void {
  if (typeof document === 'undefined') return;
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.className = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;
  el.textContent = message;
  host.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => el.remove(), 260);
  }, tone === 'error' ? 4200 : 2600);
}

/** Messaggio da mostrare dopo il prossimo caricamento di pagina. */
export function toastAfterNavigation(message: string, tone: 'ok' | 'error' | 'info' = 'ok'): void {
  try {
    sessionStorage.setItem('pc-toast', JSON.stringify({ message, tone }));
  } catch {
    /* modalità privata: pazienza */
  }
}

export function flushPendingToast(): void {
  try {
    const raw = sessionStorage.getItem('pc-toast');
    if (!raw) return;
    sessionStorage.removeItem('pc-toast');
    const { message, tone } = JSON.parse(raw) as { message: string; tone: 'ok' | 'error' | 'info' };
    toast(message, tone);
  } catch {
    /* niente */
  }
}
