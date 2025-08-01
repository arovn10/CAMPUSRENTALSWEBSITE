'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Property {
  id: string;
  propertyId: number;
  name: string;
  address: string;
  description: string;
  price: number;
  photo: string;
  investmentAmount: number;
  totalReturn: number;
  irr: number;
  distributions: any[];
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  school: string;
  leaseTerms: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  acquisitionDate?: string;
  acquisitionPrice?: number;
  currentValue: number;
  occupancyRate?: number;
  monthlyRent?: number;
  annualExpenses?: number;
  capRate?: number;
}

interface Fund {
  id: string;
  name: string;
  description: string;
  fundType: string;
  targetSize: number;
  minimumInvestment: number;
  maximumInvestment: number;
  startDate: string;
  endDate?: string;
  status: string;
  sponsor: {
    firstName: string;
    lastName: string;
    email: string;
  };
  totalInvested: number;
  totalDistributions: number;
  currentValue: number;
  totalReturn: number;
  irr: number;
  utilization: number;
  properties: any[];
  waterfallConfig?: any;
  documents: any[];
  userInvestment?: {
    amount: number;
    date: string;
    preferredReturn: number;
    status: string;
  };
  userDistributions?: any[];
}

interface Document {
  id: string;
  title: string;
  description: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  entityType: string;
  entityId: string;
  entityDetails?: {
    name?: string;
    address?: string;
    description?: string;
  };
  uploadedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

interface PortfolioStats {
  totalInvested: number;
  totalValue: number;
  totalDistributions: number;
  totalReturn: number;
  averageIrr: number;
  activeProperties: number;
  activeFunds: number;
}

export default function InvestorDashboard() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<PortfolioStats>({
    totalInvested: 0,
    totalValue: 0,
    totalDistributions: 0,
    totalReturn: 0,
    averageIrr: 0,
    activeProperties: 0,
    activeFunds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'funds' | 'documents' | 'reports'>('overview');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Poll for new notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(notificationInterval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [propertiesRes, fundsRes, documentsRes, notificationsRes, statsRes] = await Promise.all([
        fetch('/api/investors/properties'),
        fetch('/api/investors/funds'),
        fetch('/api/investors/documents'),
        fetch('/api/investors/notifications'),
        fetch('/api/investors/stats'),
      ]);

      if (propertiesRes.ok) {
        const propertiesData = await propertiesRes.json();
        setProperties(propertiesData);
      }

      if (fundsRes.ok) {
        const fundsData = await fundsRes.json();
        setFunds(fundsData);
      }

      if (documentsRes.ok) {
        const documentsData = await documentsRes.json();
        setDocuments(documentsData);
      }

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData);
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

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/investors/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationsAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/investors/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds,
          isRead: true,
        }),
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id) 
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here's your portfolio overview.</p>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border">
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Notifications</h3>
                    {notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg mb-2 cursor-pointer ${
                          notification.isRead ? 'bg-gray-50' : 'bg-blue-50'
                        }`}
                        onClick={() => markNotificationsAsRead([notification.id])}
                      >
                        <p className="font-medium text-sm text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-gray-500 text-sm">No notifications</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'properties', label: 'Properties' },
              { id: 'funds', label: 'Funds' },
              { id: 'documents', label: 'Documents' },
              { id: 'reports', label: 'Reports' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Portfolio Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600">Total Invested</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.totalInvested)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalValue)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-600">Total Distributions</p>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.totalDistributions)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-600">Average IRR</p>
                  <p className="text-2xl font-bold text-orange-900">{formatPercentage(stats.averageIrr)}</p>
                </div>
              </div>
            </div>

            {/* Recent Properties */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Properties</h2>
                <button
                  onClick={() => setActiveTab('properties')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.slice(0, 3).map((property) => (
                  <div key={property.id} className="border rounded-lg overflow-hidden">
                    <img
                      src={property.photo || '/placeholder.png'}
                      alt={property.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{property.name}</h3>
                      <p className="text-sm text-gray-600">{property.address}</p>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-500">{property.bedrooms} bed, {property.bathrooms} bath</span>
                        <span className="font-medium">{formatCurrency(property.price)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-500">Investment</span>
                        <span className="font-medium">{formatCurrency(property.investmentAmount)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-500">IRR</span>
                        <span className="font-medium text-green-600">{formatPercentage(property.irr)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Funds */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Active Funds</h2>
                <button
                  onClick={() => setActiveTab('funds')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {funds.slice(0, 2).map((fund) => (
                  <div key={fund.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900">{fund.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{fund.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Investment</span>
                        <p className="font-medium">{formatCurrency(fund.userInvestment?.amount || 0)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">IRR</span>
                        <p className="font-medium text-green-600">{formatPercentage(fund.irr)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Utilization</span>
                        <p className="font-medium">{formatPercentage(fund.utilization)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status</span>
                        <p className="font-medium">{fund.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Documents</h2>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {documents.slice(0, 5).map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{document.title}</p>
                        <p className="text-sm text-gray-500">{document.documentType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(document.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(document.fileSize / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <img
                    src={property.photo || '/placeholder.png'}
                    alt={property.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 text-lg">{property.name}</h3>
                    <p className="text-gray-600 mb-4">{property.address}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Property Value</span>
                        <span className="font-medium">{formatCurrency(property.currentValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Your Investment</span>
                        <span className="font-medium">{formatCurrency(property.investmentAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Return</span>
                        <span className="font-medium text-green-600">{formatCurrency(property.totalReturn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">IRR</span>
                        <span className="font-medium text-green-600">{formatPercentage(property.irr)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cap Rate</span>
                        <span className="font-medium">{property.capRate ? formatPercentage(property.capRate) : 'N/A'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/properties/${property.id}`)}
                      className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'funds' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Funds</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {funds.map((fund) => (
                <div key={fund.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{fund.name}</h3>
                      <p className="text-gray-600">{fund.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      fund.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {fund.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Fund Type</p>
                      <p className="font-medium">{fund.fundType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Target Size</p>
                      <p className="font-medium">{formatCurrency(fund.targetSize)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Your Investment</p>
                      <p className="font-medium">{formatCurrency(fund.userInvestment?.amount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fund Utilization</p>
                      <p className="font-medium">{formatPercentage(fund.utilization)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Return</span>
                        <p className="font-medium text-green-600">{formatCurrency(fund.totalReturn)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">IRR</span>
                        <p className="font-medium text-green-600">{formatPercentage(fund.irr)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Distributions</span>
                        <p className="font-medium">{formatCurrency(fund.totalDistributions)}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/investors/funds/${fund.id}`)}
                    className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Fund Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{document.title}</p>
                          <p className="text-sm text-gray-500">{document.description}</p>
                          <p className="text-xs text-gray-400">
                            {document.documentType} • {document.entityType}
                            {document.entityDetails?.name && ` • ${document.entityDetails.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(document.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(document.fileSize / 1024 / 1024).toFixed(1)} MB
                        </p>
                        <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Portfolio Report</h3>
                <p className="text-gray-600 text-sm mb-4">Comprehensive overview of your entire portfolio performance</p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Generate Report
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Tax Report</h3>
                <p className="text-gray-600 text-sm mb-4">Annual tax summary and K-1 generation</p>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                  Generate Report
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Performance Report</h3>
                <p className="text-gray-600 text-sm mb-4">Detailed performance metrics and benchmarking</p>
                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 