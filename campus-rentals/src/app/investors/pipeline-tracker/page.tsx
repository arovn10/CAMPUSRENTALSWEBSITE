'use client'

import CRMDealPipeline from '@/components/CRMDealPipeline'

export default function PipelineTrackerDashboard() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your deals and track their progress through the pipeline</p>
      </div>

      <CRMDealPipeline />
    </div>
  )
}

