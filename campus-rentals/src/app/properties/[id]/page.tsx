'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Property, PropertyAmenities } from '@/utils/api';
import { fetchProperties, getOptimizedImageUrl } from '@/utils/clientApi';
import { CachedPhoto, fetchPropertyPhotos } from '@/utils/clientApi';
import { fetchPropertyAmenities } from '@/utils/api';
import Link from 'next/link';
import {
  HomeIcon,
  BoltIcon,
  TruckIcon,
  WrenchIcon,
  CloudIcon,
  SparklesIcon,
  FireIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import LeadCapture from '@/components/LeadCapture';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params.id);

  const [property, setProperty] = useState<Property | null>(null);
  const [photos, setPhotos] = useState<CachedPhoto[]>([]);
  const [amenities, setAmenities] = useState<PropertyAmenities | null>(null);
  const [relatedUnits, setRelatedUnits] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadPropertyDetails = async () => {
      try {
        setLoading(true);

        // Use optimized single-property API endpoint (from cache)
        const response = await fetch(`/api/properties/${propertyId}`, {
          cache: 'default', // Use browser cache
        });

        if (!response.ok) {
          throw new Error('Property not found');
        }

        const data = await response.json();

        if (cancelled) return;

        setProperty(data.property);
        const loadedPhotos = data.photos || [];
        setPhotos(loadedPhotos);
        setAmenities(data.amenities || null);
        setRelatedUnits(Array.isArray(data.units) ? data.units : []);
        setSelectedPhoto(loadedPhotos[0]?.photoLink || null);
        setError(null);

        // Preload all photos immediately for instant display and browser caching
        if (loadedPhotos.length > 0) {
          loadedPhotos.forEach((photo: CachedPhoto, index: number) => {
            const photoUrl = getOptimizedImageUrl(photo);

            // Method 1: Preload using Image object (browser cache)
            const img = new window.Image();
            img.src = photoUrl;

            // Method 2: Add link preload tags for better Next.js integration
            if (typeof document !== 'undefined') {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'image';
              link.href = photoUrl;
              link.crossOrigin = 'anonymous';
              document.head.appendChild(link);
            }
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading property details:', err);
          setError('Failed to load property details');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (propertyId) {
      loadPropertyDetails();
    }

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    if (photos.length > 1) {
      const interval = setInterval(() => {
        setHeroPhotoIndex((prev) => {
          const nextIndex = (prev + 1) % photos.length;
          // Preload next photo for smoother transition
          if (photos[nextIndex]) {
            const img = new window.Image();
            img.src = getOptimizedImageUrl(photos[nextIndex]);
          }
          return nextIndex;
        });
      }, 5000); // 5 seconds
      return () => clearInterval(interval);
    }
  }, [photos]);

  // Preload all photos in document head for browser caching
  useEffect(() => {
    if (photos.length > 0 && typeof document !== 'undefined') {
      photos.forEach((photo) => {
        const photoUrl = getOptimizedImageUrl(photo);
        // Check if link already exists
        const existingLink = document.querySelector(`link[href="${photoUrl}"]`);
        if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = photoUrl;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        }
      });
    }

    // Cleanup function to remove preload links when component unmounts
    return () => {
      if (typeof document !== 'undefined' && photos.length > 0) {
        photos.forEach((photo) => {
          const photoUrl = getOptimizedImageUrl(photo);
          const link = document.querySelector(`link[href="${photoUrl}"]`);
          if (link) {
            link.remove();
          }
        });
      }
    };
  }, [photos]);

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

  function formatPriceRange(min: number | null | undefined, max: number | null | undefined): string {
    if (min == null && max == null) return 'Contact for pricing';
    const format = (value: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    if (min != null && max != null) {
      if (min === max) return `${format(min)}/month`;
      return `${format(min)} - ${format(max)}/month`;
    }
    if (min != null) return `${format(min)}+/month`;
    if (max != null) return `${format(max)}/month`;
    return 'Contact for pricing';
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent-deep border-t-transparent"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <div className="text-center">
          <h1 className="text-display font-semibold text-ink-900">Property not found</h1>
          <p className="mx-auto mt-3 max-w-sm text-ink-500">{error || 'This listing may no longer be available.'}</p>
          <Link href="/" className="btn-hero mt-8 inline-flex">
            Back to homes
          </Link>
        </div>
      </div>
    );
  }

  const isBuilding =
    property?.isBuildingGroup ||
    property?.isBuilding ||
    property?.propertyTypeCategory === 'MultiUnit';
  const displayName = property ? (property.buildingName || property.name) : '';
  const displayAddress = property ? (property.buildingAddress || property.address) : '';
  const priceLabel = property
    ? isBuilding
      ? formatPriceRange(property.minRent ?? property.price, property.maxRent ?? property.price)
      : `$${property.price}/month`
    : '';
  const bedsLabel = property
    ? isBuilding
      ? formatNumberRange(property.minBeds ?? property.bedrooms, property.maxBeds ?? property.bedrooms, 'beds')
      : `${property.bedrooms}`
    : '';
  const bathsLabel = property
    ? isBuilding
      ? formatNumberRange(property.minBaths ?? property.bathrooms, property.maxBaths ?? property.bathrooms, 'baths')
      : `${property.bathrooms}`
    : '';
  const squareFeetLabel = property
    ? isBuilding
      ? formatNumberRange(property.squareFeet || null, property.squareFeet || null, 'sq ft')
      : `${property.squareFeet}`
    : '';
  const availabilityLabel = property
    ? isBuilding
      ? 'Contact for availability'
      : formatAvailableDate(property.leaseTerms)
    : '';

  const addressText = `${displayAddress || ''} ${displayName || ''}`.toLowerCase();
  const isNewOrleans = addressText.includes('new orleans') || addressText.includes('nola');
  const isBocaRaton = addressText.includes('boca');
  const hubHref = isNewOrleans ? '/tulane-housing' : isBocaRaton ? '/fau-housing' : '/';
  const hubLabel = isNewOrleans ? 'Tulane / Loyola housing' : isBocaRaton ? 'FAU housing' : 'All homes';

  const amenityList = amenities
    ? [
        { key: 'fullyFurnished', label: 'Fully furnished', icon: HomeIcon },
        { key: 'pool', label: 'Pool', icon: SparklesIcon },
        { key: 'powderRoom', label: 'Powder room', icon: BoltIcon },
        { key: 'driveway', label: 'Driveway', icon: TruckIcon },
        { key: 'laundryUnit', label: 'Laundry unit', icon: WrenchIcon },
        { key: 'centralAc', label: 'Central AC', icon: CloudIcon },
        { key: 'backyard', label: 'Backyard', icon: SparklesIcon },
        { key: 'fireplace', label: 'Fireplace', icon: FireIcon },
        { key: 'petFriendly', label: 'Pet friendly', icon: HeartIcon },
      ].filter((a) => (amenities as unknown as Record<string, boolean>)[a.key])
    : [];

  const currentPhoto = photos[selectedPhotoIndex];
  const currentPhotoUrl = currentPhoto ? getOptimizedImageUrl(currentPhoto) : null;
  const isAllowedDomain =
    !!currentPhotoUrl &&
    (currentPhotoUrl.includes('d1m1syk7iv23tg.cloudfront.net') ||
      currentPhotoUrl.includes('abodebucket.s3.us-east-2.amazonaws.com') ||
      currentPhotoUrl.includes('campusrentalswebsitebucket.s3.us-east-1.amazonaws.com'));

  const showPrevPhoto = () => {
    setSelectedPhotoIndex((i) => {
      const next = i === 0 ? photos.length - 1 : i - 1;
      if (photos[next]) {
        const img = new window.Image();
        img.src = getOptimizedImageUrl(photos[next]);
      }
      return next;
    });
  };

  const showNextPhoto = () => {
    setSelectedPhotoIndex((i) => {
      const next = i === photos.length - 1 ? 0 : i + 1;
      if (photos[next]) {
        const img = new window.Image();
        img.src = getOptimizedImageUrl(photos[next]);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-ink-50 pb-24 lg:pb-0">
      {/* ============ BREADCRUMB ============ */}
      <div className="border-b border-ink-100 bg-white">
        <div className="section-shell flex items-center gap-2 py-4 text-sm text-ink-500">
          <Link href="/" className="transition-colors hover:text-ink-900">Home</Link>
          <span className="text-ink-300">/</span>
          <Link href={hubHref} className="transition-colors hover:text-ink-900">{hubLabel}</Link>
          <span className="text-ink-300">/</span>
          <span className="line-clamp-1 font-medium text-ink-700">{displayName}</span>
        </div>
      </div>

      {/* ============ GALLERY ============ */}
      <div className="section-shell pt-6 sm:pt-8">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-ink-200 sm:aspect-[16/9]">
          {photos.length > 0 && currentPhotoUrl ? (
            <Image
              key={`photo-${selectedPhotoIndex}-${currentPhoto?.photoId || currentPhoto?.photoLink || 'p'}`}
              src={currentPhotoUrl}
              alt={`${displayName} - Photo ${selectedPhotoIndex + 1} of ${photos.length}`}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              priority
              quality={90}
              unoptimized={!isAllowedDomain}
              onError={(e) => {
                console.error('Image failed to load:', currentPhotoUrl);
                const target = e.target as HTMLImageElement;
                if (target && target.parentElement) {
                  const img = document.createElement('img');
                  img.src = currentPhotoUrl;
                  img.alt = `${displayName} - Photo ${selectedPhotoIndex + 1}`;
                  img.className = 'w-full h-full object-cover';
                  target.parentElement.replaceChild(img, target);
                }
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-500">No photos available</div>
          )}

          {photos.length > 1 && (
            <>
              <button
                onClick={showPrevPhoto}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink-950/55 text-white backdrop-blur-md transition-colors hover:bg-ink-950/80"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={showNextPhoto}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink-950/55 text-white backdrop-blur-md transition-colors hover:bg-ink-950/80"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 right-4 rounded-full bg-ink-950/65 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                {selectedPhotoIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {photos.map((photo, index) => (
              <button
                key={photo.photoId || index}
                onClick={() => setSelectedPhotoIndex(index)}
                aria-label={`Show photo ${index + 1}`}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${
                  index === selectedPhotoIndex ? 'ring-accent-deep' : 'ring-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={getOptimizedImageUrl(photo)} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============ HEADER ============ */}
      <div className="section-shell mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display font-semibold tracking-tight text-ink-900">{displayName}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-ink-500">
            <MapPinIcon className="h-4 w-4 shrink-0" />
            {displayAddress}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white px-5 py-3 text-right shadow-soft ring-1 ring-ink-900/5">
          <p className="text-2xl font-semibold tracking-tight text-ink-900">{priceLabel}</p>
          <p className="text-xs font-medium text-ink-500">Available {availabilityLabel}</p>
        </div>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <div className="section-shell mt-10 grid gap-10 lg:grid-cols-3 lg:gap-12">
        {/* Left column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Quick facts */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Bedrooms', value: bedsLabel },
              { label: 'Bathrooms', value: bathsLabel },
              { label: 'Square feet', value: squareFeetLabel },
              { label: 'Type', value: isBuilding ? 'Building' : 'Home' },
            ].map((f) => (
              <div key={f.label} className="card-premium p-4 text-center sm:p-5">
                <p className="text-xl font-semibold tracking-tight text-ink-900">{f.value}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-500">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="card-premium p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink-900">
              {isBuilding ? 'About this building' : 'About this property'}
            </h2>
            <p className="leading-relaxed text-ink-600">
              {property.description || (isBuilding ? 'Explore available units in this building.' : 'Contact us for full details on this home.')}
            </p>
          </div>

          {/* Amenities */}
          {amenityList.length > 0 && (
            <div className="card-premium p-6 sm:p-8">
              <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink-900">Amenities</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {amenityList.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                      <Icon className="h-5 w-5 text-accent-deep" />
                    </div>
                    <span className="text-sm font-medium text-ink-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Units in building */}
          {isBuilding && (
            <div className="card-premium p-6 sm:p-8">
              <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink-900">Units in this building</h2>
              {relatedUnits.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedUnits.map((unit) => (
                    <Link
                      key={unit.property_id}
                      href={`/properties/${unit.property_id}`}
                      className="block rounded-2xl border border-ink-100 p-4 transition-colors hover:border-accent-deep/40 hover:bg-ink-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink-900">{unit.name || unit.address}</p>
                          <p className="text-sm text-ink-500">{unit.address}</p>
                        </div>
                        <span className="shrink-0 font-semibold text-accent-deep">${unit.price}/mo</span>
                      </div>
                      <div className="mt-2 text-sm text-ink-500">
                        {unit.bedrooms} bd &middot; {unit.bathrooms} ba &middot; {unit.squareFeet} sq ft
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-ink-500">Contact us for current unit availability.</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Schedule a tour / ask a question — hidden on mobile in favor of the sticky bar */}
          <div className="hidden lg:block">
            <LeadCapture propertyId={property.property_id} propertyName={displayName} />
          </div>

          <div className="card-premium p-6 sm:p-7">
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-ink-900">Prefer to reach out directly?</h3>
            <div className="space-y-3">
              <a
                href="tel:5043834552"
                className="flex items-center gap-3 rounded-xl bg-accent-deep px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#336E73]"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                (504) 383-4552
              </a>
              <a
                href="mailto:arovner@campusrentalsllc.com"
                className="flex items-center gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                arovner@campusrentalsllc.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MOBILE STICKY CTA ============ */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-ink-100 bg-white/95 p-3 backdrop-blur-md lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{priceLabel}</p>
          <p className="truncate text-xs text-ink-500">{bedsLabel} bd &middot; {bathsLabel} ba</p>
        </div>
        <LeadCapture propertyId={property.property_id} propertyName={displayName} variant="modal" />
      </div>
    </div>
  );
}
