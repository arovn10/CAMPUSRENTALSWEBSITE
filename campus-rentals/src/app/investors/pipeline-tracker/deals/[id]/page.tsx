'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function DealDetailPage() {
  const router = useRouter()
  const params = useParams()
  const dealId = params.id as string

  useEffect(() => {
    // Redirect to the investment detail page
    if (dealId) {
      router.replace(`/investors/investments/${dealId}`)
    }
  }, [dealId, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-blue-200"></div>
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-6 text-slate-600 font-medium">Loading deal details...</p>
      </div>
    </div>
  )
}

