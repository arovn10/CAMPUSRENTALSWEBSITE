/**
 * API Service for Campus Rentals.
 * Uses the same Abode backend logic as abodingo-website (abodeClient); paths match AbodeBackend.
 * Our investor/data stays in Campus Rentals DB; only property list/photos/amenities come from Abode.
 */
import { abodeApi, abodeRequest } from '@/lib/abodeClient';

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (aligned with short-lived cache for external data)
const MAX_CACHE_SIZE = 20;

const apiCache = new Map<string, { data: unknown; timestamp: number }>();

function getCachedData(key: string): unknown | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  return null;
}

function setCachedData(key: string, data: unknown): void {
  if (apiCache.size >= MAX_CACHE_SIZE) {
    const firstKey = apiCache.keys().next().value;
    if (firstKey) apiCache.delete(firstKey);
  }
  apiCache.set(key, { data, timestamp: Date.now() });
}

async function cachedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = getCachedData(key) as T | null;
  if (cached != null) return cached;
  const data = await fetcher();
  setCachedData(key, data);
  return data;
}

// Property API – same paths as Abodingo base-api-client (property/getByUsername, getById)
export const propertyAPI = {
  getProperties: (): Promise<unknown[]> =>
    cachedGet('property/campusrentalsnola', () => abodeApi.properties.getByUsername('campusrentalsnola')),
  getPropertyById: (id: number): Promise<unknown> =>
    cachedGet(`propertyfromID/${id}`, async () => {
      const raw = await abodeApi.properties.getById(id);
      return Array.isArray(raw) ? raw[0] ?? raw : raw;
    }),
};

// Photo API – same path as Abodingo (photos/get/:id)
export const photoAPI = {
  getPropertyPhotos: (propertyId: number): Promise<unknown[]> =>
    cachedGet(`photos/get/${propertyId}`, () => abodeApi.photos.get(propertyId)),
};

export const apiUtils = {
  clearCache: () => apiCache.clear(),
  getCacheStats: () => ({ size: apiCache.size, entries: Array.from(apiCache.keys()) }),
};

export default {
  property: propertyAPI,
  photo: photoAPI,
  utils: apiUtils,
};

// Re-export for callers that need the low-level request (e.g. future property update)
export { abodeRequest, abodeApi } from '@/lib/abodeClient';
