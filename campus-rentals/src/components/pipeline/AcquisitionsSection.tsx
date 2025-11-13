'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import CRMDealPipeline from '@/components/CRMDealPipeline'

export default function AcquisitionsSection() {
  const [view, setView] = useState<'pipeline' | 'underwriting' | 'dueDiligence'>('pipeline')
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Acquisitions Pipeline</h2>
          <p className="text-sm text-slate-600 mt-1">
            Source, track, and close deals with automated pipeline management
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('pipeline')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'pipeline'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setView('underwriting')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'underwriting'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Underwriting
          </button>
          <button
            onClick={() => setView('dueDiligence')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'dueDiligence'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Due Diligence
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'pipeline' && (
        <div>
          <CRMDealPipeline />
        </div>
      )}

      {view === 'underwriting' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Underwriting Database</h3>
          <p className="text-slate-600">Underwriting tools and data will be displayed here.</p>
          {/* Underwriting component will be added */}
        </div>
      )}

      {view === 'dueDiligence' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Due Diligence Checklists</h3>
          <p className="text-slate-600">Due diligence checklists will be displayed here.</p>
          {/* Due diligence component will be added */}
        </div>
      )}
    </div>
  )
}

