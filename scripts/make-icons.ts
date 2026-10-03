/**
 * Genera le icone dell'app (PWA, iPhone, favicon) e la pizza decorativa della schermata di accesso,
 * usando lo stesso motore di disegno delle pizze. Le immagini prodotte sono già nel repository:
 * rilancialo solo se cambi il disegno (npm run icons).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { DEFAULT_INGREDIENTS } from '../src/pizza-builder/catalog';
import { buildCatalogIndex, parseIngredientText } from '../src/pizza-builder/match';
import { renderPizzaArt, renderPizzaSvg } from '../src/pizza-builder/art-input';
import { pizzaArtToSvg } from '../src/pizza-builder/art';

const root = resolve(import.meta.dirname, '..');
const index = buildCatalogIndex(DEFAULT_INGREDIENTS);
const items = (text: string) => parseIngredientText(text, index).map((p) => ({ label: p.label, def: p.ingredientId ? index.byId.get(p.ingredientId) ?? null : null }));

mkdirSync(resolve(root, 'public/img'), { recursive: true });
mkdirSync(resolve(root, 'public/icons'), { recursive: true });

// Pizza della schermata di accesso: una margherita come si deve.
writeFileSync(resolve(root, 'public/img/pizza-hero.svg'), renderPizzaSvg(73, items('pomodoro, fior di latte, basilico, olio'), 'Pizza margherita'));

// Icona: margherita su fondo farina.
const iconPizza = pizzaArtToSvg(renderPizzaArt(21, items('pomodoro, fior di latte, basilico'), 'icon'));
const inner = iconPizza.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const iconSvg = (pad: number, radius: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="#f5eedf"/><g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">${inner}</g></svg>`;
writeFileSync(resolve(root, 'public/icons/icon.svg'), iconSvg(28, 112));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
async function png(svg: string, size: number, file: string) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#f5eedf">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: resolve(root, 'public/icons', file), omitBackground: false });
}
await png(iconSvg(36, 0), 512, 'icon-512.png');
await png(iconSvg(36, 0), 192, 'icon-192.png');
await png(iconSvg(84, 0), 512, 'maskable-512.png');
await png(iconSvg(22, 0), 180, 'apple-touch-icon.png');
await browser.close();
console.log('Icone generate in public/icons e public/img');
