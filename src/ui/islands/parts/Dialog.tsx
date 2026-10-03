/** Finestra modale accessibile basata su <dialog>. */
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'danger';
  wide?: boolean;
}

export function Dialog({ open, title, onClose, children, footer, tone = 'default', wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add('has-dialog');
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.classList.remove('has-dialog');
  }, [open]);

  useEffect(() => () => document.documentElement.classList.remove('has-dialog'), []);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${tone}${wide ? ' dialog--wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="dialog__panel">
          <header className="dialog__head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Chiudi">
              <Icon name="x" />
            </button>
          </header>
          <div className="dialog__body">{children}</div>
          {footer ? <footer className="dialog__foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
