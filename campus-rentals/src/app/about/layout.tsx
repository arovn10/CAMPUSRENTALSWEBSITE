import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Campus Rentals | Off-Campus Student Housing Near Tulane & FAU',
  description: 'Learn about Campus Rentals LLC - your trusted provider of premium off-campus student housing near Tulane University in New Orleans and Florida Atlantic University (FAU) in Boca Raton. Discover why students choose us for affordable, modern student apartments and rentals.',
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

