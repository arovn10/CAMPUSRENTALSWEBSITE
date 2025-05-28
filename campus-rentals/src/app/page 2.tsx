'use client';

import { useState, useEffect, useRef } from 'react';
import { Property } from '@/types';
import { fetchProperties } from '@/utils/clientApi';
import PropertyCard from '@/components/PropertyCard';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoUrl = "https://abodebucket.s3.us-east-2.amazonaws.com/uploads/ArchitecturalAnimation.MP4";

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        const data = await fetchProperties();
        // Shuffle the properties array
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setProperties(shuffled.slice(0, 3));
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      console.log('Initializing video player with URL:', videoUrl);
      
      // Set up event listeners for debugging
      video.onerror = (e) => {
        console.error('Video error:', e);
        console.error('Video error details:', video.error);
        setVideoError(true);
        setIsLoading(false);
      };
      
      video.onloadeddata = () => {
        console.log('Video loaded successfully');
        setIsLoading(false);
      };
      
      video.onloadstart = () => {
        console.log('Video loading started');
      };
      
      video.onstalled = () => {
        console.error('Video stalled while loading');
      };
      
      // Set source and attempt to play
      video.src = videoUrl;
      video.load();
      
      video.play().catch(error => {
        console.error('Video playback failed:', error);
        setVideoError(true);
        setIsLoading(false);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="relative h-screen">
        <div className="absolute inset-0">
          {isLoading && (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-white">
                <p>Loading video...</p>
                <p className="text-sm mt-2">Check console for progress</p>
              </div>
            </div>
          )}
          {!videoError && !isLoading && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              crossOrigin="anonymous"
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
          {videoError && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="text-white text-center">
                <p className="text-xl mb-2">Video failed to load</p>
                <p className="text-sm">Please check the browser console for error details</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent" style={{ zIndex: 1 }} />
        </div>
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Luxury Student Living
          </h1>
          <p className="text-2xl text-gray-300 mb-8 max-w-2xl">
            Experience premium off-campus housing designed for student success
          </p>
          <div className="flex gap-4">
            <Link 
              href="/properties" 
              className="px-8 py-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors duration-300 text-lg font-medium"
            >
              View Properties
            </Link>
            <Link 
              href="/contact" 
              className="px-8 py-4 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-colors duration-300 text-lg font-medium"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Why Choose Campus Rentals?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm hover:bg-gray-900/70 transition-colors duration-300">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Premium Locations</h3>
              <p className="text-gray-400">Prime locations near top universities with easy access to campus and city amenities.</p>
            </div>
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm hover:bg-gray-900/70 transition-colors duration-300">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Secure & Safe</h3>
              <p className="text-gray-400">24/7 security and modern safety features for your peace of mind.</p>
            </div>
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm hover:bg-gray-900/70 transition-colors duration-300">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Modern Amenities</h3>
              <p className="text-gray-400">State-of-the-art facilities and amenities designed for student comfort.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Featured Properties
          </h2>
          {loading ? (
            <div className="flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {properties.map((property) => (
                <PropertyCard key={property.property_id} property={property} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Ready to Find Your Perfect Home?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Browse our properties or contact us to schedule a viewing today.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/properties" 
              className="px-8 py-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors duration-300 text-lg font-medium"
            >
              View All Properties
            </Link>
            <Link 
              href="/contact" 
              className="px-8 py-4 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-colors duration-300 text-lg font-medium"
            >
              Get in Touch
            </Link>
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
  );
} 