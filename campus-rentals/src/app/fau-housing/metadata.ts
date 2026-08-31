import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAU Off Campus Housing | Premium Student Rentals Near Florida Atlantic University',
  description:
    'Find the best off campus housing near FAU in Boca Raton. Premium student apartments and houses close to Florida Atlantic University. Fully furnished, move-in ready rentals with modern amenities. View available properties today!',
  keywords: [
    'FAU off campus housing',
    'FAU off campus apartments',
    'off campus housing near FAU',
    'FAU student housing',
    'Florida Atlantic University housing',
    'off campus apartments near FAU',
    'FAU area student rentals',
    'FAU off campus rentals',
    'student housing near FAU',
    'FAU student apartments',
    'off campus housing Florida Atlantic University',
    'FAU area housing',
    'Boca Raton student housing',
    'Boca Raton rentals',
    'FAU off campus living',
    'FAU housing options',
    'near FAU housing',
    'FAU off campus housing Boca Raton',
  ],
  alternates: {
    canonical: 'https://campusrentalsllc.com/fau-housing',
  },
  openGraph: {
    title: 'FAU Off Campus Housing | Premium Student Rentals Near Florida Atlantic University',
    description:
      'Find the best off campus housing near FAU in Boca Raton. Premium student apartments and houses close to campus. Fully furnished, move-in ready.',
    url: 'https://campusrentalsllc.com/fau-housing',
    siteName: 'Campus Rentals LLC',
    images: [
      {
        url: 'https://campusrentalsllc.com/og-fau-housing.jpg',
        width: 1200,
        height: 630,
        alt: 'FAU Off Campus Housing - Campus Rentals LLC',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAU Off Campus Housing | Premium Student Rentals',
    description: 'Find the best off campus housing near FAU in Boca Raton. Premium student apartments close to campus.',
    images: ['https://campusrentalsllc.com/og-fau-housing.jpg'],
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
    'geo.region': 'US-FL',
    'geo.placename': 'Boca Raton, Florida',
    'geo.position': '26.3683;-80.1289',
    ICBM: '26.3683, -80.1289',
  },
};
