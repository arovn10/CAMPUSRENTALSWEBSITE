'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Property } from '@/types';
import { fetchPropertyPhotos, getOptimizedImageUrl } from '@/utils/clientApi';

interface PropertyCardProps {
  property: Property;
}

function formatAvailableDate(leaseTerms: string | null): string {
  if (!leaseTerms) return 'Contact for details';
  const date = new Date(leaseTerms);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return leaseTerms;
}

function formatNumberRange(min: number | null | undefined, max: number | null | undefined, suffix: string): string {
  if (min == null && max == null) return 'Contact for details';
  if (min != null && max != null) {
    if (min === max) return `${min} ${suffix}`;
    return `${min}-${max} ${suffix}`;
  }
  if (min != null) return `${min}+ ${suffix}`;
  return `${max} ${suffix}`;
}

function formatPriceRange(min: number | null | undefined, max: number | null | undefined, fallback?: number): string {
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const rangeMin = min ?? fallback ?? null;
  const rangeMax = max ?? fallback ?? null;
  if (rangeMin == null && rangeMax == null) return 'Contact for pricing';
  if (rangeMin != null && rangeMax != null) {
    if (rangeMin === rangeMax) return `${format(rangeMin)}/month`;
    return `${format(rangeMin)} - ${format(rangeMax)}/month`;
  }
  if (rangeMin != null) return `${format(rangeMin)}+/month`;
  if (rangeMax != null) return `${format(rangeMax)}/month`;
  return 'Contact for pricing';
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isBuilding =
    property.isBuildingGroup || property.isBuilding || property.propertyTypeCategory === 'MultiUnit';
  const title = isBuilding
    ? property.buildingName || property.name || property.address
    : property.address;
  const subtitle = isBuilding ? property.buildingAddress || property.address : property.name;
  const bedsLabel = isBuilding
    ? formatNumberRange(property.minBeds ?? property.bedrooms, property.maxBeds ?? property.bedrooms, 'beds')
    : `${property.bedrooms} beds`;
  const bathsLabel = isBuilding
    ? formatNumberRange(property.minBaths ?? property.bathrooms, property.maxBaths ?? property.bathrooms, 'baths')
    : `${property.bathrooms} baths`;
  const priceLabel = isBuilding
    ? formatPriceRange(property.minRent, property.maxRent, property.price)
    : `$${property.price}/month`;
  const availabilityText = isBuilding
    ? 'Contact for availability'
    : formatAvailableDate(property.leaseTerms);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        setLoading(true);
        // First try to get DealPhoto thumbnail (from investor portal)
        try {
          const response = await fetch(`/api/properties/thumbnail/${property.property_id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.thumbnail) {
              console.log(`Setting DealPhoto thumbnail for property ${property.property_id}:`, data.thumbnail);
              setThumbnail(data.thumbnail);
              setLoading(false);
              return;
            }
          }
        } catch (dealPhotoError) {
          console.log('No DealPhoto thumbnail found, trying old photos...');
        }
        
        // Fallback to old photo system
        console.log(`Loading photos for property ${property.property_id}...`);
        const photos = await fetchPropertyPhotos(property.property_id);
        console.log(`Received ${photos.length} photos for property ${property.property_id}:`, photos);
        
        if (photos.length > 0) {
          const photoUrl = getOptimizedImageUrl(photos[0]);
          console.log(`Setting thumbnail URL for property ${property.property_id}:`, photoUrl);
          setThumbnail(photoUrl);
        } else {
          console.log(`No photos found for property ${property.property_id}`);
        }
      } catch (error) {
        console.error('Error loading property thumbnail:', error);
      } finally {
        setLoading(false);
      }
    };
    loadThumbnail();
  }, [property.property_id]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isMobile) {
      // On mobile, first tap shows preview
      e.preventDefault();
      setShowPreview(true);
      return;
    }
    // On desktop, navigate to details
    window.location.href = `/properties/${property.property_id}`;
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
  };

  const handleViewDetails = () => {
    window.location.href = `/properties/${property.property_id}`;
  };

  return (
    <>
      <div
        className="group card-premium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
        onClick={handleCardClick}
      >
        <div className="relative h-56 overflow-hidden sm:h-64 md:h-72">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center bg-ink-100">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-accent border-t-transparent"></div>
            </div>
          ) : thumbnail ? (
            <Image
              src={thumbnail || ''}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
              placeholder="blur"
              blurDataURL="/placeholder.png"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ink-100">
              <span className="text-sm text-ink-400">No image available</span>
            </div>
          )}
          {/* Price badge */}
          <div className="absolute bottom-3 left-3 rounded-full bg-ink-950/75 px-3.5 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
            {priceLabel}
          </div>
          {isBuilding && (
            <div className="absolute top-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-ink-700 backdrop-blur-md">
              Building{property.unitCount ? ` · ${property.unitCount} units` : ''}
            </div>
          )}
          {isMobile && !showPreview && (
            <div className="absolute top-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-ink-600 backdrop-blur-md">
              Tap to preview
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="mb-0.5 line-clamp-1 text-lg font-semibold tracking-tight text-ink-900 transition-colors duration-300 group-hover:text-accent">
            {title}
          </h3>
          {subtitle && subtitle !== title && (
            <p className="mb-2 line-clamp-1 text-sm text-ink-400">{subtitle}</p>
          )}

          <div className="mb-4 mt-3 flex flex-wrap items-center gap-2">
            <span className="chip">{bedsLabel}</span>
            <span className="chip">{bathsLabel}</span>
            {property.squareFeet && <span className="chip">{property.squareFeet} sq ft</span>}
          </div>

          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-ink-500">
            {property.description || 'Beautiful property in a prime location near campus.'}
          </p>

          <div className="flex items-center justify-between border-t border-ink-100 pt-4">
            <p className="text-xs font-medium text-ink-400">
              Available {formatAvailableDate(property.leaseTerms)}
            </p>
            {!isMobile && (
              <span className="group/link flex items-center gap-1 text-sm font-semibold text-accent">
                Details
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            )}
          </div>

          {isMobile && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreview(true);
                }}
                className="flex-1 rounded-xl bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-200"
              >
                Preview
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails();
                }}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4b9ba2]"
              >
                View details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Preview Modal */}
      {showPreview && isMobile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="relative h-48">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-secondary/10 to-accent/10 flex items-center justify-center">
                  <span className="text-text">No image available</span>
                </div>
              )}
              <button
                onClick={handlePreviewClose}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-text mb-3">{title}</h3>
              
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center text-text bg-secondary/10 px-3 py-1 rounded-full text-sm">
                  <svg className="w-4 h-4 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {bedsLabel}
                </div>
                <div className="flex items-center text-text bg-secondary/10 px-3 py-1 rounded-full text-sm">
                  <svg className="w-4 h-4 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {bathsLabel}
                </div>
                {property.squareFeet && (
                  <div className="flex items-center text-text bg-secondary/10 px-3 py-1 rounded-full text-sm">
                    <svg className="w-4 h-4 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    {property.squareFeet} sq ft
                  </div>
                )}
              </div>
              
              <p className="text-text/80 mb-4 text-sm">
                {property.description || (isBuilding ? 'Explore available units in this building.' : 'Beautiful property in a prime location near campus.')}
              </p>
              
              <div className="mb-4">
                <span className="text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  {priceLabel}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Available From: {availabilityText}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handlePreviewClose}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleViewDetails}
                  className="flex-1 bg-accent text-white px-4 py-3 rounded-lg font-medium hover:bg-accent/90 transition-colors"
                >
                  View Full Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}