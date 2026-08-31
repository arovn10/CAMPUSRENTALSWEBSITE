'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Property } from '@/types';
import { fetchProperties } from '@/utils/clientApi';
import PropertyCard from '@/components/PropertyCard';
import {
  MapPinIcon,
  WifiIcon,
  TruckIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  HomeIcon,
  StarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function FAUHousingClient() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [displayedCount, setDisplayedCount] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);

        // Add timeout to prevent hanging forever
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
        );

        const fetchPromise = fetchProperties();
        const fetchedProperties = (await Promise.race([fetchPromise, timeoutPromise])) as Property[];

        // Filter for FAU properties
        const fauProperties = fetchedProperties.filter(
          (p) =>
            p.school === 'Florida Atlantic University' ||
            p.school === 'FAU' ||
            (p.address &&
              (p.address.toLowerCase().includes('boca raton') ||
                p.address.toLowerCase().includes('boca') ||
                p.address.toLowerCase().includes('fau')))
        );
        setAllProperties(fauProperties);
      } catch (error) {
        console.error('Error loading properties:', error);
        // Set empty array on error so page still renders
        setAllProperties([]);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  const displayedProperties = allProperties.slice(0, displayedCount);
  const hasMore = displayedCount < allProperties.length;

  const handleShowMore = () => {
    setDisplayedCount((prev) => Math.min(prev + 6, allProperties.length));
  };

  const features = [
    {
      icon: <MapPinIcon className="h-6 w-6" />,
      title: 'Prime location near FAU',
      description: "Minutes from Florida Atlantic University's Boca Raton campus.",
    },
    {
      icon: <WifiIcon className="h-6 w-6" />,
      title: 'High-speed internet',
      description: 'Reliable WiFi included for classes, research, and streaming.',
    },
    {
      icon: <TruckIcon className="h-6 w-6" />,
      title: 'Dedicated parking',
      description: 'On-site parking spaces reserved for residents.',
    },
    {
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      title: 'Enhanced security',
      description: 'Well-lit, secure properties in established neighborhoods.',
    },
    {
      icon: <AcademicCapIcon className="h-6 w-6" />,
      title: 'Study-friendly',
      description: 'Quiet homes with great spaces for group projects.',
    },
    {
      icon: <HomeIcon className="h-6 w-6" />,
      title: 'Furnished units',
      description: 'Fully furnished apartments ready for immediate move-in.',
    },
  ];

  const faqs = [
    {
      q: 'What is the best area for off campus housing near FAU?',
      a: "Properties close to Glades Road and North University Drive put you minutes from FAU's Boca Raton campus while staying near Town Center Mall, grocery stores, and everyday essentials. Our homes are placed in safe, student-friendly neighborhoods around campus.",
    },
    {
      q: 'How far are your off campus apartments from FAU?',
      a: "Most of our properties are a short drive or bike ride from Florida Atlantic University's main campus — close enough for an easy commute to class, the library, or a game at FAU Stadium.",
    },
    {
      q: 'Are your off campus rentals near FAU furnished?',
      a: 'Yes — our off-campus housing near FAU comes fully furnished with modern furniture, appliances, and everything you need for comfortable student living. Just bring your personal items and move in.',
    },
    {
      q: 'Do you offer group housing for students attending FAU?',
      a: 'Absolutely. We have spacious houses well suited to groups of friends or roommates, making it easy to live together while attending FAU.',
    },
  ];

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const localBusinessData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://campusrentalsllc.com/fau-housing',
    name: 'Campus Rentals LLC - FAU Off Campus Housing',
    description: 'Premium off-campus housing near Florida Atlantic University in Boca Raton',
    url: 'https://campusrentalsllc.com/fau-housing',
    telephone: '+1-504-383-4552',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Boca Raton',
      addressLocality: 'Boca Raton',
      addressRegion: 'FL',
      postalCode: '33431',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '26.3683',
      longitude: '-80.1289',
    },
    areaServed: {
      '@type': 'City',
      name: 'Boca Raton',
    },
    priceRange: '$$',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '17:00',
    },
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://campusrentalsllc.com/' },
      { '@type': 'ListItem', position: 2, name: 'FAU Off Campus Housing', item: 'https://campusrentalsllc.com/fau-housing' },
    ],
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateAgent',
            name: 'Campus Rentals LLC - FAU Off Campus Housing',
            description: 'Premium off-campus housing near Florida Atlantic University in Boca Raton',
            url: 'https://campusrentalsllc.com/fau-housing',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Boca Raton',
              addressRegion: 'FL',
              postalCode: '33431',
              addressCountry: 'US',
            },
            areaServed: {
              '@type': 'City',
              name: 'Boca Raton',
            },
            serviceType: 'FAU Off Campus Housing',
            priceRange: '$$',
          }),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />

      <div className="min-h-screen bg-ink-50">
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden bg-ink-950 py-24 sm:py-32">
          <div
            className="pointer-events-none absolute -top-48 right-[-8rem] h-[32rem] w-[42rem] rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, #54AAB1, transparent)' }}
          />
          <div className="section-shell relative">
            <div className="mx-auto max-w-3xl text-center stagger">
              <span className="eyebrow-on-dark inline-flex items-center gap-2">
                <AcademicCapIcon className="h-4 w-4" /> Boca Raton, Florida
              </span>
              <h1 className="text-display-xl font-semibold text-white">FAU off-campus housing.</h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
                Premium student rentals minutes from Florida Atlantic University — fully furnished,
                professionally managed, and move-in ready.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                <Link href="#properties" className="btn-hero">
                  View available homes
                </Link>
                <Link href="/contact" className="btn-ghost">
                  Schedule a tour
                </Link>
              </div>
            </div>

            <dl className="mx-auto mt-16 flex max-w-2xl flex-wrap justify-center gap-x-12 gap-y-6 border-t border-white/10 pt-8">
              <div className="text-center">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">From campus</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight text-white">Minutes away</dd>
              </div>
              <div className="text-center">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">City</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight text-white">Boca Raton</dd>
              </div>
              <div className="text-center">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Furnishing</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight text-white">Included</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ============ SEO CONTENT ============ */}
        <section className="py-20 sm:py-24">
          <div className="section-shell max-w-4xl">
            <span className="eyebrow">Off-campus housing near FAU</span>
            <h2 className="text-display font-semibold text-ink-900">
              The best off-campus housing near Florida Atlantic University.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink-600">
              Looking for <strong className="text-ink-900">FAU off campus housing</strong>? Campus Rentals
              LLC offers a premium selection of{' '}
              <strong className="text-ink-900">off-campus housing near Florida Atlantic University</strong>{' '}
              in Boca Raton. Our properties sit close to Glades Road and North University Drive, minutes
              from FAU&apos;s main campus.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">
              Our <strong className="text-ink-900">off campus apartments near FAU</strong> and houses are
              perfect for students who want a comfortable, convenient home base close to campus, Town
              Center Mall, and downtown Boca Raton. Whether you need a place for yourself or{' '}
              <strong className="text-ink-900">group housing for students attending FAU</strong>, we have
              options to fit your needs.
            </p>

            <h3 className="mt-12 text-headline font-semibold text-ink-900">
              Why choose our FAU off-campus housing?
            </h3>
            <ul className="mt-6 space-y-4">
              {[
                <>
                  <strong className="text-ink-900">Prime location:</strong> minutes from FAU&apos;s Boca
                  Raton campus, with easy access to Glades Road and I-95.
                </>,
                <>
                  <strong className="text-ink-900">Fully furnished:</strong> modern furniture, appliances,
                  and everything you need for comfortable student living.
                </>,
                <>
                  <strong className="text-ink-900">Luxury finishes:</strong> premium finishes and modern
                  amenities for an elevated student living experience.
                </>,
                <>
                  <strong className="text-ink-900">Flexible lease terms:</strong> aligned with the academic
                  calendar — fall, spring, and summer.
                </>,
              ].map((copy, i) => (
                <li key={i} className="flex items-start gap-3 text-lg leading-relaxed text-ink-600">
                  <CheckCircleIcon className="mt-1 h-6 w-6 shrink-0 text-accent-deep" />
                  <span>{copy}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============ FEATURES ============ */}
        <section className="bg-white py-20 sm:py-24">
          <div className="section-shell">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Built for students</span>
              <h2 className="text-display font-semibold text-ink-900">Living near FAU, made easy.</h2>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="card-premium p-8">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-deep">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-ink-900">{f.title}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PROPERTIES ============ */}
        <section id="properties" className="py-20 sm:py-24">
          <div className="section-shell">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Available now</span>
              <h2 className="text-display font-semibold text-ink-900">FAU off-campus housing</h2>
              <p className="mt-4 text-lg text-ink-500">
                Browse our current selection of premium off-campus housing near FAU.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent border-t-transparent"></div>
              </div>
            ) : displayedProperties.length > 0 ? (
              <>
                <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3 stagger">
                  {displayedProperties.map((property) => (
                    <PropertyCard key={property.property_id} property={property} />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-12 text-center">
                    <button onClick={handleShowMore} className="btn-quiet">
                      Show more ({allProperties.length - displayedCount} remaining)
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-14 py-16 text-center text-ink-500">
                Listings are temporarily unavailable — please check back shortly or{' '}
                <Link href="/contact" className="font-medium text-accent-deep">
                  contact us
                </Link>
                .
              </p>
            )}
          </div>
        </section>

        {/* ============ AREA BENEFITS ============ */}
        <section className="bg-white py-20 sm:py-24">
          <div className="section-shell">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="eyebrow">The neighborhood</span>
                <h2 className="text-display font-semibold text-ink-900">Perfect for students at FAU.</h2>
                <ul className="mt-8 space-y-4">
                  {[
                    "Minutes from FAU's main campus, recreation center, and library",
                    'Close to Town Center at Boca Raton and everyday shopping and dining',
                    'A short drive to downtown Boca Raton, Mizner Park, and the beach',
                    'Easy access to the FAU shuttle and campus bus routes',
                    'Near FAU Stadium and campus athletics and event venues',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <StarIcon className="mt-1 h-5 w-5 shrink-0 text-accent-deep" />
                      <span className="text-[15px] leading-relaxed text-ink-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-premium p-8 sm:p-10">
                <h3 className="mb-4 text-lg font-semibold tracking-tight text-ink-900">
                  Student-friendly perks
                </h3>
                <p className="mb-5 text-[15px] text-ink-500">
                  Our off-campus housing near FAU is tailored specifically for students:
                </p>
                <ul className="space-y-3 text-[15px] text-ink-600">
                  {[
                    'Lease terms aligned to the academic calendar (fall / spring / summer)',
                    'Responsive local maintenance team',
                    'Personalized tours and placement assistance',
                    'Neighborhood guidance for newcomers to Boca Raton',
                    'Group housing options for friends and roommates',
                    'Competitive student pricing and flexible payment options',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-deep" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="py-20 sm:py-24">
          <div className="section-shell max-w-3xl">
            <div className="text-center">
              <span className="eyebrow">FAQ</span>
              <h2 className="text-display font-semibold text-ink-900">
                Questions about FAU off-campus housing
              </h2>
            </div>
            <div className="mt-12 space-y-4">
              {faqs.map((f) => (
                <div key={f.q} className="card-premium p-6 sm:p-7">
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-ink-900">{f.q}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-500">{f.a}</p>
                </div>
              ))}
            </div>
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
              Ready to find your FAU off-campus housing?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
              Join the students who found their off-campus home with us. Schedule a tour today.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/contact" className="btn-hero">
                Schedule a tour
              </Link>
              <Link href="#properties" className="btn-ghost">
                Browse homes
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
