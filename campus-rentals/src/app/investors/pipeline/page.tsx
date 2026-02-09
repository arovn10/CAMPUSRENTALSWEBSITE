'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy route: Deal Pipeline is now at /investors/pipeline-tracker.
 * Redirect so old links and bookmarks don't show a duplicate page.
 */
export default function PipelineRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/investors/pipeline-tracker')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
    </div>
  )
}
