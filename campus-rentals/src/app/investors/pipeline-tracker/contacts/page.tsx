'use client'

import CRMContacts from '@/components/CRMContacts'

export default function PipelineTrackerContacts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
        <p className="mt-2 text-gray-600">Manage your contacts and relationships</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CRMContacts />
      </div>
    </div>
  )
}

