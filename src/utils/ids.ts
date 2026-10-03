/** ID univoco (UUID v4) indipendente dal nome, disponibile sia su Cloudflare sia su Node. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Numero casuale a 31 bit usato come seme per le illustrazioni. */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! & 0x7fffffff;
}
