'use client';

import { useState, useEffect, useMemo } from 'react';
import { Property } from '@/types';
import { fetchProperties } from '@/utils/clientApi';
import PropertyCard from '@/components/PropertyCard';
import PropertyMap from '@/components/PropertyMap';

const SCHOOL_COORDINATES = {
  'Tulane University': { lat: 29.9400, lng: -90.1200 },
  'Loyola University': { lat: 29.9400, lng: -90.1200 },
  'Florida Atlantic University': { lat: 26.3700, lng: -80.1000 }
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState('Tulane University');
  const [mapCenter, setMapCenter] = useState(SCHOOL_COORDINATES['Tulane University']);
  const [sortBy, setSortBy] = useState<'bedrooms-asc' | 'bedrooms-desc' | 'price-asc' | 'price-desc' | 'date-asc'>('date-asc');
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading properties...');
        const data = await fetchProperties();
        console.log('✅ Fetched properties:', data);
        console.log('📊 Properties count:', data.length);
        if (data.length > 0) {
          console.log('📍 First property coordinates:', data[0].latitude, data[0].longitude);
        }
        setProperties(data);
      } catch (error) {
        console.error('❌ Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  const handleSchoolChange = (school: string) => {
    setSelectedSchool(school);
    setMapCenter(SCHOOL_COORDINATES[school as keyof typeof SCHOOL_COORDINATES]);
  };

  // Get unique bedroom counts from properties
  const availableBedrooms = useMemo(() => {
    const bedrooms = new Set(properties.map(p => p.bedrooms));
    return Array.from(bedrooms).sort((a, b) => a - b);
  }, [properties]);

  const sortedProperties = useMemo(() => {
    const filtered = properties.filter(property =>
      (selectedBedrooms === null || property.bedrooms === selectedBedrooms) &&
      (selectedSchool === '' || property.school === selectedSchool)
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'bedrooms-asc':
          return a.bedrooms - b.bedrooms;
        case 'bedrooms-desc':
          return b.bedrooms - a.bedrooms;
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'date-asc':
          // Sort by soonest available date first
          const dateA = new Date(a.leaseTerms);
          const dateB = new Date(b.leaseTerms);
          const isValidA = !isNaN(dateA.getTime());
          const isValidB = !isNaN(dateB.getTime());
          if (isValidA && isValidB) {
            return dateA.getTime() - dateB.getTime();
          } else if (isValidA) {
            return -1;
          } else if (isValidB) {
            return 1;
          }
          return 0;
        default:
          return 0;
      }
    });
  }, [properties, selectedBedrooms, selectedSchool, sortBy]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => {
      const newCount = prev + 6;
      // Safety check: don't exceed total properties count
      return Math.min(newCount, sortedProperties.length);
    });
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy as any);
    setVisibleCount(12); // Reset to initial count when sorting changes
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="relative h-[30vh]">
        <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent" />
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Our Properties
          </h1>
          <p className="text-2xl text-gray-300 max-w-3xl">
            Find your perfect off-campus home near your university
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-gray-300 mb-2">
                    Select School
                  </label>
                  <select
                    id="school"
                    value={selectedSchool}
                    onChange={(e) => handleSchoolChange(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all duration-300"
                  >
                    {Object.keys(SCHOOL_COORDINATES).map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-300 mb-2">
                    Bedrooms
                  </label>
                  <select
                    id="bedrooms"
                    value={selectedBedrooms === null ? '' : selectedBedrooms}
                    onChange={(e) => setSelectedBedrooms(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all duration-300"
                  >
                    <option value="">All Bedrooms</option>
                    {availableBedrooms.map(bedrooms => (
                      <option key={bedrooms} value={bedrooms}>
                        {bedrooms} {bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sort" className="block text-sm font-medium text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all duration-300"
                  >
                    <option value="date-asc">Available Date (Soonest)</option>
                    <option value="price-asc">Price (Low to High)</option>
                    <option value="price-desc">Price (High to Low)</option>
                    <option value="bedrooms-asc">Bedrooms (Low to High)</option>
                    <option value="bedrooms-desc">Bedrooms (High to Low)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="w-full text-center">
                    <span className="text-sm text-gray-400">
                      {sortedProperties.length} properties found
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              Property Locations
            </h2>
            <div className="h-[400px] rounded-lg overflow-hidden">
              <PropertyMap
                properties={sortedProperties}
                center={mapCenter}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              Available Properties
            </h2>
            {!loading && sortedProperties.length > 0 && (
              <div className="text-gray-400">
                Showing {Math.min(visibleCount, sortedProperties.length)} of {sortedProperties.length} properties
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-300 mb-8">
                {selectedSchool === 'Florida Atlantic University'
                  ? 'Properties for Florida Atlantic University coming soon!'
                  : 'No properties available at this time.'}
              </p>
            </div>
          ) : sortedProperties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-300 mb-8">
                No properties match your current filters. Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedProperties.slice(0, visibleCount).map((property) => (
                  <PropertyCard key={property.property_id} property={property} />
                ))}
              </div>
              {visibleCount < sortedProperties.length && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="px-8 py-4 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300 font-medium text-lg"
                  >
                    Load More Properties ({sortedProperties.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Have Questions?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Contact us to learn more about our properties or schedule a viewing.
          </p>
          <div className="flex justify-center gap-4">
            <a 
              href="tel:5043834552" 
              className="px-8 py-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors duration-300 text-lg font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              (504) 383-4552
            </a>
            <a 
              href="mailto:rovnerproperties@gmail.com" 
              className="px-8 py-4 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-colors duration-300 text-lg font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              rovnerproperties@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-400 mb-2">
              Powered by Abode Student Listing Service
            </p>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Campus Rentals. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 