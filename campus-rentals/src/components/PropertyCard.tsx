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

export default function PropertyCard({ property }: PropertyCardProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
        className="group bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
        onClick={handleCardClick}
      >
        <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden">
          {loading ? (
            <div className="w-full h-full bg-gradient-to-br from-secondary/10 to-accent/10 flex items-center justify-center">
              <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            </div>
          ) : thumbnail ? (
            <Image
              src={thumbnail || ''}
              alt={property.address}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              placeholder="blur"
              blurDataURL="/placeholder.png"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary/10 to-accent/10 flex items-center justify-center">
              <span className="text-text text-sm sm:text-base">No image available</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Mobile preview indicator */}
          {isMobile && !showPreview && (
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-700">
              Tap to preview
            </div>
          )}
        </div>
        
        <div className="p-4 sm:p-6 bg-gradient-to-b from-white to-secondary/5">
          <h3 className="text-lg sm:text-xl font-bold text-text mb-2 group-hover:text-accent transition-colors duration-300 line-clamp-1">
            {property.address}
          </h3>
          
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4 flex-wrap">
            <div className="flex items-center text-text bg-secondary/10 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {property.bedrooms} beds
            </div>
            <div className="flex items-center text-text bg-secondary/10 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {property.bathrooms} baths
            </div>
            {property.squareFeet && (
              <div className="flex items-center text-text bg-secondary/10 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                {property.squareFeet} sq ft
              </div>
            )}
          </div>
          
          <p className="text-text/80 mb-3 sm:mb-4 line-clamp-2 text-sm sm:text-base">
            {property.description || 'Beautiful property in a prime location near campus.'}
          </p>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              ${property.price}/month
            </span>
            {!isMobile && (
              <span className="text-secondary font-medium transition-colors duration-300 flex items-center gap-1 group/link">
                View Details
                <span className="transform transition-transform duration-300 group-hover/link:translate-x-1">→</span>
              </span>
            )}
          </div>
          
          <p className="text-xs sm:text-sm text-gray-500">
            Available From: {formatAvailableDate(property.leaseTerms)}
          </p>
          
          {isMobile && (
            <div className="mt-3 flex gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreview(true);
                }}
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Quick Preview
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails();
                }}
                className="flex-1 bg-secondary text-text px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                View Details
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
                  alt={property.address}
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
              <h3 className="text-xl font-bold text-text mb-3">{property.address}</h3>
              
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center text-text bg-secondary/10 px-3 py-1 rounded-full text-sm">
                  <svg className="w-4 h-4 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {property.bedrooms} beds
                </div>
                <div className="flex items-center text-text bg-secondary/10 px-3 py-1 rounded-full text-sm">
                  <svg className="w-4 h-4 mr-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {property.bathrooms} baths
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
                {property.description || 'Beautiful property in a prime location near campus.'}
              </p>
              
              <div className="mb-4">
                <span className="text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  ${property.price}/month
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Available From: {formatAvailableDate(property.leaseTerms)}
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