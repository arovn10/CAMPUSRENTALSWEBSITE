import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Off-Campus Student Housing | Tulane & FAU Properties',
  description: 'Browse our complete selection of off-campus student housing near Tulane University in New Orleans and Florida Atlantic University (FAU) in Boca Raton. Filter by bedrooms, price, and location to find your perfect student apartment or rental property.',
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

