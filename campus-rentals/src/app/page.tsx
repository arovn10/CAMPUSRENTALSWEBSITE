'use client';

import React, { useEffect, useState } from 'react';
import { Property } from '@/types';
import { fetchProperties } from '@/utils/clientApi';
import PropertyCard from '@/components/PropertyCard';
import Link from 'next/link';

const VIDEO_URL = 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/ArchitecturalAnimation.MP4';

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        const data = await fetchProperties();
        setPropertyCount(data.length);
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setProperties(shuffled.slice(0, 3));
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProperties();
  }, []);

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-ink-950">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-50"
          src={VIDEO_URL}
          autoPlay
          loop
          muted
          playsInline
        />
        {/* Cinematic gradient — dark at edges, readable center-left */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/55 to-ink-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />

        <div className="section-shell relative z-10">
          <div className="max-w-2xl py-24 stagger">
            <span className="eyebrow">New Orleans &middot; Boca Raton</span>
            <h1 className="text-display-xl font-semibold text-white">
              Student housing,
              <br />
              <span className="bg-gradient-to-r from-accent to-[#8ed0d6] bg-clip-text text-transparent">
                done properly.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
              Homes steps from Tulane and FAU — renovated, professionally managed,
              and owned by people who answer the phone.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/tulane-housing" className="btn-hero">
                Browse Tulane homes
              </Link>
              <Link href="/fau-housing" className="btn-ghost">
                FAU residences
              </Link>
            </div>

            {/* Stat band */}
            <dl className="mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-8">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Homes</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">
                  {propertyCount ? propertyCount : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Campuses</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">2</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Managed</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">Locally</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ============ WHY US ============ */}
      <section className="py-24 sm:py-32">
        <div className="section-shell">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Why Campus Rentals</span>
            <h2 className="text-display font-semibold text-ink-900">
              The details make the difference.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Walk to class',
                body: 'Every home sits within blocks of campus — Zimple, Freret, Audubon, Burthe. Skip the commute, sleep the extra twenty minutes.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                ),
              },
              {
                title: 'Actually maintained',
                body: 'Renovated kitchens, central air, in-unit laundry — and a local team that fixes things fast instead of a 1-800 number.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                ),
              },
              {
                title: 'Straightforward leasing',
                body: 'Transparent pricing, online payments through Abodingo, and a real person on the other end from tour to move-out.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
              },
            ].map((f) => (
              <div key={f.title} className="card-premium p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                  <svg className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    {f.icon}
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-ink-900">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED ============ */}
      <section className="bg-white py-24 sm:py-32">
        <div className="section-shell">
          <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <span className="eyebrow">Featured</span>
              <h2 className="text-display font-semibold text-ink-900">This week&apos;s picks</h2>
            </div>
            <Link
              href="/tulane-housing"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-[#3E8A91]"
            >
              View all properties
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent border-t-transparent"></div>
            </div>
          ) : properties.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-3 stagger">
              {properties.map((property) => (
                <PropertyCard key={property.property_id} property={property} />
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-ink-400">
              Listings are temporarily unavailable — please check back shortly or{' '}
              <Link href="/contact" className="font-medium text-accent">contact us</Link>.
            </p>
          )}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative overflow-hidden bg-ink-950 py-24 sm:py-32">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #54AAB1, transparent)' }}
        />
        <div className="section-shell relative text-center">
          <h2 className="mx-auto max-w-2xl text-display font-semibold text-white">
            Your next place is a 20-minute tour away.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
            Fall semesters fill fast. See the homes everyone asks about before they&apos;re gone.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/tulane-housing" className="btn-hero">Tulane / Loyola</Link>
            <Link href="/fau-housing" className="btn-ghost">FAU</Link>
            <Link href="/contact" className="btn-ghost">Talk to us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
