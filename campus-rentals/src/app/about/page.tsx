'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image'
import Link from 'next/link'
import { fetchProperties, fetchPropertyPhotos, getOptimizedImageUrl } from '@/utils/clientApi'
import { CheckCircleIcon, UsersIcon, LightBulbIcon } from '@heroicons/react/24/outline';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

function getRandomItem(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export default function AboutPage() {
  const [randomPhotos, setRandomPhotos] = useState<string[]>([]);

  useEffect(() => {
    const loadRandomPhotos = async () => {
      try {
        const properties = await fetchProperties();
        const randomProperties = properties.sort(() => 0.5 - Math.random()).slice(0, 3);

        const photosPromises = randomProperties.map(async (property) => {
          const photos = await fetchPropertyPhotos(property.property_id);
          const randomPhoto = getRandomItem(photos);
          return randomPhoto ? getOptimizedImageUrl(randomPhoto) : null;
        });

        const photos = await Promise.all(photosPromises);
        setRandomPhotos(photos.filter((url): url is string => url !== null && isValidUrl(url)));
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    };

    loadRandomPhotos();
  }, []);

  const values = [
    {
      icon: CheckCircleIcon,
      title: 'Quality',
      body: 'We maintain the highest standards in property maintenance and management, so our homes are always in top condition.',
    },
    {
      icon: UsersIcon,
      title: 'Community',
      body: 'We foster a sense of community among our residents — an environment where students can thrive academically and socially.',
    },
    {
      icon: LightBulbIcon,
      title: 'Innovation',
      body: "We continuously improve our properties and processes to meet the evolving needs of today's students.",
    },
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-ink-950 py-24 sm:py-32">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #54AAB1, transparent)' }}
        />
        <div className="section-shell relative text-center stagger">
          <span className="eyebrow-on-dark">About us</span>
          <h1 className="text-display-xl font-semibold text-white">
            Your trusted partner in
            <br />
            off-campus student housing.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70 sm:text-xl">
            Locally owned and operated near Tulane University and Florida Atlantic University.
          </p>
        </div>
      </section>

      {/* ============ SEO CONTENT ============ */}
      <section className="py-20 sm:py-24">
        <div className="section-shell max-w-4xl">
          <span className="eyebrow">Off-campus housing near Tulane &amp; FAU</span>
          <h2 className="text-display font-semibold text-ink-900">
            Premium off-campus housing, built around student life.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-600">
            Looking for <strong className="text-ink-900">off-campus housing near Tulane University</strong>{' '}
            in New Orleans or <strong className="text-ink-900">student apartments near Florida Atlantic
            University (FAU)</strong> in Boca Raton? Campus Rentals LLC offers premium off-campus student
            housing built for comfortable, convenient living close to campus.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">
            Our <strong className="text-ink-900">Tulane off-campus housing</strong> properties in New
            Orleans provide easy access to Tulane University, with modern amenities and prime locations in
            safe neighborhoods. For students attending <strong className="text-ink-900">FAU in Boca
            Raton</strong>, we offer <strong className="text-ink-900">off-campus apartments near FAU</strong>{' '}
            that combine convenient locations with premium quality.
          </p>

          <h3 className="mt-12 text-headline font-semibold text-ink-900">
            Why choose our off-campus student housing?
          </h3>
          <ul className="mt-6 space-y-4">
            {[
              'Prime locations — walking distance to Tulane University and minutes from FAU',
              'Premium finishes and high-quality furnishings',
              'Fully furnished apartments with high-speed internet',
              'Secure buildings in safe, student-friendly neighborhoods',
              'Flexible academic-year and semester lease options',
              'A simple, straightforward application process',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-lg leading-relaxed text-ink-600">
                <CheckCircleIcon className="mt-1 h-6 w-6 shrink-0 text-accent-deep" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ MISSION ============ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="section-shell">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <span className="eyebrow">Our mission</span>
              <h2 className="text-display font-semibold text-ink-900">
                Housing that makes college life easier, not harder.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-600">
                We&apos;re dedicated to providing exceptional off-campus housing for students — comfortable,
                safe, and convenient homes that let you focus on what actually matters: your degree, your
                friends, and your four years.
              </p>
              <Link href="/contact" className="btn-quiet mt-8 inline-flex">
                Get in touch
              </Link>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ink-100 shadow-soft">
              {randomPhotos[0] ? (
                <Image src={randomPhotos[0]} alt="A Campus Rentals property" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-400">Campus Rentals</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ VALUES ============ */}
      <section className="py-20 sm:py-24">
        <div className="section-shell">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">What we stand for</span>
            <h2 className="text-display font-semibold text-ink-900">The details make the difference.</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="card-premium p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                  <v.icon className="h-6 w-6 text-accent-deep" />
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-ink-900">{v.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-500">{v.body}</p>
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
          <h2 className="mx-auto max-w-2xl text-display font-semibold text-white">Get in touch.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
            Have questions about our properties or services? We&apos;re here to help.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <a href="tel:5043834552" className="btn-hero">
              (504) 383-4552
            </a>
            <a href="mailto:rovnerproperties@gmail.com" className="btn-ghost">
              Email us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
