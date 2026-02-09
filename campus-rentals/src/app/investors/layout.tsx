'use client'

import { useState, useEffect, type ComponentType } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HomeIcon,
  BanknotesIcon,
  FolderIcon,
  ChartPieIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  DocumentTextIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

type NavItem = {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  path: string
  adminOnly?: boolean
}
const sectionNavBase: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: HomeIcon, path: '/investors/dashboard' },
  { id: 'banking', label: 'Banking', icon: BanknotesIcon, path: '/investors/banking' },
  { id: 'pipeline', label: 'Deal Pipeline', icon: FolderIcon, path: '/investors/pipeline-tracker' },
  { id: 'properties', label: 'Properties', icon: BuildingOffice2Icon, path: '/investors/properties' },
  { id: 'portfolio', label: 'Portfolio', icon: ChartPieIcon, path: '/investors/portfolio' },
  { id: 'documents', label: 'Documents', icon: DocumentTextIcon, path: '/investors/documents' },
  { id: 'updates', label: 'Updates', icon: BellIcon, path: '/investors/updates' },
  { id: 'performance', label: 'Performance', icon: ChartBarIcon, path: '/investors/performance' },
  { id: 'profile', label: 'Profile', icon: UserCircleIcon, path: '/investors/profile' },
]

const publicPaths = ['/investors/login']

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ADMIN: { label: 'Admin', className: 'bg-violet-100 text-violet-700 border-violet-200' },
    MANAGER: { label: 'Manager', className: 'bg-sky-100 text-sky-700 border-sky-200' },
    INVESTOR: { label: 'Investor', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  }
  const { label, className } = config[role] || { label: role, className: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold tracking-wide border ${className}`}>
      <ShieldCheckIcon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default function InvestorsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ role?: string; firstName?: string; lastName?: string } | null>(null)

  const isPublic = publicPaths.some((p) => pathname?.startsWith(p))

  useEffect(() => {
    if (isPublic) {
      setAuthorized(true)
      return
    }
    const check = async () => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('authToken') || sessionStorage.getItem('token') : null
      const userStr = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null
      if (userStr && token) {
        try {
          const u = JSON.parse(userStr)
          setCurrentUser(u)
        } catch (_) {}
        setAuthorized(true)
        return
      }
      if (token) {
        try {
          const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          if (res.ok) {
            const data = await res.json()
            const user = data?.user ?? data
            if (user?.id) {
              sessionStorage.setItem('currentUser', JSON.stringify(user))
              setCurrentUser(user)
              setAuthorized(true)
              return
            }
          }
        } catch (_) {}
      }
      setAuthorized(false)
    }
    check()
  }, [pathname, isPublic])

  useEffect(() => {
    if (authorized === false) {
      router.replace('/investors/login')
    }
  }, [authorized, router])

  const handleLogout = () => {
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('currentUser')
    router.push('/')
  }

  if (authorized === null && !isPublic) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center" style={{ fontFamily: 'var(--font-sans)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-600" />
      </div>
    )
  }

  if (isPublic) {
    return <>{children}</>
  }

  const sectionNav = sectionNavBase.filter((item) => !item.adminOnly || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER')
  const currentSection = sectionNav.find(
    (s) => s.path === pathname || (pathname?.startsWith(s.path + '/') && s.path !== '/investors/dashboard')
  )?.id ?? 'overview'

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-800 flex" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar - desktop: Apple-style clean panel */}
      <aside className="hidden lg:flex flex-col w-60 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-sm fixed inset-y-0 left-0 z-40">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" title="Back to main site">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
              <BuildingOffice2Icon className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-[17px] tracking-tight">Campus Rentals</span>
          </Link>
          {currentUser?.role && <RoleBadge role={currentUser.role} />}
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sectionNav.map((item) => {
            const Icon = item.icon
            const active = currentSection === item.id || (item.id === 'pipeline' && pathname?.startsWith('/investors/pipeline-tracker')) || (item.id === 'properties' && pathname?.startsWith('/investors/properties'))
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0 opacity-80" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[15px] font-semibold bg-transparent text-slate-800 hover:text-red-700 hover:bg-red-50 transition-colors border-0 shadow-none"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header - single top bar; no main site header on /investors */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 min-h-[3.5rem] bg-white/95 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-4 z-[100] shadow-sm">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 touch-manipulation"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {sidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
        <Link href="/" className="flex items-center gap-2 min-w-0 flex-1 justify-center hover:opacity-90 transition-opacity" title="Back to main site">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
            <BuildingOffice2Icon className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 truncate">Campus Rentals</span>
          {currentUser?.role && <RoleBadge role={currentUser.role} />}
        </Link>
        <div className="w-10 flex-shrink-0" />
      </div>

      {/* Mobile sidebar overlay - below header so X stays visible */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 top-14 bg-black/40 z-[90]"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`lg:hidden fixed top-14 left-0 bottom-0 w-[min(18rem,85vw)] max-w-[18rem] bg-white border-r border-slate-200 z-[90] transform transition-transform duration-300 ease-out shadow-xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
        aria-label="Main menu"
      >
        <div className="p-4 border-b border-slate-100">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Menu</p>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto">
          {sectionNav.map((item) => {
            const Icon = item.icon
            const active = currentSection === item.id
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold ${
                  active ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => {
              handleLogout()
              setSidebarOpen(false)
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[15px] font-semibold bg-transparent text-slate-700 hover:text-red-700 hover:bg-red-50 mt-4 border-0 shadow-none"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign out
          </button>
        </nav>
      </aside>

      {/* Main content - pt-14 for mobile header; lg: no top padding, sidebar offset */}
      <main className="flex-1 min-h-screen pt-14 lg:pt-0 lg:pl-60">
        <div className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-full">{children}</div>
      </main>
    </div>
  )
}
