'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image'
import Link from 'next/link'
import { fetchProperties, fetchPropertyPhotos, getOptimizedImageUrl } from '@/utils/clientApi'
import { Property } from '@/types';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

function getRandomItem(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export default function AboutPage() {
  const [randomPhotos, setRandomPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRandomPhotos = async () => {
      try {
        setLoading(true);
        const properties = await fetchProperties();
        const randomProperties = properties.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        const photosPromises = randomProperties.map(async (property) => {
          const photos = await fetchPropertyPhotos(property.property_id);
          const randomPhoto = getRandomItem(photos);
          return randomPhoto ? getOptimizedImageUrl(randomPhoto) : null;
        });

        const photos = await Promise.all(photosPromises);
        setRandomPhotos(photos.filter((url): url is string => url !== null && isValidUrl(url)));
      } catch (error) {
        console.error('Error loading photos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRandomPhotos();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="relative py-24">
        <div className="absolute inset-0">
          <Image
            src="/Campus-Rentals.png"
            alt="About Campus Rentals"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 flex flex-col justify-center items-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            About Us
          </h1>
          <p className="text-2xl text-gray-300 text-center max-w-3xl">
            Your trusted partner in off-campus student housing
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm relative overflow-hidden">
              {randomPhotos[0] && (
                <div className="absolute inset-0 opacity-20">
                  <Image
                    src={randomPhotos[0]}
                    alt="Property Background"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="relative">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  Our Mission
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  At Campus Rentals, we are dedicated to providing exceptional off-campus housing solutions for students. 
                  Our mission is to create comfortable, safe, and convenient living spaces that enhance the college experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Quality */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm group hover:bg-gray-900/70 transition-all duration-300 relative overflow-hidden">
              {randomPhotos[1] && (
                <div className="absolute inset-0 opacity-20">
                  <Image
                    src={randomPhotos[1]}
                    alt="Property Background"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="relative">
                <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  Quality
                </h3>
                <p className="text-gray-300">
                  We maintain the highest standards in property maintenance and management, ensuring our properties are always in top condition.
                </p>
              </div>
            </div>

            {/* Community */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm group hover:bg-gray-900/70 transition-all duration-300 relative overflow-hidden">
              {randomPhotos[2] && (
                <div className="absolute inset-0 opacity-20">
                  <Image
                    src={randomPhotos[2]}
                    alt="Property Background"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="relative">
                <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  Community
                </h3>
                <p className="text-gray-300">
                  We foster a sense of community among our tenants, creating an environment where students can thrive both academically and socially.
                </p>
              </div>
            </div>

            {/* Innovation */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm group hover:bg-gray-900/70 transition-all duration-300 relative overflow-hidden">
              {randomPhotos[0] && (
                <div className="absolute inset-0 opacity-20">
                  <Image
                    src={randomPhotos[0]}
                    alt="Property Background"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="relative">
                <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  Innovation
                </h3>
                <p className="text-gray-300">
                  We continuously innovate our services and properties to meet the evolving needs of today's students.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Have questions about our properties or services? We're here to help!
          </p>
          <div className="flex justify-center gap-4">
            <a 
              href="tel:5043834552" 
              className="px-8 py-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors duration-300 text-lg font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              (504) 383-4552
            </a>
            <a 
              href="mailto:rovnerproperties@gmail.com" 
              className="px-8 py-4 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-colors duration-300 text-lg font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              rovnerproperties@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-400 mb-2">
              Powered by Abode Student Listing Service
            </p>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Campus Rentals. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 