import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_INGREDIENTS } from '../../src/pizza-builder/catalog';
import { buildCatalogIndex, matchLabel, parseIngredientText } from '../../src/pizza-builder/match';
import { renderPizzaSvg } from '../../src/pizza-builder/art-input';

const index = buildCatalogIndex(DEFAULT_INGREDIENTS);

test('riconosce sinonimi, plurali ed errori di battitura', () => {
  assert.ok(matchLabel('fior di latte', index));
  assert.ok(matchLabel('mozarella', index));
  assert.ok(matchLabel('Pomodorini', index));
});

test('testo libero: separa e ritrova gli ingredienti', () => {
  const parsed = parseIngredientText('Pomodoro, mozzarella e basilico', index);
  assert.equal(parsed.length, 3);
  assert.ok(parsed.every((p) => p.ingredientId));
});

test('ingrediente sconosciuto: non blocca, grafica generica', () => {
  const parsed = parseIngredientText('lampascioni', index);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.ingredientId, null);
});

test('builder estendibile: un ingrediente nuovo nel catalogo viene riconosciuto e disegnato', () => {
  const extra = { id: 'lampascioni', name: 'Lampascioni', aliases: ['lampascione'], category: 'verdura', visual: 'pieces', layer: 'topping', density: 1, colors: ['#c9a27a'] };
  const idx = buildCatalogIndex([...DEFAULT_INGREDIENTS, extra as never]);
  assert.equal(matchLabel('lampascione', idx), 'lampascioni');
  const svg = renderPizzaSvg(7, [{ label: 'lampascioni', def: extra as never }, { label: 'boh sconosciuto', def: null as never }]);
  assert.match(svg, /<svg/);
});
