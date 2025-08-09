'use client';

import { useState, useEffect } from 'react';

interface CacheStats {
  totalCached: number;
  cacheSize: string;
  lastUpdated: Date | null;
}

export default function CoordinateCacheAdmin() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/cache-coordinates');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAction = async (action: string) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/cache-coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message || 'Operation completed successfully');
        setMessageType('success');
        
        if (action === 'geocode-all-properties' && data.results) {
          setMessage(
            `Geocoded ${data.results.successful} addresses successfully, ${data.results.failed} failed out of ${data.results.total} total addresses`
          );
        }
        
        // Refresh stats
        await fetchStats();
      } else {
        setMessage(data.error || 'Operation failed');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error occurred');
      setMessageType('error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
          Coordinate Cache Management
        </h1>

        {/* Cache Statistics */}
        <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm mb-8">
          <h2 className="text-2xl font-bold mb-4">Cache Statistics</h2>
          {stats ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-accent">Total Cached</h3>
                <p className="text-2xl font-bold">{stats.totalCached}</p>
                <p className="text-sm text-gray-400">Addresses</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-accent">Cache Size</h3>
                <p className="text-2xl font-bold">{stats.cacheSize}</p>
                <p className="text-sm text-gray-400">Disk space</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-accent">Last Updated</h3>
                <p className="text-sm font-medium">
                  {stats.lastUpdated 
                    ? new Date(stats.lastUpdated).toLocaleString()
                    : 'Never'
                  }
                </p>
                <p className="text-sm text-gray-400">Cache file</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            messageType === 'success' ? 'bg-green-600/20 border border-green-600/30 text-green-100' :
            messageType === 'error' ? 'bg-red-600/20 border border-red-600/30 text-red-100' :
            'bg-blue-600/20 border border-blue-600/30 text-blue-100'
          }`}>
            <p>{message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6">Cache Actions</h2>
          
          <div className="grid gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Geocode All Properties</h3>
              <p className="text-gray-400 mb-4">
                Fetch all properties and geocode their addresses to cache coordinates for map markers.
              </p>
              <button
                onClick={() => handleAction('geocode-all-properties')}
                disabled={loading}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Geocode All Properties'}
              </button>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Clear Cache</h3>
              <p className="text-gray-400 mb-4">
                Clear all cached coordinates. This will force re-geocoding on next access.
              </p>
              <button
                onClick={() => handleAction('clear')}
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-600/90 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Clear Cache'}
              </button>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Refresh Stats</h3>
              <p className="text-gray-400 mb-4">
                Refresh the cache statistics displayed above.
              </p>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh Stats
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm mt-8">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="space-y-3 text-gray-300">
            <p>
              • <strong>Coordinate Caching:</strong> Property addresses are geocoded using Google Maps API and cached locally
            </p>
            <p>
              • <strong>Map Markers:</strong> Cached coordinates ensure map markers show up immediately
            </p>
            <p>
              • <strong>Automatic Fallback:</strong> If external API is down, test data with coordinates is used
            </p>
            <p>
              • <strong>Performance:</strong> Cached coordinates avoid repeated API calls and improve map loading speed
            </p>
            <p>
              • <strong>Cache Duration:</strong> Coordinates are cached for 30 days before requiring refresh
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
