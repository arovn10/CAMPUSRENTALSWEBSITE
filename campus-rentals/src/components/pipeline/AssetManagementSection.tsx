'use client'

import { useState } from 'react'
import {
  ChartBarIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

export default function AssetManagementSection() {
  const [view, setView] = useState<'metrics' | 'operations' | 'relationships'>('metrics')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Asset Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Track portfolio performance, operations, and relationships
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('metrics')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              view === 'metrics'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ChartBarIcon className="h-5 w-5" />
            Metrics
          </button>
          <button
            onClick={() => setView('operations')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              view === 'operations'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BuildingOffice2Icon className="h-5 w-5" />
            Operations
          </button>
          <button
            onClick={() => setView('relationships')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              view === 'relationships'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserGroupIcon className="h-5 w-5" />
            Relationships
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        {view === 'metrics' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Portfolio Metrics</h3>
            <p className="text-slate-600">Financial and operational metrics will be displayed here.</p>
          </div>
        )}

        {view === 'operations' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Operational Projects</h3>
            <p className="text-slate-600">Operational project management will be displayed here.</p>
          </div>
        )}

        {view === 'relationships' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Vendor Relationships</h3>
            <p className="text-slate-600">Vendor and relationship management will be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

