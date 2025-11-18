'use client'

import PipelineContacts from '@/components/PipelineContacts'

export default function PipelineTrackerContacts() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Contacts</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Manage your contacts and relationships
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <PipelineContacts />
      </div>
    </div>
  )
}

