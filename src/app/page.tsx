import React from 'react';
import { fetchProperties, fetchPropertyPhotos } from '@/utils/api';
import PropertyCard from '@/components/PropertyCard';
import PropertyMap from '@/components/PropertyMap';
import ContactForm from '@/components/ContactForm';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default async function Home() {
  const properties = await fetchProperties();
  console.log('Properties:', properties);

  // Fetch photos for each property
  const propertiesWithPhotos = await Promise.all(
    properties.map(async (property) => {
      const photos = await fetchPropertyPhotos(property.id);
      console.log(`Photos for property ${property.id}:`, photos);
      const photoUrl = photos[0]?.url;
      console.log(`Photo URL for property ${property.id}:`, photoUrl);
      return {
        ...property,
        photoUrl: photoUrl && isValidUrl(photoUrl) ? photoUrl : null,
      };
    })
  );

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        <div className="container relative mx-auto flex h-full flex-col items-start justify-center px-4">
          <h1 className="text-5xl font-bold text-white md:text-6xl">
            Campus Rentals LLC
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-white/90">
            Premium student housing near Tulane University. Find your perfect home away from home.
          </p>
        </div>
      </section>

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
          {propertiesWithPhotos.map((property) => (
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