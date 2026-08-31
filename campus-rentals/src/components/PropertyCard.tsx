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

  // Lock page scroll while the preview modal is open — otherwise touch scroll
  // moves the page behind the fixed modal and the bottom buttons are unreachable.
  useEffect(() => {
    if (!showPreview) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showPreview]);

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
              setThumbnail(data.thumbnail);
              setLoading(false);
              return;
            }
          }
        } catch (dealPhotoError) {
          // fall through to the old photo system below
        }

        // Fallback to old photo system
        const photos = await fetchPropertyPhotos(property.property_id);
        if (photos.length > 0) {
          setThumbnail(getOptimizedImageUrl(photos[0]));
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
              <span className="text-sm text-ink-600">No image available</span>
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
            <p className="mb-2 line-clamp-1 text-sm text-ink-500">{subtitle}</p>
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
            <p className="text-xs font-medium text-ink-500">
              Available {formatAvailableDate(property.leaseTerms)}
            </p>
            {!isMobile && (
              <span className="group/link flex items-center gap-1 text-sm font-semibold text-accent-deep">
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
                className="flex-1 rounded-xl bg-accent-deep px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#336E73]"
              >
                View details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Preview Modal */}
      {showPreview && isMobile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={handlePreviewClose}>
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto overscroll-contain shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-48 shrink-0">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ink-100">
                  <span className="text-ink-500">No image available</span>
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
              <h3 className="mb-3 text-xl font-semibold tracking-tight text-ink-900">{title}</h3>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="chip">{bedsLabel}</span>
                <span className="chip">{bathsLabel}</span>
                {property.squareFeet && <span className="chip">{property.squareFeet} sq ft</span>}
              </div>

              <p className="mb-4 text-sm text-ink-500">
                {property.description || (isBuilding ? 'Explore available units in this building.' : 'Beautiful property in a prime location near campus.')}
              </p>

              <div className="mb-5">
                <span className="text-2xl font-semibold tracking-tight text-ink-900">{priceLabel}</span>
                <p className="mt-1 text-sm text-ink-500">Available {availabilityText}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePreviewClose}
                  className="flex-1 rounded-xl bg-ink-100 px-4 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-200"
                >
                  Close
                </button>
                <button
                  onClick={handleViewDetails}
                  className="flex-1 rounded-xl bg-accent-deep px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#336E73]"
                >
                  View full details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}