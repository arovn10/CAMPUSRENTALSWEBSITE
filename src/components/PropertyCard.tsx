import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Property } from '@/utils/api';

interface PropertyCardProps {
  property: Property;
  photoUrl?: string | null;
}

const isValidUrl = (url: string) => {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function PropertyCard({ property, photoUrl }: PropertyCardProps) {
  console.log('PropertyCard rendering with photoUrl:', photoUrl);
  const validPhotoUrl = photoUrl && isValidUrl(photoUrl) ? photoUrl : null;

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="group relative overflow-hidden rounded-lg bg-white shadow-lg transition-all duration-300 hover:shadow-xl">
        <div className="aspect-w-16 aspect-h-9 relative">
          {validPhotoUrl ? (
            <Image
              src={validPhotoUrl}
              alt={property.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900">{property.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{property.location}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{property.bedrooms} beds</span>
              <span className="text-sm text-gray-600">•</span>
              <span className="text-sm text-gray-600">{property.bathrooms} baths</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              ${property.price.toLocaleString()}/mo
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
