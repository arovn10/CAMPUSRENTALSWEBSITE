'use client';

import { useState, useEffect } from 'react';

interface CacheStatus {
  isValid: boolean;
  hasData: boolean;
  lastUpdated: string | null;
  propertiesCount: number;
  photosCount: number;
}

export default function CacheAdminPage() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCacheStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cache');
      const data = await response.json();
      setCacheStatus(data);
    } catch (error) {
      console.error('Error fetching cache status:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCache = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      });
      
      if (response.ok) {
        alert('Cache refreshed successfully!');
        await fetchCacheStatus();
      } else {
        alert('Failed to refresh cache');
      }
    } catch (error) {
      console.error('Error refreshing cache:', error);
      alert('Error refreshing cache');
    } finally {
      setRefreshing(false);
    }
  };

  const warmupCache = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/warmup');
      const data = await response.json();
      
      if (response.ok) {
        alert(`Cache warmed up! ${data.propertiesCount} properties loaded.`);
        await fetchCacheStatus();
      } else {
        alert('Failed to warm up cache');
      }
    } catch (error) {
      console.error('Error warming up cache:', error);
      alert('Error warming up cache');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
          Cache Administration
        </h1>

        <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm mb-8">
          <h2 className="text-2xl font-bold mb-6">Cache Status</h2>
          
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
              <span>Loading...</span>
            </div>
          ) : cacheStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">Cache Valid:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    cacheStatus.isValid ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {cacheStatus.isValid ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Has Data:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    cacheStatus.hasData ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {cacheStatus.hasData ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Properties:</span>
                  <span className="ml-2 text-accent font-bold">{cacheStatus.propertiesCount}</span>
                </div>
                <div>
                  <span className="text-gray-400">Photos:</span>
                  <span className="ml-2 text-accent font-bold">{cacheStatus.photosCount}</span>
                </div>
              </div>
              
              {cacheStatus.lastUpdated && (
                <div>
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="ml-2">{new Date(cacheStatus.lastUpdated).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400">Failed to load cache status</p>
          )}
        </div>

        <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6">Actions</h2>
          
          <div className="flex gap-4">
            <button
              onClick={fetchCacheStatus}
              disabled={loading}
              className="px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors duration-300 disabled:opacity-50"
            >
              Refresh Status
            </button>
            
            <button
              onClick={warmupCache}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50"
            >
              Warm Up Cache
            </button>
            
            <button
              onClick={refreshCache}
              disabled={refreshing}
              className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Force Refresh Cache'}
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <h3 className="text-yellow-400 font-bold mb-2">⚠️ Important Notes:</h3>
            <ul className="text-yellow-200 space-y-1 text-sm">
              <li>• Cache automatically refreshes every 24 hours</li>
              <li>• Force refresh will download all images again (may take several minutes)</li>
              <li>• Warm up cache initializes the cache if it's empty</li>
              <li>• Images are cached locally in /public/cached-images/</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 