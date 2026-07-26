import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Talk to a Real Person',
  description:
    'Call (504) 383-4552 or email Campus Rentals LLC about off-campus student housing near Tulane in New Orleans and FAU in Boca Raton. Owners answer the phone.',
  alternates: { canonical: 'https://campusrentalsllc.com/contact' },
  openGraph: {
    title: 'Contact Campus Rentals LLC',
    description:
      'Questions about a home, a tour, or an application? Call (504) 383-4552 or send us a note — we answer.',
    url: 'https://campusrentalsllc.com/contact',
    siteName: 'Campus Rentals LLC',
    type: 'website',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Contact Campus Rentals LLC' }],
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
