'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/utils/analytics';
import { ABODINGO_WEBSITE_URL } from '@/lib/apiConfig';

type Mode = 'tour' | 'inquiry';

/**
 * Tours are scheduled and managed in Abodingo (also the rent platform once
 * they lease) — so the tour tab funnels people into an Abodingo account and
 * deep-links to the property's tour flow. A guest fallback keeps the lead
 * if they refuse to sign up. Inquiries stay account-free.
 */
function AbodingoTourFunnel({ propertyId, onGuestFallback }: { propertyId: number | string; onGuestFallback: () => void }) {
  const target = encodeURIComponent(`/student/properties/${propertyId}?tour=1`);
  const signupUrl = `${ABODINGO_WEBSITE_URL}/signup?accountType=Student&redirect=${target}`;
  const loginUrl = `${ABODINGO_WEBSITE_URL}/login?redirect=${target}`;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-ink-50 p-4">
        <p className="text-sm leading-relaxed text-ink-600">
          Tours are scheduled through <span className="font-semibold text-ink-900">Abodingo</span> —
          the platform where we manage tours, applications, and (once you move in) rent.
          Create a free account to request your tour and track it end to end.
        </p>
      </div>
      <a
        href={signupUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('lead_tour_signup_redirect', { property_id: String(propertyId) })}
        className="block w-full rounded-xl bg-accent px-6 py-3.5 text-center text-sm font-semibold text-white shadow-glow transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-[#4b9ba2]"
      >
        Create a free account &amp; request tour
      </a>
      <a
        href={loginUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('lead_tour_login_redirect', { property_id: String(propertyId) })}
        className="block w-full rounded-xl bg-ink-900 px-6 py-3.5 text-center text-sm font-semibold text-white transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-ink-800"
      >
        I already have an Abodingo account
      </a>
      <button
        type="button"
        onClick={onGuestFallback}
        className="w-full bg-transparent py-1 text-center text-xs font-medium text-ink-400 underline-offset-2 transition-colors hover:text-ink-600 hover:underline"
      >
        Continue without an account
      </button>
    </div>
  );
}

interface LeadCaptureProps {
  propertyId: number | string;
  propertyName: string;
  /** 'panel' renders inline (detail page sidebar); 'modal' renders a dialog with its own trigger */
  variant?: 'panel' | 'modal';
}

const inputCls =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20';

function LeadForm({ propertyId, propertyName, onDone }: { propertyId: number | string; propertyName: string; onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>('tour');
  const [guestTour, setGuestTour] = useState(false); // tour tab shows the Abodingo funnel unless the guest opts out
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', scheduledDate: '', company: '' });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode, propertyId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('sent');
      trackEvent(mode === 'tour' ? 'lead_tour_request' : 'lead_inquiry', {
        property_id: String(propertyId),
      });
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center py-10 text-center animate-scale-in">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-semibold text-ink-900">
          {mode === 'tour' ? 'Tour requested' : 'Message sent'}
        </h3>
        <p className="max-w-xs text-sm text-ink-500">
          We&apos;ll get back to you shortly about {propertyName}. Keep an eye on your inbox.
        </p>
        {onDone && (
          <button onClick={onDone} className="btn-quiet mt-6">Done</button>
        )}
      </div>
    );
  }

  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  const segmented = (
    <div className="mb-4 grid grid-cols-2 rounded-xl bg-ink-100 p-1">
      {(['tour', 'inquiry'] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => { setMode(m); if (m === 'tour') setGuestTour(false); }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
            mode === m ? 'bg-white text-ink-900 shadow-soft' : 'bg-transparent text-ink-500 hover:text-ink-700'
          }`}
        >
          {m === 'tour' ? 'Schedule a tour' : 'Ask a question'}
        </button>
      ))}
    </div>
  );

  // Tour tab: Abodingo account funnel first; direct guest form only on explicit opt-out.
  if (mode === 'tour' && !guestTour) {
    return (
      <div>
        {segmented}
        <AbodingoTourFunnel propertyId={propertyId} onGuestFallback={() => setGuestTour(true)} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {segmented}

      <input required placeholder="Full name" value={form.name} onChange={set('name')} className={inputCls} autoComplete="name" />
      <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} className={inputCls} autoComplete="email" />
      <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} className={inputCls} autoComplete="tel" />

      {mode === 'tour' && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Preferred date &amp; time</span>
          <input
            required
            type="datetime-local"
            min={minDate}
            value={form.scheduledDate}
            onChange={set('scheduledDate')}
            className={inputCls}
          />
        </label>
      )}

      <textarea
        rows={3}
        placeholder={mode === 'tour' ? 'Anything we should know? (optional)' : `I'm interested in ${propertyName}…`}
        value={form.message}
        onChange={set('message')}
        className={inputCls}
      />

      {/* Honeypot */}
      <input
        type="text"
        name="company"
        value={form.company}
        onChange={set('company')}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {status === 'error' && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-[#4b9ba2] disabled:translate-y-0 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : mode === 'tour' ? 'Request tour' : 'Send message'}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-ink-400">
        No spam, no obligation — we typically reply within one business day.
      </p>
    </form>
  );
}

export default function LeadCapture({ propertyId, propertyName, variant = 'panel' }: LeadCaptureProps) {
  const [open, setOpen] = useState(false);

  // Lock page scroll while the dialog is open (see PropertyCard preview modal).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (variant === 'panel') {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-900/5 sm:p-7">
        <h3 className="mb-1 text-lg font-semibold tracking-tight text-ink-900">See it in person</h3>
        <p className="mb-5 text-sm text-ink-500">Tours are free and take about 20 minutes.</p>
        <LeadForm propertyId={propertyId} propertyName={propertyName} />
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-hero w-full sm:w-auto">
        Schedule a tour
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/50 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift animate-scale-in sm:rounded-3xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-ink-900">{propertyName}</h3>
                <p className="text-sm text-ink-500">Tours are free and take about 20 minutes.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <LeadForm propertyId={propertyId} propertyName={propertyName} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
