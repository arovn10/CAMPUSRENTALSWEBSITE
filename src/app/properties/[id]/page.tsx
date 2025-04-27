import React from 'react';
import Image from 'next/image';
import { fetchProperties, fetchPropertyPhotos } from '../../utils/api';
import PropertyMap from '../../components/PropertyMap';

interface PropertyPageProps {
  params: {
    id: string;
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const propertyId = params.id;
  const properties = await fetchProperties();
  const property = properties.find(p => p.id === propertyId);
  const photos = await fetchPropertyPhotos(propertyId);

  if (!property) {
    return <div>Property not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Property Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
          <p className="mt-2 text-lg text-gray-600">{property.location}</p>
          <div className="mt-4 flex items-center space-x-4">
            <span className="text-2xl font-semibold text-primary-600">
              ${property.price.toLocaleString()}/mo
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">{property.bedrooms} beds</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-600">{property.bathrooms} baths</span>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {photos.length > 0 ? (
            photos.map((photo) => (
              <div key={photo.id} className="relative aspect-video">
                <Image
                  src={photo.url}
                  alt={property.title}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            ))
          ) : (
            <div className="flex h-64 items-center justify-center bg-gray-100 col-span-full">
              <span className="text-gray-400">No images available</span>
            </div>
          )}
        </div>
      </div>

      {/* Property Details */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Description</h2>
            <p className="mt-4 text-gray-600">{property.description}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Location</h2>
            <div className="mt-4 h-[400px]">
              <PropertyMap properties={[property]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 