'use client'

import { useState } from 'react'
import Image from 'next/image'
import { trackEvent } from '@/utils/analytics'

const inputCls =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20'

type Interest = 'RENT' | 'BUY' | 'EITHER'

function WaitlistForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', company: '' })
  const [interest, setInterest] = useState<Interest | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!interest) {
      setErrorMsg('Let us know if you’re interested in renting or buying.')
      setStatus('error')
      return
    }
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/plaza-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, interest }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        return
      }
      setStatus('sent')
      trackEvent('plaza_waitlist_join', { interest })
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center shadow-lift animate-scale-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-1 text-xl font-semibold tracking-tight text-ink-900">You&apos;re on the list.</h3>
        <p className="text-sm leading-relaxed text-ink-500">
          We&apos;ll reach out as Campus Rentals Plaza gets closer to opening — floor plans, pricing, and first pick
          go to the waitlist.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3">
      {/* Rent / Buy / Either */}
      <div className="grid grid-cols-3 rounded-xl bg-white/10 p-1 backdrop-blur-md">
        {(['RENT', 'BUY', 'EITHER'] as Interest[]).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInterest(i)}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
              interest === i ? 'bg-accent text-white shadow-glow' : 'bg-transparent text-white/70 hover:text-white'
            }`}
          >
            {i === 'RENT' ? 'Renting' : i === 'BUY' ? 'Buying' : 'Either'}
          </button>
        ))}
      </div>
      <input required placeholder="Full name" value={form.name} onChange={set('name')} className={inputCls} autoComplete="name" />
      <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} className={inputCls} autoComplete="email" />
      <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} className={inputCls} autoComplete="tel" />
      <textarea rows={2} placeholder="Anything we should know? (optional)" value={form.message} onChange={set('message')} className={inputCls} />
      {/* Honeypot */}
      <input type="text" name="company" value={form.company} onChange={set('company')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {status === 'error' && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-xl bg-accent px-6 py-4 text-base font-semibold text-white shadow-glow transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-[#4b9ba2] disabled:translate-y-0 disabled:opacity-60"
      >
        {status === 'sending' ? 'Joining…' : 'Join the waitlist'}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-white/40">
        No spam — just first access to floor plans, pricing, and move-in dates.
      </p>
    </form>
  )
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

export default function PlazaPage() {
  return (
    <div className="min-h-screen">
      {/* Fixed background — the rendering sits behind the whole page; content scrolls over it. */}
      <div className="fixed inset-0 -z-10 bg-ink-950">
        <Image
          src="/plaza/hero.jpg"
          alt="Campus Rentals Plaza — rendering of the corner of the development at 7900 Maple Street"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-ink-950/15" />
      </div>

      {/* ============ HERO — one viewport, transparent so the fixed photo shows ============ */}
      <section className="relative flex h-[100svh] min-h-[560px] items-end">
        <div className="section-shell relative z-10 pb-24">
          <div className="max-w-3xl stagger">
            <span className="eyebrow">Coming mid-2027 · 7900 Maple Street, New Orleans</span>
            <h1 className="text-display-xl font-semibold text-white">Campus Rentals Plaza</h1>
            <p className="mt-4 max-w-xl text-xl leading-relaxed text-white/75 sm:text-2xl">
              Maple Street, all together. Seven residences above a restaurant, a boutique storefront,
              and a courtyard made for staying a while.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button onClick={() => scrollTo('waitlist')} className="btn-hero">
                Join the waitlist
              </button>
              <button onClick={() => scrollTo('residences')} className="btn-ghost">
                Explore the building
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Everything below rides over the fixed photo as an opaque sheet. */}
      <div className="relative z-10 rounded-t-[2rem] bg-ink-50 shadow-[0_-20px_60px_rgba(10,15,20,0.35)]">
      {/* ============ INTRO ============ */}
      <section className="py-24 sm:py-32">
        <div className="section-shell">
          <p className="mx-auto max-w-3xl text-center text-headline font-semibold leading-snug text-ink-900">
            A corner of Maple Street where you can live upstairs, eat downstairs, and let the
            evening happen in the courtyard — steps from the St.&nbsp;Charles streetcar.
          </p>
        </div>
      </section>

      {/* ============ STAT BAND ============ */}
      <section className="border-y border-ink-100 bg-white py-12">
        <div className="section-shell">
          <dl className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              ['7', 'Residences'],
              ['2', 'Retail spaces'],
              ['1', 'Courtyard'],
              ['Steps', 'To the streetcar'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="order-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-400">{label}</dt>
                <dd className="text-4xl font-semibold tracking-tight text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============ RESIDENCES ============ */}
      <section id="residences" className="py-24 sm:py-32">
        <div className="section-shell">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="eyebrow">The Residences</span>
            <h2 className="text-display font-semibold text-ink-900">Seven homes, two ways to live.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card-premium p-8 sm:p-10">
              <span className="chip mb-5">2 available · one per building</span>
              <h3 className="text-headline font-semibold text-ink-900">The Penthouses</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
                Four bedrooms and four-and-a-half baths across the entire top floor of each building —
                treetop views over the Maple Street corridor, made for a house of friends who want the
                best seat in the neighborhood.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />4 bed · 4.5 bath</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Full top floor of each building</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Private balconies</li>
              </ul>
            </div>
            <div className="card-premium p-8 sm:p-10">
              <span className="chip mb-5">5 available · two market-affordable</span>
              <h3 className="text-headline font-semibold text-ink-900">The Flats</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
                Two-bedroom, two-bath residences sized for real life — roommates, couples, grad students —
                with two of the five reserved as market-affordable homes, because a real neighborhood
                makes room.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />2 bed · 2 bath</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />5 residences across both buildings</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />2 designated market-affordable</li>
              </ul>
            </div>
          </div>
          <p className="mt-10 text-center text-sm text-ink-400">
            Floor plans coming soon — waitlist members see them first.
          </p>
        </div>
      </section>

      {/* ============ COURTYARD / RETAIL ============ */}
      <section className="relative overflow-hidden bg-ink-950">
        <div className="relative h-[70vh] min-h-[480px]">
          <Image
            src="/plaza/courtyard.jpg"
            alt="Rendering of the Campus Rentals Plaza courtyard entrance with string lights between the two buildings"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
        </div>
        <div className="section-shell relative z-10 -mt-32 pb-24 sm:pb-32">
          <div className="max-w-2xl stagger">
            <span className="eyebrow">The Ground Floor</span>
            <h2 className="text-display font-semibold text-white">Dinner downstairs.<br />Evenings in the courtyard.</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
              A restaurant anchors one corner — announcement coming soon — with a boutique commercial
              space beside it. Between the buildings, a string-lit courtyard opens for outdoor seating,
              slow dinners, and neighborhood nights out.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['Restaurant', 'Anchor tenant to be announced'],
                ['Commercial space', 'Boutique storefront on Maple'],
                ['Courtyard', 'Outdoor seating & entertainment'],
              ].map(([title, sub]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-white/60">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRANSIT ============ */}
      <section className="py-24 sm:py-32">
        <div className="section-shell">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="eyebrow">Transit-Oriented</span>
              <h2 className="text-display font-semibold text-ink-900">Built where the city already goes.</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-500">
                Campus Rentals Plaza is transit-oriented development in the truest sense — a short walk
                to the St.&nbsp;Charles streetcar line, on a Maple Street block you can live from on foot:
                coffee, restaurants, shops, and the university corridor, all without reaching for car keys.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                ['St. Charles streetcar', 'Historic line, short walk from your door'],
                ['The Maple Street corridor', 'Restaurants, coffee, and shops on your block'],
                ['University corridor', 'Tulane and Loyola within easy reach'],
              ].map(([title, sub]) => (
                <div key={title} className="card-premium flex items-start gap-4 p-6">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold tracking-tight text-ink-900">{title}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TIMELINE + CREDITS ============ */}
      <section className="border-y border-ink-100 bg-white py-20">
        <div className="section-shell">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 text-center">
            <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-16">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-400">Broke ground</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Early 2026</p>
              </div>
              <div className="hidden h-px w-24 bg-ink-200 sm:block" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-400">Opening</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-accent">Mid-2027</p>
              </div>
            </div>
            <p className="text-sm text-ink-400">
              Architecture by <span className="font-medium text-ink-600">Graham Hill Architect</span> ·
              Built by <span className="font-medium text-ink-600">Asper Construction</span> ·
              Developed by <span className="font-medium text-ink-600">Campus Rentals</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============ WAITLIST ============ */}
      <section id="waitlist" className="relative overflow-hidden bg-ink-950 py-24 sm:py-32">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #54AAB1, transparent)' }}
        />
        <div className="section-shell relative">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="eyebrow">The Waitlist</span>
            <h2 className="text-display font-semibold text-white">Seven homes. First come, first pick.</h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/60">
              Tell us whether you&apos;d rent or buy, and you&apos;ll be first in line for floor plans,
              pricing, and move-in dates.
            </p>
          </div>
          <WaitlistForm />
        </div>
      </section>
      </div>
    </div>
  )
}
