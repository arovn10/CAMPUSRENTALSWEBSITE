import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tulane Off Campus Housing | Premium Student Rentals Near Tulane University',
  description: 'Find the best Tulane off campus housing near Tulane University in New Orleans. Premium student apartments and houses within walking distance of campus. Fully furnished, move-in ready rentals with modern amenities. View available properties today!',
  keywords: [
    'Tulane off campus housing',
    'Tulane off campus apartments',
    'off campus housing near Tulane',
    'Tulane student housing',
    'Tulane University housing',
    'off campus apartments near Tulane',
    'Tulane area student rentals',
    'Tulane off campus rentals',
    'student housing near Tulane',
    'Tulane student apartments',
    'off campus housing Tulane University',
    'Tulane area housing',
    'New Orleans student housing',
    'Uptown New Orleans rentals',
    'Tulane off campus living',
    'Tulane housing options',
    'near Tulane University housing',
    'Tulane off campus housing New Orleans',
  ],
  alternates: {
    canonical: 'https://campusrentalsllc.com/tulane-housing',
  },
  openGraph: {
    title: 'Tulane Off Campus Housing | Premium Student Rentals Near Tulane University',
    description: 'Find the best Tulane off campus housing near Tulane University. Premium student apartments and houses within walking distance of campus. Fully furnished, move-in ready.',
    url: 'https://campusrentalsllc.com/tulane-housing',
    siteName: 'Campus Rentals LLC',
    images: [
      {
        url: 'https://campusrentalsllc.com/og-tulane-housing.jpg',
        width: 1200,
        height: 630,
        alt: 'Tulane Off Campus Housing - Campus Rentals LLC',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tulane Off Campus Housing | Premium Student Rentals',
    description: 'Find the best Tulane off campus housing near Tulane University. Premium student apartments within walking distance of campus.',
    images: ['https://campusrentalsllc.com/og-tulane-housing.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'geo.region': 'US-LA',
    'geo.placename': 'New Orleans, Louisiana',
    'geo.position': '29.9511;-90.0715',
    'ICBM': '29.9511, -90.0715',
  },
};

