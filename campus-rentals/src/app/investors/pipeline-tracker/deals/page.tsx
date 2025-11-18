'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CRMDealPipeline from '@/components/CRMDealPipeline'

export default function PipelineTrackerDeals() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
        <p className="mt-2 text-gray-600">Manage and track all your deals</p>
      </div>

      {/* Deals Pipeline View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CRMDealPipeline />
      </div>
    </div>
  )
}

