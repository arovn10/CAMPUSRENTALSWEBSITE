'use client';

import React, { useState, useEffect } from 'react';
import { fetchProperties, fetchPropertyPhotos } from '@/utils/api';
import PropertyCard from '@/components/PropertyCard';
import PropertyMap from '@/components/PropertyMap';
import ContactForm from '@/components/ContactForm';
import { Property } from '@/types';
import Link from 'next/link';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch photos for each property
  const propertiesWithPhotos = React.useMemo(async () => {
    if (properties.length === 0) return [];
    const photosPromises = properties.map(async (property) => {
      const photos = await fetchPropertyPhotos(property.id);
      console.log(`Photos for property ${property.id}:`, photos);
      const photoUrl = photos[0]?.url;
      console.log(`Photo URL for property ${property.id}:`, photoUrl);
      return {
        ...property,
        photoUrl: photoUrl && isValidUrl(photoUrl) ? photoUrl : null,
      };
    });
    return Promise.all(photosPromises);
  }, [properties]);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-screen">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="https://abodebucket.s3.us-east-2.amazonaws.com/uploads/ArchitecturalAnimation.MP4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent" />
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

      {/* Map Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-8 text-3xl font-bold text-gray-900">Find Your Home</h2>
        <div className="rounded-lg overflow-hidden shadow-lg">
          <PropertyMap properties={properties} />
        </div>
      </section>

      {/* Properties Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-8 text-3xl font-bold text-gray-900">Available Properties</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard 
              key={property.id} 
              property={property} 
              photoUrl={property.photoUrl} 
            />
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-3xl font-bold text-gray-900">Contact Us</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Get in Touch</h3>
              <p className="mt-4 text-gray-600">
                Have questions about our properties? Interested in scheduling a tour?
                Fill out the form and we'll get back to you as soon as possible.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
} 