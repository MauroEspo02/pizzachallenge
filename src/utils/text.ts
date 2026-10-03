/** Normalizza un testo per i confronti: minuscolo, senza accenti né punteggiatura, spazi compattati. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`´]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chiave usata per impedire due account attivi con lo stesso nome (es. "Nicolò" = "nicolo"). */
export function nameKey(name: string): string {
  return normalizeText(name);
}

/** Toglie spazi doppi e spazi ai bordi. */
export function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase('it-IT') + value.slice(1);
}

/** "Leticia", "Leticia e Lorenzo", "Guido, Terry e Gigio". */
export function joinNames(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/** Iniziali per gli avatar. */
export function initials(name: string): string {
  const parts = cleanText(name).split(' ').filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + second).toLocaleUpperCase('it-IT');
}

/** Pluralizzazione italiana minima: plural(3, 'pizza', 'pizze'). */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
