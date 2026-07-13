'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  IdentificationIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'

interface Profile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  company: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  mailingAddress: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZipCode: string | null
  mailingCountry: string | null
  taxId: string | null
  entityName: string | null
  entityType: string | null
  entityTaxId: string | null
  dateOfBirth: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  profileImage: string | null
}

type EditableKey =
  | 'firstName' | 'lastName' | 'phone' | 'company'
  | 'address' | 'city' | 'state' | 'zipCode' | 'country'
  | 'mailingAddress' | 'mailingCity' | 'mailingState' | 'mailingZipCode' | 'mailingCountry'
  | 'taxId' | 'entityName' | 'entityType' | 'entityTaxId'

interface FieldDef {
  key: EditableKey
  label: string
  type?: 'text' | 'tel' | 'select'
  options?: string[]
  placeholder?: string
  hint?: string
  span2?: boolean
  required?: boolean
}

const inputCls =
  'w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
const btnPrimary =
  'rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4b9ba2] transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
const btnSecondary =
  'rounded-xl bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('authToken') || '' : ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/* ───────── Per-section editable card ───────── */
function EditableSection({
  title,
  description,
  icon: Icon,
  fields,
  profile,
  onSaved,
  renderExtras,
}: {
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  fields: FieldDef[]
  profile: Profile
  onSaved: (updated: Profile) => void
  renderExtras?: (draft: Record<string, string>, setDraft: (d: Record<string, string>) => void) => React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const startEdit = () => {
    const d: Record<string, string> = {}
    for (const f of fields) d[f.key] = (profile[f.key] as string | null) ?? ''
    setDraft(d)
    setError('')
    setSuccess('')
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setError('')
  }

  const save = async () => {
    setError('')
    setSuccess('')

    // Send only changed, whitelisted fields
    const changed: Record<string, string> = {}
    for (const f of fields) {
      const original = (profile[f.key] as string | null) ?? ''
      if (draft[f.key] !== original) changed[f.key] = draft[f.key]
    }
    if (Object.keys(changed).length === 0) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/investors/profile', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(changed),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save changes')
      onSaved(data.profile)
      setEditing(false)
      setSuccess('Saved')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-900/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
        </div>
        {!editing && (
          <button onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors">
            <PencilSquareIcon className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>
      {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}

      {success && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
          {success}
        </div>
      )}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <XCircleIcon className="h-4 w-4 text-red-600" />
          {error}
        </div>
      )}

      {!editing ? (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.span2 ? 'sm:col-span-2' : ''}>
              <dt className="text-xs font-medium uppercase tracking-[0.15em] text-ink-400">{f.label}</dt>
              <dd className="mt-1 text-sm text-ink-800">{(profile[f.key] as string | null) || '—'}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-4">
          {renderExtras && <div className="mb-4">{renderExtras(draft, setDraft)}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.span2 ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-sm font-medium text-ink-700">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    className={inputCls}
                    value={draft[f.key] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    className={inputCls}
                    placeholder={f.placeholder}
                    value={draft[f.key] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  />
                )}
                {f.hint && <p className="mt-1 text-xs text-ink-400">{f.hint}</p>}
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={cancel} disabled={saving} className={btnSecondary}>
              Cancel
            </button>
            <button onClick={save} disabled={saving} className={btnPrimary}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/* ───────── Page ───────── */
export default function InvestorProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<string>('INVESTOR')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const user = sessionStorage.getItem('currentUser')
    if (!user) {
      router.push('/investors/login')
      return
    }
    try {
      const parsed = JSON.parse(user)
      if (parsed?.role) setRole(parsed.role)
    } catch {
      // ignore malformed session data
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/investors/profile', { headers: authHeaders() })
        if (response.ok) {
          const data = await response.json()
          setProfile(data.profile)
        } else {
          const errorData = await response.json()
          setLoadError(errorData.error || 'Failed to load profile')
        }
      } catch {
        setLoadError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [router])

  const handleSaved = (updated: Profile) => {
    setProfile(updated)
    // Keep session user info in sync for the shell/nav
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
      sessionStorage.setItem(
        'currentUser',
        JSON.stringify({
          ...currentUser,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
          company: updated.company,
        })
      )
    } catch {
      // non-fatal
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-4 text-sm text-ink-500">Loading profile…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          <XCircleIcon className="h-5 w-5 text-red-600" />
          {loadError || 'Failed to load profile'}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Manage your contact, mailing, and tax information for statements and K-1 delivery.
            </p>
          </div>
          <span className="chip">{role}</span>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.15em] text-ink-400">Email</dt>
            <dd className="mt-1 text-sm text-ink-800">{profile.email}</dd>
            <p className="mt-1 text-xs text-ink-400">Email cannot be changed — contact your administrator.</p>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.15em] text-ink-400">Role</dt>
            <dd className="mt-1 text-sm text-ink-800">{role}</dd>
          </div>
        </dl>
      </div>

      {/* Contact */}
      <EditableSection
        title="Contact"
        icon={UserIcon}
        profile={profile}
        onSaved={handleSaved}
        fields={[
          { key: 'firstName', label: 'First name' },
          { key: 'lastName', label: 'Last name' },
          { key: 'phone', label: 'Phone', type: 'tel' },
          { key: 'company', label: 'Company' },
        ]}
      />

      {/* Primary address */}
      <EditableSection
        title="Primary address"
        icon={MapPinIcon}
        profile={profile}
        onSaved={handleSaved}
        fields={[
          { key: 'address', label: 'Street address', span2: true },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State' },
          { key: 'zipCode', label: 'ZIP code' },
          { key: 'country', label: 'Country' },
        ]}
      />

      {/* Mailing address */}
      <EditableSection
        title="Mailing address"
        description="Where K-1s and tax documents are delivered, if different from your primary address."
        icon={DocumentTextIcon}
        profile={profile}
        onSaved={handleSaved}
        fields={[
          { key: 'mailingAddress', label: 'Mailing street address', span2: true },
          { key: 'mailingCity', label: 'Mailing city' },
          { key: 'mailingState', label: 'Mailing state' },
          { key: 'mailingZipCode', label: 'Mailing ZIP code' },
          { key: 'mailingCountry', label: 'Mailing country' },
        ]}
        renderExtras={(draft, setDraft) => (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-300 text-accent focus:ring-accent/20"
              onChange={(e) => {
                if (e.target.checked) {
                  setDraft({
                    ...draft,
                    mailingAddress: profile.address ?? '',
                    mailingCity: profile.city ?? '',
                    mailingState: profile.state ?? '',
                    mailingZipCode: profile.zipCode ?? '',
                    mailingCountry: profile.country ?? '',
                  })
                }
              }}
            />
            Same as primary address
          </label>
        )}
      />

      {/* Tax profile */}
      <EditableSection
        title="Tax profile"
        description="Used to prepare your K-1. If you invest through an entity, provide its details."
        icon={IdentificationIcon}
        profile={profile}
        onSaved={handleSaved}
        fields={[
          { key: 'taxId', label: 'Individual Tax ID / SSN', placeholder: 'XXX-XX-XXXX' },
          { key: 'entityName', label: 'Entity name (if investing through an entity)' },
          {
            key: 'entityType',
            label: 'Entity type',
            type: 'select',
            options: ['Individual', 'LLC', 'IRA', 'Trust', 'S-Corp', 'Partnership', 'C-Corp', 'Other'],
          },
          { key: 'entityTaxId', label: 'Entity Tax ID / EIN', placeholder: 'XX-XXXXXXX' },
        ]}
      />

      {/* Security */}
      <section className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-900/5">
        <div className="flex items-center gap-2">
          <LockClosedIcon className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Security</h2>
        </div>
        <p className="mt-1 text-sm text-ink-500">Update your account password.</p>
        {/* Self-service endpoint — PasswordManagement targets admin-only routes and
            would fail for INVESTOR users on their own profile. */}
        <ChangePasswordForm />
      </section>
    </div>
  )
}


function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const inputCls =
    'w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    setMessage('')
    try {
      const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
      const res = await fetch('/api/investors/users/change-my-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Could not change password.')
        return
      }
      setStatus('done')
      setMessage('Password updated.')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setStatus('error')
      setMessage('Could not change password.')
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid max-w-md gap-3">
      <input
        required
        type="password"
        placeholder="Current password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
        className={inputCls}
      />
      <input
        required
        type="password"
        placeholder="New password (min 8 characters)"
        autoComplete="new-password"
        minLength={8}
        value={form.newPassword}
        onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
        className={inputCls}
      />
      <input
        required
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
        className={inputCls}
      />
      {message && (
        <p className={`text-sm ${status === 'done' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>
      )}
      <button
        type="submit"
        disabled={status === 'saving'}
        className="w-fit rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4b9ba2] disabled:opacity-60"
      >
        {status === 'saving' ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
