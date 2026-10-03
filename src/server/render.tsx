import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { html } from './http';

/** Renderizza una pagina React completa in HTML. */
export function page(element: ReactElement, status = 200): Response {
  return html(`<!doctype html>${renderToString(element)}`, status);
}
