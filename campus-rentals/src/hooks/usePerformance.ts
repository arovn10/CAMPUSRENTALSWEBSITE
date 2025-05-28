import { useEffect, useCallback, useState } from 'react';
import { externalAPI } from '../utils/clientApi';

interface PerformanceMetrics {
  apiCacheSize: number;
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiCacheSize: 0,
  });

  // Update metrics
  const updateMetrics = useCallback(() => {
    const cacheStats = externalAPI.getCacheStats();
    setMetrics({
      apiCacheSize: cacheStats.size,
    });
  }, []);

  // Clear all caches
  const clearAllCaches = useCallback(() => {
    externalAPI.clearCache();
    updateMetrics();
  }, [updateMetrics]);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(updateMetrics, 60000); // Every minute instead of 30 seconds
    return () => clearInterval(interval);
  }, [updateMetrics]);

  return {
    metrics,
    clearAllCaches,
    updateMetrics,
  };
} 