'use client'

import { useState } from 'react'
import PipelineContacts from '@/components/PipelineContacts'
import CRMContacts from '@/components/CRMContacts'

export default function PipelineTrackerContacts() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'entities'>('contacts')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contacts</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-600">
          Manage your contacts and entities
        </p>
      </div>

      {/* Tabs - high contrast */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1 gap-1 inline-flex">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 font-medium text-sm transition-colors rounded-md ${
            activeTab === 'contacts'
              ? 'bg-secondary text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200'
          }`}
        >
          Contacts
        </button>
        <button
          onClick={() => setActiveTab('entities')}
          className={`px-4 py-2 font-medium text-sm transition-colors rounded-md ${
            activeTab === 'entities'
              ? 'bg-secondary text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200'
          }`}
        >
          Entities
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        {activeTab === 'contacts' ? <PipelineContacts /> : <CRMContacts />}
      </div>
    </div>
  )
}

