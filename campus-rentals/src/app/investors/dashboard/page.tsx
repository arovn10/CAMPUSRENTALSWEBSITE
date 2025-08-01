'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ChartBarIcon, 
  HomeIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  ArrowRightIcon,
  LogoutIcon
} from '@heroicons/react/24/outline';

interface Property {
  id: string;
  name: string;
  address: string;
  price: number;
  photo?: string;
  investmentAmount?: number;
  totalReturn?: number;
  irr?: number;
}

interface PortfolioStats {
  totalInvested: number;
  totalValue: number;
  totalReturn: number;
  averageIrr: number;
  activeProperties: number;
}

export default function InvestorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<PortfolioStats>({
    totalInvested: 0,
    totalValue: 0,
    totalReturn: 0,
    averageIrr: 0,
    activeProperties: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    checkAuth();
    // Load dashboard data
    loadDashboardData();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/investors/login');
        return;
      }
      const userData = await response.json();
      setUser(userData.user);
    } catch (error) {
      router.push('/investors/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load properties and stats
      const [propertiesRes, statsRes] = await Promise.all([
        fetch('/api/investors/properties'),
        fetch('/api/investors/stats')
      ]);

      if (propertiesRes.ok) {
        const propertiesData = await propertiesRes.json();
        setProperties(propertiesData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/investors/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 relative">
                <Image
                  src="/CR-social-media.png"
                  alt="Campus Rentals"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="text-xl font-semibold text-white">Investor Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <LogoutIcon className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Invested</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalInvested)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Return</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalReturn)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Avg. IRR</p>
                <p className="text-2xl font-bold text-white">
                  {formatPercentage(stats.averageIrr)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <HomeIcon className="h-8 w-8 text-indigo-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Properties</p>
                <p className="text-2xl font-bold text-white">
                  {stats.activeProperties}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Your Properties</h2>
            <button className="text-blue-400 hover:text-blue-300 text-sm">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property.id} className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors cursor-pointer">
                <div className="h-48 relative">
                  {property.photo ? (
                    <Image
                      src={property.photo}
                      alt={property.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                      <HomeIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {property.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">
                    {property.address}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Investment:</span>
                      <span className="text-white">
                        {property.investmentAmount ? formatCurrency(property.investmentAmount) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Return:</span>
                      <span className="text-green-400">
                        {property.totalReturn ? formatCurrency(property.totalReturn) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">IRR:</span>
                      <span className="text-blue-400">
                        {property.irr ? formatPercentage(property.irr) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2">
                    <span>View Details</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {properties.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No properties found in your portfolio.</p>
              <p className="text-gray-500 text-sm mt-2">
                Contact your investment manager to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 