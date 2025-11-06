import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Campus Rentals LLC | Off-Campus Student Housing Near Tulane & FAU',
    template: '%s | Campus Rentals LLC',
  },
  description: 'Find premium off-campus student housing near Tulane University in New Orleans and Florida Atlantic University (FAU) in Boca Raton. Browse affordable apartments, houses, and rentals perfect for college students. View photos, amenities, and pricing for the best off-campus housing options.',
  keywords: [
    'Tulane off campus housing',
    'Tulane off campus apartments',
    'Tulane student housing',
    'Tulane University housing',
    'off campus housing Tulane',
    'Tulane rentals',
    'student apartments near Tulane',
    'FAU off campus housing',
    'FAU off campus apartments',
    'FAU student housing',
    'Florida Atlantic University housing',
    'off campus housing FAU',
    'FAU rentals',
    'student apartments near FAU',
    'Boca Raton student housing',
    'New Orleans student housing',
    'college student apartments',
    'university housing',
    'student rentals',
    'off campus living',
    'campus rentals',
    'student housing near campus',
    'affordable student housing',
    'student apartments',
    'college housing',
  ],
  authors: [{ name: 'Campus Rentals LLC' }],
  creator: 'Campus Rentals LLC',
  publisher: 'Campus Rentals LLC',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://campusrentalsllc.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://campusrentalsllc.com',
    siteName: 'Campus Rentals LLC',
    title: 'Campus Rentals LLC | Off-Campus Student Housing Near Tulane & FAU',
    description: 'Find premium off-campus student housing near Tulane University in New Orleans and Florida Atlantic University (FAU) in Boca Raton. Browse affordable apartments, houses, and rentals perfect for college students.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Campus Rentals LLC - Off-Campus Student Housing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campus Rentals LLC | Off-Campus Student Housing Near Tulane & FAU',
    description: 'Find premium off-campus student housing near Tulane University and FAU. Browse affordable student apartments and rentals.',
    images: ['/og-image.jpg'],
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
  verification: {
    google: process.env.GOOGLE_VERIFICATION_ID,
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Campus Rentals LLC',
    description: 'Premium off-campus student housing near Tulane University in New Orleans and Florida Atlantic University (FAU) in Boca Raton',
    url: 'https://campusrentalsllc.com',
    logo: 'https://campusrentalsllc.com/favicon.png',
    address: [
      {
        '@type': 'PostalAddress',
        addressLocality: 'New Orleans',
        addressRegion: 'LA',
        addressCountry: 'US',
      },
      {
        '@type': 'PostalAddress',
        addressLocality: 'Boca Raton',
        addressRegion: 'FL',
        addressCountry: 'US',
      },
    ],
    areaServed: [
      {
        '@type': 'City',
        name: 'New Orleans',
        sameAs: 'https://en.wikipedia.org/wiki/New_Orleans',
      },
      {
        '@type': 'City',
        name: 'Boca Raton',
        sameAs: 'https://en.wikipedia.org/wiki/Boca_Raton,_Florida',
      },
    ],
    serviceType: 'Student Housing',
    priceRange: '$$',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
    },
    sameAs: [
      'https://www.facebook.com/campusrentalsllc',
      'https://www.instagram.com/campusrentalsllc',
    ],
  };

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Campus Rentals LLC',
    url: 'https://campusrentalsllc.com',
    logo: 'https://campusrentalsllc.com/favicon.png',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: 'English',
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="canonical" href="https://campusrentalsllc.com" />
        <meta name="geo.region" content="US-LA,US-FL" />
        <meta name="geo.placename" content="New Orleans, LA; Boca Raton, FL" />
        <meta name="geo.position" content="29.9511;-90.0715;26.3683;-80.1289" />
        <meta name="ICBM" content="29.9511, -90.0715; 26.3683, -80.1289" />
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-11303299747"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-11303299747');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <Header />
        {children}
      </body>
    </html>
  );
} 