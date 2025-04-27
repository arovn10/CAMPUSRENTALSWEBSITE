'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Property } from '@/types';
import { fetchPropertyPhotos } from '@/utils/api';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const photos = await fetchPropertyPhotos(property.property_id);
        if (photos.length > 0) {
          setPhotoUrl(photos[0].photoLink);
        }
      } catch (error) {
        console.error('Error loading property photo:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [property.property_id]);

  return (
    <div className="group bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
      <div className="relative h-72 overflow-hidden">
        {loading ? (
          <div className="w-full h-full bg-gradient-to-br from-secondary/10 to-accent/10 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          </div>
        ) : photoUrl ? (
          <Image
            src={photoUrl}
            alt={property.address}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/10 to-accent/10 flex items-center justify-center">
            <span className="text-text">No image available</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-6 bg-gradient-to-b from-white to-secondary/5">
        <h3 className="text-xl font-bold text-text mb-2 group-hover:text-accent transition-colors duration-300">
          {property.address}
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center text-text bg-secondary/10 px-3 py-1 rounded-full">
            <svg className="w-5 h-5 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {property.bedrooms} beds
          </div>
          <div className="flex items-center text-text bg-secondary/10 px-3 py-1 rounded-full">
            <svg className="w-5 h-5 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {property.bathrooms} baths
          </div>
        </div>
        <p className="text-text/80 mb-4 line-clamp-2">
          {property.description || 'Beautiful property in a prime location near campus.'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            ${property.price}/month
          </span>
          <Link 
            href={`/properties/${property.property_id}`}
            className="text-secondary hover:text-accent font-medium transition-colors duration-300 flex items-center gap-1 group/link"
          >
            View Details
            <span className="transform transition-transform duration-300 group-hover/link:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 