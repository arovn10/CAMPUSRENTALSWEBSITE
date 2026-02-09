'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy route: Contacts are now under Deal Pipeline at /investors/pipeline-tracker (Contacts tab).
 * Redirect so there is no duplicate contacts page.
 */
export default function ContactsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/investors/pipeline-tracker/contacts')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
    </div>
  )
}
