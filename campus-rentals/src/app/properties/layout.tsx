import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Off-Campus Student Housing | Tulane & FAU Properties',
  description: 'Browse every available off-campus rental near Tulane in New Orleans and FAU in Boca Raton — photos, bedrooms, and pricing for each home.',
  keywords: [
    'Tulane off campus housing',
    'Tulane off campus apartments',
    'Tulane student housing listings',
    'FAU off campus housing',
    'FAU off campus apartments',
    'FAU student housing listings',
    'student apartments New Orleans',
    'student apartments Boca Raton',
    'off campus housing listings',
    'college student rentals',
    'university housing search',
    'student housing near campus',
  ],
  openGraph: {
    title: 'Browse Off-Campus Student Housing | Tulane & FAU Properties',
    description: 'Find your perfect off-campus student housing near Tulane University and FAU. Browse apartments, houses, and rentals with photos, pricing, and amenities.',
    url: 'https://campusrentalsllc.com/properties',
    siteName: 'Campus Rentals LLC',
    type: 'website',
    // Must be restated: declaring `openGraph` without `images` drops the root og:image.
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Campus Rentals LLC student housing' }],
  },
  alternates: {
    canonical: 'https://campusrentalsllc.com/properties',
  },
}

export default function PropertiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

