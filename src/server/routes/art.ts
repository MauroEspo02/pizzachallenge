/** Illustrazioni delle pizze come SVG, generate dal server e messe in cache dal browser. */
import { currentAdmin, currentParticipant } from '../../auth/guards';
import { recipeArtSource } from '../../features/pizzas/repo';
import { renderPizzaSvg } from '../../pizza-builder/art-input';
import { isCategory, LAYERS, type IngredientDef, type Layer } from '../../pizza-builder/types';
import { HttpError, type Router } from '../http';

function parseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function registerArtRoutes(router: Router): void {
  router.get('/art/:id.svg', async (c) => {
    const [participant, admin] = await Promise.all([currentParticipant(c), currentAdmin(c)]);
    if (!participant && !admin) throw new HttpError(401, 'Accedi per vedere le pizze.');
    const source = await recipeArtSource(c.env.DB, c.params.id ?? '');
    if (!source) throw new HttpError(404, 'Pizza non trovata.');
    const items = source.rows.map((row) => {
      const def: IngredientDef | null = row.id
        ? {
            id: row.id,
            name: row.name ?? row.label,
            aliases: [],
            category: row.category && isCategory(row.category) ? row.category : 'altro',
            visual: row.visual ?? 'generic',
            layer: (LAYERS as readonly string[]).includes(row.layer ?? '') ? (row.layer as Layer) : 'topping',
            density: row.density ?? 1,
            colors: parseArray(row.colors),
          }
        : null;
      return { label: row.label, def };
    });
    const svg = renderPizzaSvg(source.recipe.art_seed, items, source.recipe.name);
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        // L'indirizzo contiene una versione: se la pizza cambia, cambia anche l'URL.
        'Cache-Control': c.url.searchParams.has('v') ? 'private, max-age=31536000, immutable' : 'private, no-cache',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  });
}
