'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BuildingOffice2Icon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface PropertyItem {
  id: string
  name: string
  address: string | null
}

export default function InvestorsPropertiesPage() {
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('authToken') || sessionStorage.getItem('token') : null
    if (!token) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/investors/investments', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          setProperties([])
          return
        }
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        const byId = new Map<string, PropertyItem>()
        list.forEach((inv: any) => {
          const p = inv.property
          if (p?.id && !byId.has(p.id)) {
            byId.set(p.id, {
              id: p.id,
              name: p.name || 'Unknown',
              address: p.address || null,
            })
          }
        })
        setProperties(Array.from(byId.values()))
      } catch {
        setProperties([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = properties.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6" style={{ fontFamily: 'var(--font-sans)' }}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Properties</h1>
        <p className="text-slate-600 mt-1">
          Your properties and when they’re available — view listings on the website for availability and lease details.
        </p>
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 text-slate-900"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <BuildingOffice2Icon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">
            {properties.length === 0 ? 'No properties in your portfolio yet.' : 'No properties match your search.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">{p.name}</h2>
                  {p.address && (
                    <div className="flex items-center gap-1.5 mt-1 text-slate-600 text-sm">
                      <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{p.address}</span>
                    </div>
                  )}
                </div>
                <Link
                  href={`/properties/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-white text-sm font-medium rounded-lg hover:bg-primary transition-colors shrink-0"
                >
                  View availability
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
