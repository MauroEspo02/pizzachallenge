/** Componenti di base condivisi da pagine e isole. */
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import type { Dough, PizzaIngredient } from '../../features/pizzas/types';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Il marchio: insegna in condensato, rosso pomodoro. */
export function Brand({ size = 'm' }: { size?: 's' | 'm' | 'xl' }) {
  return (
    <span className={cx('brand', `brand--${size}`)}>
      <span>Pizza</span> <span>Challenge</span>
    </span>
  );
}

/** Fascia di piastrelle (maiolica) in cima allo schermo. */
export function TileBand({ tall = false }: { tall?: boolean }) {
  return <div className={cx('tile-band', tall && 'tile-band--tall')} aria-hidden="true" />;
}

export function PizzaImage({ src, alt, size = 'm', className, eager = false }: { src: string; alt: string; size?: 'xs' | 's' | 'm' | 'l' | 'xl'; className?: string; eager?: boolean }) {
  const px = { xs: 56, s: 76, m: 132, l: 260, xl: 340 }[size];
  return (
    <span className={cx('pizza-img', `pizza-img--${size}`, className)}>
      <img src={src} alt={alt} width={px} height={px} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
    </span>
  );
}

export function DoughBadge({ dough, compact = false }: { dough: Dough | null; compact?: boolean }) {
  if (!dough) return <span className="dough dough--none">Panetto da assegnare</span>;
  return (
    <span className={cx('dough', `dough--${dough.tone}`)}>
      <span className="dough__dot" aria-hidden="true" />
      {compact ? dough.shortName : dough.name}
    </span>
  );
}

/** Numero di degustazione, come il biglietto della fila al banco. */
export function Ticket({ n, large = false }: { n: number; large?: boolean }) {
  return (
    <span className={cx('ticket', large && 'ticket--large')} aria-label={`Pizza numero ${n}`}>
      <span className="ticket__n">n.</span>
      <span className="ticket__num">{n}</span>
    </span>
  );
}

export function Stamp({ children, tone = 'basilico', animate = false }: { children: ReactNode; tone?: 'basilico' | 'pomodoro' | 'forno'; animate?: boolean }) {
  return <span className={cx('stamp', `stamp--${tone}`, animate && 'stamp--slam')}>{children}</span>;
}

export function IngredientChips({ ingredients, small = false }: { ingredients: PizzaIngredient[]; small?: boolean }) {
  return (
    <ul className={cx('chips', small && 'chips--small')} aria-label="Ingredienti">
      {ingredients.map((ing, i) => (
        <li key={`${ing.label}-${i}`} className={cx('chip', !ing.ingredientId && 'chip--unknown')}>
          {ing.label}
        </li>
      ))}
    </ul>
  );
}

export function ButtonLink({ href, children, variant = 'primary', icon, block = false, className }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'basil'; icon?: IconName; block?: boolean; className?: string }) {
  return (
    <a href={href} className={cx('btn', `btn--${variant}`, block && 'btn--block', className)}>
      {icon ? <Icon name={icon} size={20} /> : null}
      <span>{children}</span>
    </a>
  );
}

/** Barra segmentata: un segmento per pizza, nell'ordine di degustazione. */
export function ProgressSegments({ items }: { items: Array<{ id: string; done: boolean; current?: boolean; locked?: boolean }> }) {
  return (
    <div className="segments" role="presentation">
      {items.map((item) => (
        <span key={item.id} className={cx('segments__item', item.done && 'is-done', item.current && 'is-current', item.locked && 'is-locked')} />
      ))}
    </div>
  );
}

export function Notice({ tone = 'info', icon, children }: { tone?: 'info' | 'warn' | 'ok' | 'danger'; icon?: IconName; children: ReactNode }) {
  return (
    <div className={cx('notice', `notice--${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
      {icon ? <Icon name={icon} size={20} /> : null}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, icon = 'pizza' }: { title: string; children?: ReactNode; icon?: IconName }) {
  return (
    <div className="empty">
      <Icon name={icon} size={34} />
      <p className="empty__title">{title}</p>
      {children ? <div className="empty__body">{children}</div> : null}
    </div>
  );
}
