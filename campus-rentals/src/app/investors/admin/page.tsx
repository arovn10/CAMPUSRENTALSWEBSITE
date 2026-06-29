'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const ACCENT = '#54AAB1'

type Investor = { id: string; name: string; email: string; role: string }
type PropertyOpt = { id: string; name: string; address: string | null }

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const dateFmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

function token() {
  if (typeof window === 'undefined') return ''
  return (
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  )
}
const authHeaders = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' })

type Tab = 'invites' | 'commitments' | 'calls' | 'announcements' | 'k1'

export default function AdminIMSPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('invites')
  const [investors, setInvestors] = useState<Investor[]>([])
  const [properties, setProperties] = useState<PropertyOpt[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const u = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null
    const role = u ? (() => { try { return JSON.parse(u).role } catch { return null } })() : null
    if (role === 'ADMIN' || role === 'MANAGER') setAllowed(true)
    else { setAllowed(false); router.replace('/investors/dashboard') }
  }, [router])

  useEffect(() => {
    if (!allowed) return
    ;(async () => {
      const res = await fetch('/api/investors/admin/options', { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setInvestors(d.investors || [])
        setProperties(d.properties || [])
      }
    })()
  }, [allowed])

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 3500)
  }

  if (allowed === null) return <div className="p-8 text-gray-500">Loading…</div>
  if (!allowed) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'invites', label: 'Invites' },
    { id: 'commitments', label: 'Commitments' },
    { id: 'calls', label: 'Capital Calls' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'k1', label: 'K-1 / Tax' },
  ]

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Investor Management</h1>
      <p className="mt-1 text-sm text-gray-500">Onboard investors, record commitments, issue capital calls, and broadcast updates.</p>

      {toast && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{toast}</div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === t.id ? 'border-b-2 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            style={tab === t.id ? { borderColor: ACCENT } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'invites' && <InvitesTab properties={properties} onDone={flash} />}
        {tab === 'commitments' && <CommitmentsTab investors={investors} properties={properties} onDone={flash} />}
        {tab === 'calls' && <CallsTab investors={investors} properties={properties} onDone={flash} />}
        {tab === 'announcements' && <AnnouncementsTab properties={properties} onDone={flash} />}
        {tab === 'k1' && <K1Tab investors={investors} onDone={flash} />}
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2'
const ring = { ['--tw-ring-color' as any]: ACCENT }
const btn = 'rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      {children}
    </div>
  )
}

/* ───────── Invites ───────── */
function InvitesTab({ properties, onDone }: { properties: PropertyOpt[]; onDone: (m: string) => void }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('INVESTOR')
  const [propertyId, setPropertyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [invites, setInvites] = useState<any[]>([])
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/investors/invites', { headers: authHeaders() })
    if (res.ok) setInvites((await res.json()).invites || [])
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    setErr('')
    setBusy(true)
    try {
      const res = await fetch('/api/investors/invites', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email, firstName, lastName, role, propertyId: propertyId || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      onDone(`Invite sent to ${email}${d.emailed ? '' : ' (email not configured — link created)'}`)
      setEmail(''); setFirstName(''); setLastName(''); setPropertyId('')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Invite an investor">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={inputCls} style={ring} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className={inputCls} style={ring} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="INVESTOR">Investor</option>
            <option value="MANAGER">Manager</option>
          </select>
          <input className={inputCls} style={ring} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className={inputCls} style={ring} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <select className={inputCls} style={ring} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Grant deal access (optional)…</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <button onClick={submit} disabled={busy || !email} className={`mt-4 ${btn}`} style={{ backgroundColor: ACCENT }}>
          {busy ? 'Sending…' : 'Send invite'}
        </button>
      </Section>

      <Section title={`Invites (${invites.length})`}>
        {invites.length === 0 ? <p className="text-sm text-gray-400">No invites yet.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
                <tr><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Expires</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 pr-4 text-gray-800">{i.email}</td>
                    <td className="py-2 pr-4 text-gray-600">{i.role}</td>
                    <td className="py-2 pr-4"><span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{i.status}</span></td>
                    <td className="py-2 pr-4 text-gray-500">{dateFmt(i.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

/* ───────── Commitments ───────── */
function CommitmentsTab({ investors, properties, onDone }: { investors: Investor[]; properties: PropertyOpt[]; onDone: (m: string) => void }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<any[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/investors/commitments', { headers: authHeaders() })
    if (res.ok) setRows((await res.json()).commitments || [])
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/investors/commitments', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ userId, amount: Number(amount), propertyId: propertyId || undefined, note: note || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      onDone('Commitment recorded')
      setAmount(''); setNote('')
      load()
    } catch (e) {
      onDone(e instanceof Error ? e.message : 'Failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <Section title="Record a commitment">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select className={inputCls} style={ring} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select investor…</option>
            {investors.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.email})</option>)}
          </select>
          <input className={inputCls} style={ring} type="number" placeholder="Amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className={inputCls} style={ring} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Deal (optional)…</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className={inputCls} style={ring} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button onClick={submit} disabled={busy || !userId || !amount} className={`mt-4 ${btn}`} style={{ backgroundColor: ACCENT }}>
          {busy ? 'Saving…' : 'Record commitment'}
        </button>
      </Section>

      <Section title={`All commitments (${rows.length})`}>
        {rows.length === 0 ? <p className="text-sm text-gray-400">None yet.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
                <tr><th className="py-2 pr-4">Deal</th><th className="py-2 pr-4 text-right">Amount</th><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 text-gray-800">{r.dealName ?? '—'}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{usd(r.amount)}</td>
                    <td className="py-2 pr-4 text-gray-500">{dateFmt(r.committedAt)}</td>
                    <td className="py-2 pr-4 text-gray-600">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

/* ───────── Capital Calls ───────── */
function CallsTab({ investors, properties, onDone }: { investors: Investor[]; properties: PropertyOpt[]; onDone: (m: string) => void }) {
  const [propertyId, setPropertyId] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [allocs, setAllocs] = useState<{ userId: string; amountCalled: string }[]>([{ userId: '', amountCalled: '' }])
  const [busy, setBusy] = useState(false)
  const [calls, setCalls] = useState<any[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/investors/capital-calls', { headers: authHeaders() })
    if (res.ok) setCalls((await res.json()).calls || [])
  }, [])
  useEffect(() => { load() }, [load])

  const total = useMemo(() => allocs.reduce((s, a) => s + (Number(a.amountCalled) || 0), 0), [allocs])

  const submit = async () => {
    setBusy(true)
    try {
      const allocations = allocs
        .filter((a) => a.userId && Number(a.amountCalled) > 0)
        .map((a) => ({ userId: a.userId, amountCalled: Number(a.amountCalled) }))
      const res = await fetch('/api/investors/capital-calls', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ propertyId: propertyId || undefined, description: description || undefined, dueDate: dueDate || undefined, allocations }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      onDone(`Capital call issued to ${d.investors} investor(s)`)
      setDescription(''); setDueDate(''); setAllocs([{ userId: '', amountCalled: '' }])
      load()
    } catch (e) {
      onDone(e instanceof Error ? e.message : 'Failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <Section title="Issue a capital call">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select className={inputCls} style={ring} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Deal (optional)…</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className={inputCls} style={ring} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <input className={inputCls} style={ring} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Per-investor allocations</p>
        <div className="space-y-2">
          {allocs.map((a, idx) => (
            <div key={idx} className="flex gap-2">
              <select
                className={inputCls} style={ring} value={a.userId}
                onChange={(e) => setAllocs((p) => p.map((x, i) => (i === idx ? { ...x, userId: e.target.value } : x)))}
              >
                <option value="">Select investor…</option>
                {investors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <input
                className={inputCls} style={ring} type="number" placeholder="Amount"
                value={a.amountCalled}
                onChange={(e) => setAllocs((p) => p.map((x, i) => (i === idx ? { ...x, amountCalled: e.target.value } : x)))}
              />
              <button
                onClick={() => setAllocs((p) => p.filter((_, i) => i !== idx))}
                className="rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50"
              >✕</button>
            </div>
          ))}
        </div>
        <button onClick={() => setAllocs((p) => [...p, { userId: '', amountCalled: '' }])} className="mt-2 text-sm font-semibold" style={{ color: ACCENT }}>
          + Add investor
        </button>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">Total: <strong>{usd(total)}</strong></span>
          <button onClick={submit} disabled={busy || total <= 0} className={btn} style={{ backgroundColor: ACCENT }}>
            {busy ? 'Issuing…' : 'Issue capital call'}
          </button>
        </div>
      </Section>

      <Section title={`Capital calls (${calls.length})`}>
        {calls.length === 0 ? <p className="text-sm text-gray-400">None yet.</p> : (
          <div className="space-y-3">
            {calls.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{c.dealName ?? 'Investment'} — {usd(c.totalAmount)}</span>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{c.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Issued {dateFmt(c.issuedAt)} · due {dateFmt(c.dueDate)}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {c.responses?.map((r: any) => (
                    <li key={r.id} className="flex justify-between text-gray-600">
                      <span>{r.investor}</span>
                      <span>{usd(r.amountCalled)} · <span className="font-medium">{r.status}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

/* ───────── Announcements ───────── */
function AnnouncementsTab({ properties, onDone }: { properties: PropertyOpt[]; onDone: (m: string) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<any[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/investors/announcements', { headers: authHeaders() })
    if (res.ok) setRows((await res.json()).announcements || [])
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/investors/announcements', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ title, body, propertyId: propertyId || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      onDone(`Broadcast sent to ${d.recipients} investor(s)`)
      setTitle(''); setBody(''); setPropertyId('')
      load()
    } catch (e) {
      onDone(e instanceof Error ? e.message : 'Failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <Section title="Broadcast an announcement">
        <div className="space-y-3">
          <input className={inputCls} style={ring} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={inputCls} style={ring} rows={4} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
          <select className={inputCls} style={ring} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">All investors</option>
            {properties.map((p) => <option key={p.id} value={p.id}>Only investors in {p.name}</option>)}
          </select>
        </div>
        <button onClick={submit} disabled={busy || !title || !body} className={`mt-4 ${btn}`} style={{ backgroundColor: ACCENT }}>
          {busy ? 'Sending…' : 'Broadcast'}
        </button>
      </Section>

      <Section title={`Sent (${rows.length})`}>
        {rows.length === 0 ? <p className="text-sm text-gray-400">No announcements yet.</p> : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">{r.title}</span>
                  <span className="text-xs text-gray-400">{dateFmt(r.createdAt)} · {r.recipientCount} sent</span>
                </div>
                <p className="mt-1 text-gray-600">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

/* ───────── K-1 / Tax ───────── */
function K1Tab({ investors, onDone }: { investors: Investor[]; onDone: (m: string) => void }) {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(String(thisYear - 1))
  const [allocations, setAllocations] = useState<any[] | null>(null)
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploadUserId, setUploadUserId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const compute = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/investors/k1/allocations?year=${year}`, { headers: authHeaders() })
      const d = await res.json()
      if (res.ok) {
        setAllocations(d.allocations || [])
        setTotals(d.totals || null)
      } else onDone(d.error || 'Failed to compute')
    } finally {
      setLoading(false)
    }
  }

  const deliver = async () => {
    if (!uploadUserId || !file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('userId', uploadUserId)
      fd.append('year', year)
      const res = await fetch('/api/investors/k1/deliver', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }, // no Content-Type — browser sets multipart boundary
        body: fd,
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      onDone(`K-1 delivered${d.emailed ? ' + emailed' : ''}`)
      setFile(null); setUploadUserId('')
    } catch (e) {
      onDone(e instanceof Error ? e.message : 'Failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Pre-compute K-1 allocations (CPA worksheet)">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tax year</label>
            <input className={`${inputCls} w-32`} style={ring} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <button onClick={compute} disabled={loading} className={btn} style={{ backgroundColor: ACCENT }}>
            {loading ? 'Computing…' : 'Compute allocations'}
          </button>
        </div>

        {allocations && (
          <div className="mt-4 overflow-x-auto">
            {allocations.length === 0 ? (
              <p className="text-sm text-gray-400">No distributions recorded for {year}.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Investor</th>
                    <th className="py-2 pr-4 text-right">Rental income</th>
                    <th className="py-2 pr-4 text-right">Sale proceeds</th>
                    <th className="py-2 pr-4 text-right">Refinance</th>
                    <th className="py-2 pr-4 text-right">Other</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allocations.map((a) => (
                    <tr key={a.userId}>
                      <td className="py-2 pr-4 text-gray-800">{a.investorName}</td>
                      <td className="py-2 pr-4 text-right text-gray-600">{usd(a.rentalIncome)}</td>
                      <td className="py-2 pr-4 text-right text-gray-600">{usd(a.saleProceeds)}</td>
                      <td className="py-2 pr-4 text-right text-gray-600">{usd(a.refinance)}</td>
                      <td className="py-2 pr-4 text-right text-gray-600">{usd(a.other)}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-gray-900">{usd(a.total)}</td>
                    </tr>
                  ))}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-semibold text-gray-900">
                      <td className="py-2 pr-4">Total</td>
                      <td className="py-2 pr-4 text-right">{usd(totals.rentalIncome)}</td>
                      <td className="py-2 pr-4 text-right">{usd(totals.saleProceeds)}</td>
                      <td className="py-2 pr-4 text-right">{usd(totals.refinance)}</td>
                      <td className="py-2 pr-4 text-right">{usd(totals.other)}</td>
                      <td className="py-2 pr-4 text-right">{usd(totals.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )}
      </Section>

      <Section title="Deliver a finalized K-1 PDF to an investor">
        <p className="mb-3 text-xs text-gray-400">
          The PDF is routed to the selected investor only and emailed to them. It appears in their Documents.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select className={inputCls} style={ring} value={uploadUserId} onChange={(e) => setUploadUserId(e.target.value)}>
            <option value="">Select investor…</option>
            {investors.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.email})</option>)}
          </select>
          <input className={inputCls} style={ring} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button onClick={deliver} disabled={uploading || !uploadUserId || !file} className={`mt-4 ${btn}`} style={{ backgroundColor: ACCENT }}>
          {uploading ? 'Delivering…' : 'Upload & deliver K-1'}
        </button>
      </Section>
    </div>
  )
}
