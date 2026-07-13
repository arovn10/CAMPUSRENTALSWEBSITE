'use client'

import PipelineMaps from '@/components/PipelineMaps'

export default function PipelineTrackerMaps() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-900">Maps</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-ink-600">
          View properties and deals on an interactive map
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft ring-1 ring-ink-900/5 p-4 sm:p-6">
        <PipelineMaps />
      </div>
    </div>
  )
}
