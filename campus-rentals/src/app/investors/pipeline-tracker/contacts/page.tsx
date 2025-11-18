'use client'

import { useState } from 'react'
import PipelineContacts from '@/components/PipelineContacts'
import CRMContacts from '@/components/CRMContacts'

export default function PipelineTrackerContacts() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'entities'>('contacts')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Contacts</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-text">
          Manage your contacts and entities
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'contacts'
              ? 'border-accent text-accent'
              : 'border-transparent text-text hover:text-secondary'
          }`}
        >
          Contacts
        </button>
        <button
          onClick={() => setActiveTab('entities')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'entities'
              ? 'border-accent text-accent'
              : 'border-transparent text-text hover:text-secondary'
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

