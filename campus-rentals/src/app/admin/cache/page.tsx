'use client';

import { useState, useEffect } from 'react';

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

interface LoginForm {
  username: string;
  password: string;
}

export default function CacheAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginForm>({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (loginForm.username === 'campusrentalsnola' && loginForm.password === '15Saratoga!') {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('adminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchCacheStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cache');
      if (response.ok) {
        const data = await response.json();
        setCacheStatus(data);
      } else {
        setMessage(`Failed to fetch cache status: ${response.status}`);
      }
    } catch (error) {
      setMessage(`Error fetching cache status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    await fetchCacheStatus();
  };

  const warmUpCache = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/warmup');
      if (response.ok) {
        const data = await response.json();
        setMessage(`Cache warmed up successfully: ${data.propertiesCount} properties`);
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
    setMessage('🔄 Starting comprehensive refresh of ALL data (bedrooms, bathrooms, descriptions, photos, etc.)...');
    try {
      const response = await fetch('/api/force-refresh', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessage(`✅ COMPREHENSIVE REFRESH SUCCESSFUL! 
          📊 ${data.data.propertiesCount} properties refreshed (ALL fields including descriptions)
          📸 ${data.data.photosCount} photos updated
          🏠 ${data.data.amenitiesCount} amenity sets refreshed
          🖼️ ${data.data.imagesCached} images cached
          ✅ ALL DATA POINTS UPDATED: bedrooms, bathrooms, prices, descriptions, square footage, amenities, photos`);
        await refreshStatus();
      } else {
        setMessage(`❌ Comprehensive refresh failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage('❌ Error during comprehensive refresh');
    }
    setForceRefreshing(false);
  };

  const clearCache = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(`Cache cleared successfully: ${data.clearedFiles} files, ${data.clearedImages} images`);
        await refreshStatus();
      } else {
        setMessage('Failed to clear cache');
      }
    } catch (error) {
      setMessage('Error clearing cache');
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshStatus();
    }
  }, [isAuthenticated]);

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm w-full max-w-md">
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent text-center">
            Admin Login
          </h1>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent"
                placeholder="Enter password"
                required
              />
            </div>
            
            {loginError && (
              <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300 font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Admin Interface
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Cache Administration
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors duration-300"
          >
            Logout
          </button>
        </div>

        {/* Cache Status */}
        <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm mb-6">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Cache Status
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            </div>
          ) : cacheStatus ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Cache Status</div>
                <div className={`text-lg font-bold ${cacheStatus.cacheValid ? 'text-green-400' : 'text-red-400'}`}>
                  {cacheStatus.cacheValid ? 'Valid' : 'Invalid'}
                </div>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Properties</div>
                <div className="text-2xl font-bold text-accent">{cacheStatus.propertiesCount}</div>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Photos</div>
                <div className="text-2xl font-bold text-accent">{cacheStatus.photosCount}</div>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Cached Images</div>
                <div className="text-2xl font-bold text-accent">{cacheStatus.cachedImagesCount}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No cache data available</div>
          )}
          
          {cacheStatus?.lastUpdated && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <span className="text-gray-400">Last Updated: </span>
              <span className="text-accent">{new Date(cacheStatus.lastUpdated).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm mb-6">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Cache Actions
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={refreshStatus}
              disabled={loading}
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors duration-300 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Status'}
            </button>
            
            <button
              onClick={warmUpCache}
              disabled={refreshing}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-300 disabled:opacity-50"
            >
              {refreshing ? 'Warming...' : 'Warm Up Cache'}
            </button>
            
            <button
              onClick={forceRefreshCache}
              disabled={forceRefreshing}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors duration-300 disabled:opacity-50 font-semibold"
            >
              {forceRefreshing ? '🔄 Refreshing ALL Data...' : '🚀 COMPREHENSIVE REFRESH (All Data + Descriptions)'}
            </button>
            
            <button
              onClick={clearCache}
              disabled={refreshing}
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors duration-300 disabled:opacity-50"
            >
              {refreshing ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="bg-gray-900/50 p-4 rounded-xl backdrop-blur-sm mb-6">
            <div className={`p-3 rounded-lg ${
              message.includes('success') || message.includes('successful') 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {message}
            </div>
          </div>
        )}

        {/* Information Panel */}
        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-3 text-blue-400">ℹ️ Cache Information</h3>
          <ul className="space-y-2 text-blue-200 text-sm">
            <li>• <strong>Warm Up Cache:</strong> Fetches data from backend API and stores it locally</li>
            <li>• <strong>Force Refresh:</strong> Completely rebuilds cache with all data and images</li>
            <li>• <strong>Clear Cache:</strong> Removes all cached files and images</li>
            <li>• <strong>Refresh Status:</strong> Updates the current cache status display</li>
            <li>• Cache automatically refreshes every 24 hours</li>
            <li>• Force refresh will download all images again (may take several minutes)</li>
            <li>• <strong>COMPREHENSIVE REFRESH</strong> clears everything and rebuilds from scratch</li>
            <li>• <strong>Refreshes ALL data:</strong> bedrooms, bathrooms, prices, descriptions, square footage, amenities, photos</li>
            <li>• Images are cached locally in /public/cached-images/</li>
            <li>• Use comprehensive refresh when property data changes in your backend</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 