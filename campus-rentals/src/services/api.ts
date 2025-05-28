// API Service for Campus Rentals
// Simplified and optimized for better performance

const API_BASE_URL = 'https://abode-backend.onrender.com/api';
const CACHE_DURATION = 2 * 60 * 1000; // Reduced to 2 minutes to prevent memory issues

// Simplified in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>();

// Limit cache size to prevent memory issues
const MAX_CACHE_SIZE = 20;

// Cache helper functions
const getCachedData = (key: string) => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  // Clear old entries if cache is too large
  if (apiCache.size >= MAX_CACHE_SIZE) {
    const firstKey = apiCache.keys().next().value;
    if (firstKey) {
      apiCache.delete(firstKey);
    }
  }
  
  apiCache.set(key, { data, timestamp: Date.now() });
};

// Simplified API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useCache: boolean = true
): Promise<T> {
  const cacheKey = `${endpoint}`;
  
  // Check cache first for GET requests
  if (useCache && (!options.method || options.method === 'GET')) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful GET responses
    if (useCache && (!options.method || options.method === 'GET')) {
      setCachedData(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Essential property API calls only
export const propertyAPI = {
  getProperties: async (): Promise<any[]> => {
    return apiRequest('/property/campusrentalsnola');
  },
  getPropertyById: async (id: number): Promise<any> => {
    return apiRequest(`/property/${id}`);
  },
};

// Essential photo API calls only
export const photoAPI = {
  getPropertyPhotos: async (propertyId: number): Promise<any[]> => {
    return apiRequest(`/photos/property/${propertyId}`);
  },
};

// Utility functions
export const apiUtils = {
  clearCache: () => {
    apiCache.clear();
  },
  getCacheStats: () => {
    return {
      size: apiCache.size,
      entries: Array.from(apiCache.keys()),
    };
  },
};

// Simplified export
export default {
  property: propertyAPI,
  photo: photoAPI,
  utils: apiUtils,
}; 