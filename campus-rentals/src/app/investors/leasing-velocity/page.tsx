'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect to Properties — we no longer use a separate Leasing Velocity report.
 * Investors just need to see properties and when they're available (via the Properties page).
 */
export default function LeasingVelocityRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/investors/properties')
  }, [router])
  return (
    <div className="flex justify-center items-center min-h-[40vh]">
      <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
    </div>
  )
}
