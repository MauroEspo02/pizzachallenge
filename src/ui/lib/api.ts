/** Chiamate al server dalle isole (solo browser). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(url: string, body?: unknown, method = 'POST'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Connessione assente: riprova tra un attimo.', 0, 'NETWORK');
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    /* risposta vuota */
  }
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Qualcosa è andato storto. Riprova.';
    throw new ApiError(message, response.status, typeof data.code === 'string' ? data.code : undefined, data);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Qualcosa è andato storto. Riprova.';
}
