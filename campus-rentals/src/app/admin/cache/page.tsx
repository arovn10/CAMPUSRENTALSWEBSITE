'use client';

import { useState, useEffect } from 'react';
import { usePerformance } from '../../../hooks/usePerformance';
import { externalAPI } from '../../../utils/clientApi';

interface CacheStatus {
  cacheValid: boolean;
  lastUpdated: string | null;
  propertiesCount: number;
  photosCount: number;
  cachedImagesCount: number;
  geocodingCacheCount: number;
  geocodingAddresses: string[];
  amenitiesCount: number;
}

interface DebugInfo {
  timestamp: string;
  originalAPI: {
    working: boolean;
    propertiesCount: number;
    firstProperty: any;
    testPhotosCount: number;
  };
  cache: {
    valid: boolean;
    hasData: boolean;
    propertiesCount: number;
    photosKeysCount: number;
    metadata: any;
  };
  environment: {
    nodeEnv: string;
    cwd: string;
  };
}

export default function CacheAdminPage() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { metrics, clearAllCaches } = usePerformance();

  const fetchCacheStatus = async () => {
    try {
      console.log('Fetching cache status...');
      const response = await fetch('/api/cache');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Cache data:', data);
        setCacheStatus(data);
      } else {
        console.error('Failed to fetch cache status:', response.status);
        setMessage(`Failed to fetch cache status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching cache status:', error);
      setMessage(`Error fetching cache status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug');
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
      }
    } catch (error) {
      console.error('Error fetching debug info:', error);
    }
  };

  const refreshStatus = async () => {
    setLoading(true);
    await fetchCacheStatus();
    setLoading(false);
  };

  const warmUpCache = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/warmup');
      if (response.ok) {
        setMessage('Cache warmed up successfully');
        await refreshStatus();
      } else {
        setMessage('Failed to warm up cache');
      }
    } catch (error) {
      setMessage('Error warming up cache');
    }
    setRefreshing(false);
  };

  const forceRefreshCache = async () => {
    setForceRefreshing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/force-refresh', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessage(`Force refresh successful: ${data.data.propertiesCount} properties, ${data.data.photosCount} photos`);
        await refreshStatus();
      } else {
        setMessage(`Force refresh failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage('Error during force refresh');
    }
    setForceRefreshing(false);
  };

  const refreshCache = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });
      
      if (response.ok) {
        setMessage('Cache refreshed successfully');
        await refreshStatus();
      } else {
        setMessage('Failed to refresh cache');
      }
    } catch (error) {
      setMessage('Error refreshing cache');
    }
    setRefreshing(false);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
          Cache Administration
        </h1>

        {/* Cache Status */}
        <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm mb-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Cache Status
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Cache Valid:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  cacheStatus?.cacheValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {cacheStatus?.cacheValid ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Cached Images:</span>
                <span className="text-xl font-bold text-accent">{cacheStatus?.cachedImagesCount || 0}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Properties:</span>
                <span className="text-xl font-bold text-accent">{cacheStatus?.propertiesCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Photos:</span>
                <span className="text-xl font-bold text-accent">{cacheStatus?.photosCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Geocoded Addresses:</span>
                <span className="text-xl font-bold text-accent">{cacheStatus?.geocodingCacheCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Amenities:</span>
                <span className="text-xl font-bold text-accent">{cacheStatus?.amenitiesCount || 0}</span>
              </div>
            </div>
          </div>
          {cacheStatus?.lastUpdated && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <span className="text-gray-300">Last Updated: </span>
              <span className="text-accent">{cacheStatus.lastUpdated}</span>
            </div>
          )}
          {cacheStatus?.geocodingAddresses && cacheStatus.geocodingAddresses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-3 text-accent">Geocoded Addresses</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {cacheStatus.geocodingAddresses.map((address, index) => (
                  <div key={index} className="text-sm text-gray-300 bg-gray-800/50 p-2 rounded">
                    {address}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm mb-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Performance Metrics
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">API Cache Size:</span>
                <span className="text-xl font-bold text-accent">{metrics.apiCacheSize}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Cache Status:</span>
                <span className="text-sm text-accent">Active</span>
              </div>
            </div>
            <div className="space-y-4">
              <button
                onClick={clearAllCaches}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors duration-300 w-full"
              >
                Clear API Cache
              </button>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm mb-8">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              Debug Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-accent">Original API</h3>
                <div className="space-y-2 text-sm">
                  <div>Status: <span className={debugInfo.originalAPI.working ? 'text-green-400' : 'text-red-400'}>
                    {debugInfo.originalAPI.working ? 'Working' : 'Failed'}
                  </span></div>
                  <div>Properties: <span className="text-accent">{debugInfo.originalAPI.propertiesCount}</span></div>
                  <div>Test Photos: <span className="text-accent">{debugInfo.originalAPI.testPhotosCount}</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-secondary">Cache System</h3>
                <div className="space-y-2 text-sm">
                  <div>Valid: <span className={debugInfo.cache.valid ? 'text-green-400' : 'text-red-400'}>
                    {debugInfo.cache.valid ? 'Yes' : 'No'}
                  </span></div>
                  <div>Has Data: <span className={debugInfo.cache.hasData ? 'text-green-400' : 'text-red-400'}>
                    {debugInfo.cache.hasData ? 'Yes' : 'No'}
                  </span></div>
                  <div>Properties: <span className="text-accent">{debugInfo.cache.propertiesCount}</span></div>
                  <div>Photo Sets: <span className="text-accent">{debugInfo.cache.photosKeysCount}</span></div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Environment: {debugInfo.environment.nodeEnv} | 
                Working Directory: {debugInfo.environment.cwd}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm mb-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={refreshStatus}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors duration-300 disabled:opacity-50"
            >
              Refresh Status
            </button>
            <button
              onClick={warmUpCache}
              disabled={refreshing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-300 disabled:opacity-50"
            >
              {refreshing ? 'Warming Up...' : 'Warm Up Cache'}
            </button>
            <button
              onClick={refreshCache}
              disabled={refreshing}
              className="px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors duration-300 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Force Refresh Cache'}
            </button>
            <button
              onClick={forceRefreshCache}
              disabled={forceRefreshing}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors duration-300 disabled:opacity-50"
            >
              {forceRefreshing ? 'Force Refreshing...' : 'Nuclear Refresh (Clear & Rebuild)'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm">
            <div className={`p-4 rounded-lg ${
              message.includes('success') || message.includes('successful') 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {message}
            </div>
          </div>
        )}

        {/* Important Notes */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl mt-8">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">⚠️ Important Notes:</h3>
          <ul className="space-y-2 text-yellow-200 text-sm">
            <li>• Cache automatically refreshes every 24 hours</li>
            <li>• Force refresh will download all images again (may take several minutes)</li>
            <li>• Nuclear refresh clears everything and rebuilds from scratch</li>
            <li>• Images are cached locally in /public/cached-images/</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 