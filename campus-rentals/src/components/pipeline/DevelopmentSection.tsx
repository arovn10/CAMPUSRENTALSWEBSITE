'use client'

import { useState } from 'react'
import {
  PlusIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline'

export default function DevelopmentSection() {
  const [view, setView] = useState<'timelines' | 'budgets' | 'tasks'>('timelines')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Development Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage timelines, budgets, and construction projects
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('timelines')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              view === 'timelines'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CalendarIcon className="h-5 w-5" />
            Timelines
          </button>
          <button
            onClick={() => setView('budgets')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              view === 'budgets'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CurrencyDollarIcon className="h-5 w-5" />
            Budgets
          </button>
          <button
            onClick={() => setView('tasks')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              view === 'tasks'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ClipboardDocumentCheckIcon className="h-5 w-5" />
            Tasks
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        {view === 'timelines' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Development Timelines</h3>
            <p className="text-slate-600">Timeline management will be displayed here.</p>
          </div>
        )}

        {view === 'budgets' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Budget vs. Actuals</h3>
            <p className="text-slate-600">Budget tracking will be displayed here.</p>
          </div>
        )}

        {view === 'tasks' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Tasks</h3>
            <p className="text-slate-600">Task management will be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

