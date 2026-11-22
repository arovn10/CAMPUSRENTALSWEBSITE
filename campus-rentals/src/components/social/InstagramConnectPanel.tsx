'use client'

import { useCallback, useEffect, useState } from 'react'

interface CredentialStatus {
  configured: boolean
  igUsername: string | null
  pageName: string | null
  hasToken: boolean
  tokenFingerprint: string | null
  expiresAt: string | null
  daysToExpiry: number | null
  publishingEnabled: boolean
  publishingEnvOverride: 'on' | 'off' | null
}

/**
 * Connect @campusrentalsllc and flip the publishing switch. ADMIN only — the
 * credential endpoint returns 403 to anyone else, and this panel then renders
 * nothing.
 *
 * The admin pastes a long-lived Facebook user token (from Meta's Graph API
 * Explorer, extended in the Access Token Debugger). The server swaps it for
 * the Page's non-expiring token and never returns either.
 */
export default function InstagramConnectPanel({
  headers,
  onChange,
}: {
  headers: () => HeadersInit
  onChange?: () => void
}) {
  const [status, setStatus] = useState<CredentialStatus | null>(null)
  const [hidden, setHidden] = useState(false)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [showConnect, setShowConnect] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/social/credential', { headers: headers() })
    if (res.status === 401 || res.status === 403) {
      setHidden(true)
      return
    }
    if (res.ok) setStatus(await res.json())
  }, [headers])

  useEffect(() => {
    load()
  }, [load])

  async function connect() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/social/credential', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ token }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMessage({ tone: 'error', text: body.error || 'Could not connect' })
        return
      }
      setToken('')
      setShowConnect(false)
      setStatus(body.status)
      setMessage({
        tone: 'ok',
        text: `Connected @${body.igUsername} via the "${body.pageName}" Page.${
          body.expiresAt ? '' : ' The token does not expire.'
        }`,
      })
      onChange?.()
    } finally {
      setBusy(false)
    }
  }

  async function togglePublishing(next: boolean) {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/social/credential', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ publishingEnabled: next }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMessage({ tone: 'error', text: body.error || 'Could not change the switch' })
        return
      }
      setStatus(body)
      onChange?.()
    } finally {
      setBusy(false)
    }
  }

  if (hidden || !status) return null

  const connected = status.configured
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Instagram connection</h2>
          {connected ? (
            <p className="mt-1 text-sm text-gray-600">
              Connected as <strong>@{status.igUsername ?? 'unknown'}</strong>
              {status.pageName ? <> via the &ldquo;{status.pageName}&rdquo; Page</> : null}.{' '}
              {status.expiresAt
                ? `Token expires in ${status.daysToExpiry} days.`
                : 'Token does not expire.'}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">Not connected — nothing can be published yet.</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700">Publishing</span>
          <button
            type="button"
            role="switch"
            aria-checked={status.publishingEnabled}
            disabled={busy || !connected || status.publishingEnvOverride !== null}
            onClick={() => togglePublishing(!status.publishingEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${
              status.publishingEnabled ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                status.publishingEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${status.publishingEnabled ? 'text-green-700' : 'text-gray-500'}`}>
            {status.publishingEnabled ? 'On' : 'Off'}
          </span>
        </div>
      </div>

      {status.publishingEnvOverride && (
        <p className="mt-2 text-xs text-gray-500">
          The server setting <code>SOCIAL_PUBLISHING_ENABLED</code> forces publishing{' '}
          {status.publishingEnvOverride}; the switch is locked.
        </p>
      )}

      <div className="mt-4">
        {!showConnect ? (
          <button
            type="button"
            onClick={() => setShowConnect(true)}
            className="text-sm font-medium text-accent-deep hover:underline"
          >
            {connected ? 'Reconnect with a new token' : 'Connect Instagram'}
          </button>
        ) : (
          <div className="space-y-2">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
              <li>
                In Meta&rsquo;s{' '}
                <a
                  className="text-accent-deep underline"
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Graph API Explorer
                </a>
                , pick the &ldquo;Campus Rentals Social&rdquo; app and click <em>Generate Access Token</em>.
              </li>
              <li>
                Open the token in the{' '}
                <a
                  className="text-accent-deep underline"
                  href="https://developers.facebook.com/tools/debug/accesstoken/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Access Token Debugger
                </a>{' '}
                and click <em>Extend Access Token</em>.
              </li>
              <li>Paste the extended token below.</li>
            </ol>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={3}
              autoComplete="off"
              spellCheck={false}
              placeholder="EAA…"
              className="w-full rounded-lg border border-gray-300 p-2 font-mono text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || token.trim().length < 30}
                onClick={connect}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Connecting…' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConnect(false)
                  setToken('')
                }}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.tone === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>
      )}
    </div>
  )
}
