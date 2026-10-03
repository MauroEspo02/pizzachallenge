/** Struttura HTML comune: meta per iPhone/PWA, font precaricati, CSS e JS dell'app. */
import type { ReactNode } from 'react';

export interface DocumentProps {
  title: string;
  children: ReactNode;
  bodyClass?: string;
  description?: string;
}

export function Document({ title, children, bodyClass, description = 'La gara di pizza napoletana della serata: vota da telefono, scopri il verdetto insieme.' }: DocumentProps) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#F5EEDF" />
        <meta name="color-scheme" content="light" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pizza Challenge" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preload" href="/fonts/sofia-sans.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/sofia-sans-extra-condensed.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href="/assets/app.css" />
        <script type="module" src="/assets/client.js" />
      </head>
      <body className={bodyClass}>
        {children}
        <div id="toasts" className="toasts" aria-live="polite" />
      </body>
    </html>
  );
}
