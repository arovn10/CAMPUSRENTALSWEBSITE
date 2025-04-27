import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Campus Rentals',
  description: 'Find your perfect student housing near campus',
  icons: {
    icon: [
      {
        url: '/icons/Campus-Rentals-favicon.png',
        type: 'image/png',
      },
      {
        url: '/icons/Campus-Rentals-favicon.jpg',
        type: 'image/jpeg',
      },
    ],
    apple: [
      {
        url: '/icons/Campus-Rentals-favicon.png',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        {children}
      </body>
    </html>
  );
} 