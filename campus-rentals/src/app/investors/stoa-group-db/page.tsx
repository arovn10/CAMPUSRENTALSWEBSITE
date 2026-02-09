'use client'

import { useState, useEffect } from 'react'
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  HomeIcon,
  UserCircleIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface EntityRow {
  id: string
  name: string
  type: string | null
  address: string | null
  taxId: string | null
  stateOfFormation: string | null
  formationDate: string | null
  contactPerson: string | null
  contactEmail: string | null
  contactPhone: string | null
  propertyCount: number
  ownerCount: number
  totalInvested: number
}

interface InvestorRow {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string
  company: string | null
  entityName: string | null
  entityType: string | null
  investmentCount: number
  entityCount: number
  totalInvested: number
}

interface PropertyRow {
  id: string
  propertyId: string | null
  name: string
  address: string | null
  dealStatus: string | null
  fundingStatus: string | null
  currentValue: number | null
  totalCost: number | null
  investmentCount: number
}

interface ContactRow {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  company: string | null
  title: string | null
  tags: string[] | null
  createdBy: string | null
}

interface GroupDbData {
  entities: EntityRow[]
  investors: InvestorRow[]
  properties: PropertyRow[]
  contacts: ContactRow[]
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return String(s)
  }
}

export default function GroupDbPage() {
  const [data, setData] = useState<GroupDbData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
    if (!token) {
      setError('Please sign in.')
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        setForbidden(false)
        const res = await fetch('/api/investors/stoa-group-db', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 403) {
          setForbidden(true)
          setLoading(false)
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const detail = body.details ? `: ${body.details}` : ''
          setError((body.error || 'Failed to load Group DB') + detail)
          setLoading(false)
          return
        }
        const json = await res.json()
        setData({
          entities: json.entities ?? [],
          investors: json.investors ?? [],
          properties: json.properties ?? [],
          contacts: json.contacts ?? [],
        })
      } catch (e: any) {
        setError('Failed to load Group DB' + (e?.message ? `: ${e.message}` : ''))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 text-slate-500">
            <CircleStackIcon className="w-6 h-6 animate-pulse" />
            <span>Loading Group DB…</span>
          </div>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Access restricted</h2>
              <p className="text-amber-800 mt-1">Group DB is available only to admins and managers.</p>
            </div>
            </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">{error}</div>
        </div>
      </div>
    )
  }

  const entities = data?.entities ?? []
  const investors = data?.investors ?? []
  const properties = data?.properties ?? []
  const contacts = data?.contacts ?? []

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Group DB</h1>
          <p className="text-slate-600 mt-1">Master data — entities, investors, properties, and contacts.</p>
        </header>

        {/* Entities */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
            <BuildingOffice2Icon className="w-5 h-5" />
            Entities ({entities.length})
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">State / Formation</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Properties</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Owners</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total invested</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 px-4 text-slate-500 text-center">No entities</td></tr>
                  ) : (
                    entities.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-900">{e.name}</td>
                        <td className="py-3 px-4 text-slate-600">{e.type ?? '—'}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {[e.stateOfFormation, formatDate(e.formationDate)].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">{e.propertyCount}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{e.ownerCount}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">{formatCurrency(e.totalInvested)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Investors */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
            <UserGroupIcon className="w-5 h-5" />
            Investors ({investors.length})
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Investments</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Entities</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total invested</th>
                  </tr>
                </thead>
                <tbody>
                  {investors.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 px-4 text-slate-500 text-center">No investors</td></tr>
                  ) : (
                    investors.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{u.email ?? '—'}</td>
                        <td className="py-3 px-4 text-slate-600">{u.role}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{u.investmentCount}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{u.entityCount}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">{formatCurrency(u.totalInvested)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Properties */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
            <HomeIcon className="w-5 h-5" />
            Properties ({properties.length})
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Deal / Funding</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Investors</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Current value</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 px-4 text-slate-500 text-center">No properties</td></tr>
                  ) : (
                    properties.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {[p.dealStatus, p.fundingStatus].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">{p.investmentCount}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(p.currentValue)}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">{formatCurrency(p.totalCost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Contacts */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
            <UserCircleIcon className="w-5 h-5" />
            Contacts ({contacts.length})
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Company / Title</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Tags</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Created by</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 px-4 text-slate-500 text-center">No contacts</td></tr>
                  ) : (
                    contacts.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{c.email ?? '—'}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {[c.company, c.title].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags ?? '—')}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{c.createdBy ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
