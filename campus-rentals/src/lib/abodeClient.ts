/**
 * Abode/Abodingo backend API client.
 * Mirrors the same logic and behavior as abodingo-website (apiRequest, error handling, paths).
 * Use this for all outbound calls to the Abode backend; Campus Rentals data stays in our DB/API.
 *
 * @see abodingo-website/website/src/lib/api.ts
 * @see abodingo-website/website/src/lib/api-clients/base-api-client.ts
 */

import { ABODE_API_BASE_URL } from '@/lib/apiConfig';

export type AbodeRequestOptions = {
  /** Do not attach Authorization header (e.g. for public property list). */
  skipAuth?: boolean;
  /** Optional Bearer token; when not provided, no Authorization header is sent (server-side). */
  token?: string | null;
};

function buildUrl(base: string, path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path.startsWith('http') ? path : path.replace(/^\//, ''), base.endsWith('/') ? base : base + '/');
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

/**
 * Normalize property update body (matches Abodingo: amenities managed separately, never send here).
 */
function normalizePropertyUpdateBody(url: string, body: unknown): unknown {
  if (!url.includes('/property/update') && !url.includes('property/update')) return body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { updatedProperty: {} };
  const b = body as Record<string, unknown>;
  const hasWrapper = b.updatedProperty != null || (b as any).UpdatedProperty != null;
  const basePayload = hasWrapper ? (b.updatedProperty ?? (b as any).UpdatedProperty) : body;
  const sanitized =
    basePayload && typeof basePayload === 'object' && !Array.isArray(basePayload)
      ? { ...(basePayload as Record<string, unknown>) }
      : {};
  delete sanitized.amenities;
  delete sanitized.Amenities;
  return { updatedProperty: sanitized };
}

/**
 * Single request function matching abodingo apiRequest behavior:
 * - 401 → Unauthorized
 * - 404 GET → []; 404 other → parsed or throw
 * - "not found" / "no ... found" in body → GET [] or { success: true }
 * - 502/503 → friendly message
 * - !ok → parse backend message/error/details/innerException, then throw
 * - Empty body → GET [] else { success: true }
 * - JSON parse with content-type or fallback
 */
export async function abodeRequest<T = unknown>(
  method: string,
  path: string,
  options?: { body?: unknown; query?: Record<string, string | number | boolean | undefined>; skipAuth?: boolean; token?: string | null }
): Promise<T> {
  const base = ABODE_API_BASE_URL.replace(/\/?$/, '');
  const fullUrl = buildUrl(base, path.startsWith('/') ? path.slice(1) : path, options?.query);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!options?.skipAuth && options?.token) headers['Authorization'] = `Bearer ${options.token}`;
  const normalizedBody = normalizePropertyUpdateBody(path, options?.body);
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: normalizedBody != null ? JSON.stringify(normalizedBody) : undefined,
  });

  const responseText = await res.text();

  if (res.status === 401) {
    throw new Error('Unauthorized');
  }

  if (res.status === 404) {
    if (method === 'GET') return [] as T;
    let msg = 'Not found';
    try {
      const parsed = JSON.parse(responseText);
      if (parsed && typeof parsed === 'object' && (parsed.success === false || parsed.message)) return parsed as T;
      if (parsed?.message) msg = parsed.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (res.status === 200) {
    const lower = responseText.toLowerCase();
    if (lower.includes('no showings found') || lower.includes('no attendees found') || lower.includes('not found')) {
      return (method === 'GET' ? [] : { success: true, message: responseText }) as T;
    }
  }

  if (!res.ok) {
    let backendMessage = responseText?.trim() || '';
    let errorDetails = '';
    try {
      const parsed = JSON.parse(responseText);
      if (parsed && typeof parsed === 'object') {
        backendMessage = parsed.message ?? parsed.error ?? backendMessage;
        if (parsed.details) errorDetails = ` Details: ${parsed.details}`;
        if (parsed.innerException) errorDetails += ` Inner: ${parsed.innerException}`;
      }
    } catch {
      // ignore
    }
    if (res.status === 502) {
      throw new Error('Backend server is temporarily unavailable (502 Bad Gateway). Please try again later.');
    }
    if (res.status === 503) {
      throw new Error(
        backendMessage
          ? `Backend server is temporarily unavailable. ${backendMessage}`
          : 'Backend server is temporarily unavailable (503 Service Unavailable). Please try again later.'
      );
    }
    const summary = backendMessage
      ? `status: ${res.status}, message: ${backendMessage}${errorDetails}`
      : `status: ${res.status}, message: ${res.statusText}`;
    throw new Error(`HTTP error! ${summary}, url: ${fullUrl}`);
  }

  if (!responseText.trim()) {
    return (method === 'GET' ? [] : { success: true }) as T;
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      return JSON.parse(responseText) as T;
    } catch {
      return { message: responseText, success: true } as T;
    }
  }
  try {
    return JSON.parse(responseText) as T;
  } catch {
    return (method === 'GET' ? [] : { message: responseText, success: true }) as T;
  }
}

/**
 * API surface aligned with Abodingo base-api-client (properties, photos, amenities).
 * Paths match AbodeBackend Routing / PhotosRouting / Amenities.
 */
export const abodeApi = {
  properties: {
    getByUsername: (username: string) => abodeRequest<unknown[]>('GET', `property/${encodeURIComponent(username)}`, { skipAuth: true }),
    getById: (id: number) => abodeRequest<unknown>('GET', `propertyfromID/${id}`, { skipAuth: true }),
  },
  photos: {
    get: (propertyId: number) => abodeRequest<unknown[]>('GET', `photos/get/${propertyId}`, { skipAuth: true }),
  },
  amenities: {
    getByPropertyId: (propertyId: number) => abodeRequest<unknown>('GET', `amenities/${propertyId}`, { skipAuth: true }),
  },
};

export default abodeApi;
