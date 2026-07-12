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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-red-500">Error</h1>
          <p className="text-xl text-gray-300 mb-8">{error || 'Property not found'}</p>
          <Link 
            href="/properties" 
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300"
          >
            Back to Properties
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="relative h-[60vh]">
        {photos.length > 0 ? (
          <div className="absolute inset-0">
            {/* Only render the current photo to improve performance */}
            <Image
              key={photos[heroPhotoIndex]?.photoId || photos[0]?.photoId}
              src={getOptimizedImageUrl(photos[heroPhotoIndex] || photos[0])}
              alt={displayName}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              quality={90}
              unoptimized={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent z-10" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gray-800">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent z-10" />
          </div>
        )}
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-end pb-12 z-20 pointer-events-none">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent pointer-events-auto">
            {displayName}
          </h1>
          <p className="text-xl text-gray-300 pointer-events-auto">{displayAddress}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Property Details */}
          <div className="md:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                {isBuilding ? 'About This Building' : 'About This Property'}
              </h2>
              <p className="text-gray-300">
                {property.description || (isBuilding ? 'Explore available units in this building.' : '')}
              </p>
            </div>

            {/* Photo Gallery */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Photos
              </h2>
              {photos.length > 0 ? (
                <div className="relative flex flex-col items-center">
                  <div className="relative w-full aspect-square max-w-lg rounded-lg overflow-hidden bg-gray-800">
                    {photos[selectedPhotoIndex] ? (() => {
                      const currentPhoto = photos[selectedPhotoIndex];
                      const photoUrl = getOptimizedImageUrl(currentPhoto);
                      // Check if URL is from allowed domains
                      const isAllowedDomain = 
                        photoUrl.includes('d1m1syk7iv23tg.cloudfront.net') ||
                        photoUrl.includes('abodebucket.s3.us-east-2.amazonaws.com') ||
                        photoUrl.includes('campusrentalswebsitebucket.s3.us-east-1.amazonaws.com');
                      
                      return (
                        <Image
                          key={`photo-${selectedPhotoIndex}-${currentPhoto.photoId || currentPhoto.photoLink || Date.now()}`}
                          src={photoUrl}
                          alt={`${displayName} - Photo ${selectedPhotoIndex + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={selectedPhotoIndex === 0}
                          quality={90}
                          unoptimized={!isAllowedDomain}
                          onError={(e) => {
                            console.error('Image failed to load:', photoUrl, e);
                            // Fallback to regular img tag if Next.js Image fails
                            const target = e.target as HTMLImageElement;
                            if (target && target.parentElement) {
                              const img = document.createElement('img');
                              img.src = photoUrl;
                              img.alt = `${displayName} - Photo ${selectedPhotoIndex + 1}`;
                              img.className = 'w-full h-full object-cover';
                              target.parentElement.replaceChild(img, target);
                            }
                          }}
                        />
                      );
                    })() : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        Loading photo...
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <button
                      onClick={() => {
                        const newIndex = selectedPhotoIndex === 0 ? photos.length - 1 : selectedPhotoIndex - 1;
                        setSelectedPhotoIndex(newIndex);
                        // Preload next/prev photo
                        if (photos[newIndex]) {
                          const img = new window.Image();
                          img.src = getOptimizedImageUrl(photos[newIndex]);
                        }
                      }}
                      className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-accent/80 transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-gray-300">
                      {selectedPhotoIndex + 1} / {photos.length}
                    </span>
                    <button
                      onClick={() => {
                        const newIndex = selectedPhotoIndex === photos.length - 1 ? 0 : selectedPhotoIndex + 1;
                        setSelectedPhotoIndex(newIndex);
                        // Preload next/prev photo
                        if (photos[newIndex]) {
                          const img = new window.Image();
                          img.src = getOptimizedImageUrl(photos[newIndex]);
                        }
                      }}
                      className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-accent/80 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>No photos available for this property.</p>
                </div>
              )}
            </div>

            {isBuilding && (
              <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  Units In This Building
                </h2>
                {relatedUnits.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {relatedUnits.map((unit) => (
                      <Link
                        key={unit.property_id}
                        href={`/properties/${unit.property_id}`}
                        className="block rounded-lg border border-gray-700 bg-gray-900/40 p-4 hover:border-accent/60 hover:bg-gray-900/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-white">
                              {unit.name || unit.address}
                            </p>
                            <p className="text-sm text-gray-400">{unit.address}</p>
                          </div>
                          <span className="text-accent font-semibold">
                            ${unit.price}/month
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-400">
                          {unit.bedrooms} bd · {unit.bathrooms} ba · {unit.squareFeet} sq ft
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Contact us for current unit availability.</p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Info */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                {isBuilding ? 'Building Details' : 'Property Details'}
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Price</span>
                  <span className="text-xl font-bold text-accent">{priceLabel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Bedrooms</span>
                  <span className="text-xl font-bold">{bedsLabel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Bathrooms</span>
                  <span className="text-xl font-bold">{bathsLabel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Square Feet</span>
                  <span className="text-xl font-bold">{squareFeetLabel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Available From</span>
                  <span className="text-xl font-bold">{availabilityLabel}</span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Amenities
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {amenities && (
                  <>
                    {amenities.fullyFurnished && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <HomeIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Fully Furnished</span>
                      </div>
                    )}
                    {amenities.pool && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <SparklesIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Pool</span>
                      </div>
                    )}
                    {amenities.powderRoom && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <BoltIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Powder Room</span>
                      </div>
                    )}
                    {amenities.driveway && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <TruckIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Driveway</span>
                      </div>
                    )}
                    {amenities.laundryUnit && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <WrenchIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Laundry Unit</span>
                      </div>
                    )}
                    {amenities.centralAc && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <CloudIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Central AC</span>
                      </div>
                    )}
                    {amenities.backyard && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <SparklesIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Backyard</span>
                      </div>
                    )}
                    {amenities.fireplace && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <FireIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Fireplace</span>
                      </div>
                    )}
                    {amenities.petFriendly && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <HeartIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Pet Friendly</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Schedule a tour / ask a question */}
            <LeadCapture propertyId={property.property_id} propertyName={displayName} />

            {/* Direct contact */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Prefer to reach out directly?
              </h2>
              <div className="space-y-4">
                <a
                  href="tel:5043834552"
                  className="flex items-center gap-3 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  (504) 383-4552
                </a>
                <a
                  href="mailto:rovnerproperties@gmail.com"
                  className="flex items-center gap-3 px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  rovnerproperties@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 