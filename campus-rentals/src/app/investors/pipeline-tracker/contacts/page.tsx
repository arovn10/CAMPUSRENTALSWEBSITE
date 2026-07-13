'use client'

import { useState } from 'react'
import PipelineContacts from '@/components/PipelineContacts'
import CRMContacts from '@/components/CRMContacts'

export default function PipelineTrackerContacts() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'entities'>('contacts')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-900">Contacts</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-ink-600">
          Manage your contacts and entities
        </p>
      </div>

      {/* Tabs - high contrast */}
      <div className="flex rounded-lg border border-ink-200 bg-ink-100 p-1 gap-1 inline-flex">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 font-medium text-sm transition-colors rounded-md ${
            activeTab === 'contacts'
              ? 'bg-accent text-white shadow-sm'
              : 'text-ink-600 hover:text-ink-900 hover:bg-ink-200'
          }`}
        >
          Contacts
        </button>
        <button
          onClick={() => setActiveTab('entities')}
          className={`px-4 py-2 font-medium text-sm transition-colors rounded-md ${
            activeTab === 'entities'
              ? 'bg-accent text-white shadow-sm'
              : 'text-ink-600 hover:text-ink-900 hover:bg-ink-200'
          }`}
        >
          Entities
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft ring-1 ring-ink-900/5 p-4 sm:p-6">
        {activeTab === 'contacts' ? <PipelineContacts /> : <CRMContacts />}
      </div>
    </div>
  )
}

