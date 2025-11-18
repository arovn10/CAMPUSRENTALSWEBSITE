'use client'

import PipelineProperties from '@/components/PipelineProperties'

export default function PipelineTrackerProperties() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Properties</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-text">
          View and manage all properties in your portfolio
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <PipelineProperties />
      </div>
    </div>
  )
}

