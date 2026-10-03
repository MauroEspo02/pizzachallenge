/** Anteprima viva della pizza: ogni ingrediente è un layer che "cade" sulla pizza quando lo aggiungi. */
import { useEffect, useMemo, useRef } from 'react';
import type { PizzaArt } from '../../../pizza-builder/art';
import { SIZE } from '../../../pizza-builder/art/geometry';

/** Rinomina gli id interni (gradienti) per poter mostrare due anteprime nella stessa pagina. */
function withPrefix(art: PizzaArt, prefix: string | undefined): PizzaArt {
  if (!prefix || prefix === art.uid) return art;
  const swap = (s: string) => s.split(`${art.uid}-`).join(`${prefix}-`);
  return {
    uid: prefix,
    under: swap(art.under),
    dough: swap(art.dough),
    base: { ...art.base, svg: swap(art.base.svg) },
    groups: art.groups.map((g) => ({ ...g, svg: swap(g.svg) })),
  };
}

export function PizzaPreview({ art, title, idPrefix }: { art: PizzaArt; title: string; idPrefix?: string }) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const view = useMemo(() => withPrefix(art, idPrefix), [art, idPrefix]);
  const delay = (i: number) => (mounted.current ? undefined : { animationDelay: `${120 + i * 90}ms` });
  return (
    <svg className="preview-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role={title ? 'img' : 'presentation'} aria-label={title || undefined}>
      <g dangerouslySetInnerHTML={{ __html: view.under + view.dough }} />
      <g key={view.base.key} className="pz-in" style={delay(0)} dangerouslySetInnerHTML={{ __html: view.base.svg }} />
      {view.groups.map((g, i) => (
        <g key={g.key} className="pz-in" data-layer={g.layer} style={delay(i + 1)} dangerouslySetInnerHTML={{ __html: g.svg }} />
      ))}
    </svg>
  );
}
