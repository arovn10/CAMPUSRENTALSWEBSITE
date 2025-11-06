import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tulane Off Campus Housing | Premium Student Rentals Near Tulane University | Campus Rentals',
  description: 'Find the best off campus housing near Tulane University in New Orleans. Premium student apartments, houses, and rentals in the Tulane area within walking distance of campus. View photos, pricing, and amenities for off-campus housing near Tulane.',
  keywords: [
    'Tulane off campus housing',
    'Tulane off campus apartments',
    'off campus housing Tulane',
    'Tulane student housing',
    'Tulane University off campus housing',
    'off campus housing near Tulane',
    'student housing near Tulane',
    'Tulane off campus rentals',
    'Tulane student apartments',
    'off campus housing Tulane University',
    'Tulane housing off campus',
    'Tulane off campus living',
    'student rentals near Tulane',
    'Tulane off campus housing search',
    'best off campus housing Tulane',
    'luxury off campus housing Tulane',
    'Tulane off campus housing uptown',
    'off campus housing for Tulane students',
    'Tulane off campus housing options',
    'Tulane off campus housing reviews',
  ],
  alternates: {
    canonical: 'https://campusrentalsllc.com/tulane-housing',
  },
  openGraph: {
    title: 'Tulane Off Campus Housing | Premium Student Rentals Near Tulane University',
    description: 'Find the best Tulane off campus housing near Tulane University. Premium student apartments and houses within walking distance of campus.',
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
    description: 'Find the best Tulane off campus housing near Tulane University. Premium student apartments and houses.',
    images: ['https://campusrentalsllc.com/og-tulane-housing.jpg'],
  },
};

export default function TulaneHousingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

