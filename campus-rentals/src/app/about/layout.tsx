import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Locally Owned Student Housing',
  description: 'Campus Rentals LLC is a locally owned student-housing operator serving Tulane in New Orleans and FAU in Boca Raton — renovated homes, managed by the owners.',
  keywords: [
    'Tulane off campus housing',
    'Tulane off campus apartments',
    'Tulane student housing',
    'FAU off campus housing',
    'FAU off campus apartments',
    'FAU student housing',
    'off campus housing near Tulane',
    'off campus housing near FAU',
    'student apartments New Orleans',
    'student apartments Boca Raton',
    'college student housing',
    'university housing',
  ],
  openGraph: {
    title: 'About Campus Rentals | Off-Campus Student Housing Near Tulane & FAU',
    description: 'Learn about Campus Rentals LLC - premium off-campus student housing near Tulane University and FAU.',
    url: 'https://campusrentalsllc.com/about',
    siteName: 'Campus Rentals LLC',
    type: 'website',
    // Must be restated: declaring `openGraph` without `images` drops the root og:image.
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Campus Rentals LLC student housing' }],
  },
  alternates: {
    canonical: 'https://campusrentalsllc.com/about',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

