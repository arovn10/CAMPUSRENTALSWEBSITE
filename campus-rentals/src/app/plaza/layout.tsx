import { Metadata } from 'next'

const title = 'Campus Rentals Plaza | Mixed-Use Living on Maple Street, New Orleans'
const description =
  'Campus Rentals Plaza — a new mixed-use development at 7900 Maple Street, New Orleans. Seven residences above a restaurant, boutique commercial space, and a string-lit courtyard, steps from the St. Charles streetcar. Opening mid-2027. Join the waitlist.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/plaza' },
  openGraph: {
    title,
    description,
    url: 'https://campusrentalsllc.com/plaza',
    siteName: 'Campus Rentals LLC',
    images: [{ url: '/plaza/hero.jpg', width: 2624, height: 1632, alt: 'Campus Rentals Plaza rendering — 7900 Maple Street' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/plaza/hero.jpg'],
  },
}

export default function PlazaLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name: 'Campus Rentals Plaza',
    description,
    url: 'https://campusrentalsllc.com/plaza',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '7900 Maple Street',
      addressLocality: 'New Orleans',
      addressRegion: 'LA',
      postalCode: '70118',
      addressCountry: 'US',
    },
    numberOfAccommodationUnits: 7,
    image: 'https://campusrentalsllc.com/plaza/hero.jpg',
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  )
}
