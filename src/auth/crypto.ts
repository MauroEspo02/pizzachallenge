/**
 * Primitive crittografiche basate su Web Crypto: funzionano identiche su Cloudflare e su Node.
 * I PIN sono di 4 cifre: la vera protezione è il limite ai tentativi (vedi rate-limit.ts)
 * più un "pepe" segreto facoltativo (PIN_PEPPER) che rende inutile una copia rubata del database.
 */
const encoder = new TextEncoder();
const PIN_ITERATIONS = 5000;
const PIN_ALGO = 'pbkdf2-sha256';

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function pbkdf2(secret: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPin(pin: string, pepper = ''): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(`${pin}\u0000${pepper}`, salt, PIN_ITERATIONS);
  return `${PIN_ALGO}$${PIN_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPin(pin: string, stored: string | null, pepper = ''): Promise<boolean> {
  if (!stored) return false;
  const [algo, iterations, salt, hash] = stored.split('$');
  if (algo !== PIN_ALGO || !iterations || !salt || !hash) return false;
  const computed = await pbkdf2(`${pin}\u0000${pepper}`, fromBase64(salt), Number(iterations));
  return timingSafeEqual(computed, fromBase64(hash));
}

/** Confronto a tempo costante di due segreti testuali (password admin). */
export async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b)) && provided.length === expected.length;
}

const TRIVIAL_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '1212', '6969', '1122', '2580', '0852', '1004', '2000', '2025', '2026']);

/** PIN di 4 cifre casuale, evitando quelli banali. */
export function generatePin(): string {
  for (;;) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const pin = String(buf[0]! % 10000).padStart(4, '0');
    if (!TRIVIAL_PINS.has(pin) && !/^(\d)\1\1/.test(pin)) return pin;
  }
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
