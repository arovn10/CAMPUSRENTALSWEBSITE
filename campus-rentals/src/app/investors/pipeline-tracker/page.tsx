'use client'

import { useState, useEffect } from 'react'
import CRMDealPipeline from '@/components/CRMDealPipeline'

export default function PipelineTrackerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pipeline Tracker Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your deal pipeline and key metrics</p>
      </div>

      {/* Pipeline View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CRMDealPipeline />
      </div>
    </div>
  )
}

