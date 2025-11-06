'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/types';
import { fetchProperties, fetchPropertyPhotos, getOptimizedImageUrl } from '@/utils/clientApi';
import PropertyCard from '@/components/PropertyCard';
import { 
  MapPinIcon, 
  WifiIcon, 
  TruckIcon, 
  ShieldCheckIcon,
  AcademicCapIcon,
  HomeIcon,
  StarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function TulaneHousingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        const allProperties = await fetchProperties();
        // Filter for Tulane properties
        const tulaneProperties = allProperties.filter(p => 
          p.school === 'Tulane University' || 
          p.school === 'Loyola University' ||
          (p.address && p.address.toLowerCase().includes('new orleans'))
        );
        setProperties(tulaneProperties.slice(0, 6)); // Show top 6
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  const features = [
    {
      icon: <MapPinIcon className="w-8 h-8" />,
      title: 'Uptown Location',
      description: 'Walkable to Tulane University and Loyola University'
    },
    {
      icon: <WifiIcon className="w-8 h-8" />,
      title: 'High-Speed Internet',
      description: 'Reliable WiFi for classes, research, and streaming'
    },
    {
      icon: <TruckIcon className="w-8 h-8" />,
      title: 'Convenient Parking',
      description: 'On-street and dedicated off-street options'
    },
    {
      icon: <ShieldCheckIcon className="w-8 h-8" />,
      title: 'Enhanced Security',
      description: 'Well-lit properties in established neighborhoods'
    },
    {
      icon: <AcademicCapIcon className="w-8 h-8" />,
      title: 'Study-Friendly',
      description: 'Quiet homes with great spaces for group projects'
    },
    {
      icon: <HomeIcon className="w-8 h-8" />,
      title: 'Move-In Ready',
      description: 'Turnkey units with modern amenities'
    }
  ];

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateAgent',
            name: 'Campus Rentals LLC - Tulane Off Campus Housing',
            description: 'Premium off-campus housing near Tulane University in New Orleans',
            url: 'https://campusrentalsllc.com/tulane-housing',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'New Orleans',
              addressRegion: 'LA',
              postalCode: '70118',
              addressCountry: 'US',
            },
            areaServed: {
              '@type': 'City',
              name: 'New Orleans',
            },
            serviceType: 'Tulane Off Campus Housing',
            priceRange: '$$',
          }),
        }}
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        {/* Hero Section - SEO Optimized */}
        <div className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 to-blue-900/80 z-10" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533750500601-7c30f2298999?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
          
          <div className="relative z-20 flex flex-col justify-center items-center py-20 px-4 text-center max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <AcademicCapIcon className="w-12 h-12 text-emerald-400 mr-4" />
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Tulane Off Campus Housing
              </h1>
            </div>
              <p className="text-xl md:text-2xl text-gray-200 mb-4 max-w-3xl">
              Premium student rentals in the Tulane area of New Orleans, close to Tulane University and Loyola University
            </p>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl">
              Find the best off-campus housing near Tulane. Walkable distance to campus, fully furnished, and move-in ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="#properties" 
                className="px-8 py-4 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors duration-300 text-lg font-medium"
              >
                View Tulane Off Campus Housing
              </Link>
              <Link 
                href="/contact" 
                className="px-8 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition-colors duration-300 text-lg font-medium"
              >
                Schedule Tour
              </Link>
            </div>
          </div>
        </div>

        {/* SEO Content Section - Keyword Rich */}
        <section className="py-16 bg-gray-800/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="prose prose-invert prose-lg max-w-none">
              <h2 className="text-3xl font-bold mb-6 text-white">
                Best Tulane Off Campus Housing in New Orleans
              </h2>
              <p className="text-gray-300 mb-4 text-lg leading-relaxed">
                Looking for <strong>Tulane off campus housing</strong>? Campus Rentals LLC offers the premier selection of <strong>off-campus housing near Tulane University</strong> in New Orleans. Our <strong>student housing in the Tulane area</strong> properties are located in the Uptown neighborhood, within walking distance of the Tulane University and Loyola University campuses.
              </p>
              <p className="text-gray-300 mb-4 text-lg leading-relaxed">
                Our <strong>off campus apartments near Tulane</strong> and houses are perfect for students seeking comfortable, convenient living spaces close to campus. Whether you're looking for a <strong>Tulane area off campus rental</strong> for yourself or need <strong>off campus housing for students attending Tulane</strong> in a group, we have options to fit your needs.
              </p>
              
              <h3 className="text-2xl font-bold mt-8 mb-4 text-white">
                Why Choose Our Tulane Off Campus Housing?
              </h3>
              <ul className="text-gray-300 mb-6 space-y-3 text-lg">
                <li className="flex items-start">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Prime Uptown Location:</strong> Our <strong>off campus housing near Tulane</strong> is located in the heart of Uptown New Orleans, just blocks from the Tulane University campus. Easy walking or biking distance to classes, libraries, and campus events.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Fully Furnished:</strong> All our <strong>student apartments near Tulane</strong> come fully furnished with modern furniture, appliances, and everything you need for comfortable student living.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Luxury Living:</strong> Our <strong>off campus housing near Tulane</strong> features premium finishes, modern amenities, and high-end furnishings for a luxury student living experience.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Student-Friendly Amenities:</strong> High-speed internet, parking, laundry facilities, and more included in our <strong>off campus housing properties near Tulane</strong>.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Flexible Lease Terms:</strong> Our <strong>off campus rentals near Tulane</strong> offer lease terms that align with the academic calendar, perfect for students.</span>
                </li>
              </ul>

              <h3 className="text-2xl font-bold mt-8 mb-4 text-white">
                Finding the Perfect Tulane Off Campus Housing
              </h3>
              <p className="text-gray-300 mb-4 text-lg leading-relaxed">
                When searching for <strong>off campus housing near Tulane</strong>, location is key. Our properties are strategically located in safe, student-friendly neighborhoods in the Tulane area. Many of our <strong>off campus apartments near Tulane</strong> are within 0.5 miles of the campus, making it easy to walk to classes, the library, and campus events.
              </p>
              <p className="text-gray-300 mb-4 text-lg leading-relaxed">
                Our <strong>student housing options near Tulane</strong> range from cozy apartments perfect for individuals to spacious houses ideal for groups of friends. All our <strong>off campus housing near Tulane</strong> properties are move-in ready with modern amenities and responsive property management.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Why Choose Our Tulane Off Campus Housing?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm hover:bg-gray-900/70 transition-colors duration-300">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-emerald-400">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Properties Section */}
        <section id="properties" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-4 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Available Tulane Off Campus Housing
            </h2>
            <p className="text-center text-gray-300 mb-12 text-lg">
              Browse our selection of premium off-campus housing near Tulane University
            </p>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading Tulane off campus housing...</p>
              </div>
            ) : properties.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties.map((property) => (
                  <PropertyCard key={property.property_id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No properties available at this time.</p>
                <Link href="/properties" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
                  View All Properties
                </Link>
              </div>
            )}
            <div className="text-center mt-12">
              <Link 
                href="/properties" 
                className="px-8 py-4 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors duration-300 text-lg font-medium inline-block"
              >
                View All Tulane Off Campus Housing
              </Link>
            </div>
          </div>
        </section>

        {/* Campus Benefits */}
        <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Benefits of Living Near Tulane University
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-6 text-emerald-400">Perfect for Students in the Tulane Area</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-gray-300">Close to Audubon Park, Freret Street, and Magazine Street - perfect for studying and socializing</span>
                  </li>
                  <li className="flex items-start">
                    <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-gray-300">Short commute to classes and campus events - save time and money on transportation</span>
                  </li>
                  <li className="flex items-start">
                    <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-gray-300">Walkable neighborhoods with local coffee shops, restaurants, and grocery stores</span>
                  </li>
                  <li className="flex items-start">
                    <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-gray-300">Great options for groups and housemates - find the perfect off campus housing near Tulane for your needs</span>
                  </li>
                  <li className="flex items-start">
                    <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-gray-300">Safe, student-friendly neighborhoods with active community and campus security nearby</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
                <h4 className="text-xl font-bold mb-4 text-blue-400">Student-Friendly Perks</h4>
                <p className="text-gray-300 mb-4">Our off campus housing near Tulane is tailored specifically for students:</p>
                <ul className="space-y-2 text-gray-300">
                  <li>• Lease terms aligned to academic calendar (fall/spring/summer)</li>
                  <li>• Responsive local maintenance team</li>
                  <li>• Personalized tours and placement assistance</li>
                  <li>• Neighborhood guidance for newcomers to New Orleans</li>
                  <li>• Group housing options for friends and roommates</li>
                  <li>• Competitive student pricing and flexible payment options</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section for SEO */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Frequently Asked Questions About Tulane Off Campus Housing
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-900/50 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-3 text-emerald-400">What is the best area for off campus housing near Tulane?</h3>
                <p className="text-gray-300">The Uptown area near Tulane University is the most popular choice for off campus housing. Our properties are located within walking distance of the campus, close to Audubon Park, and in safe, student-friendly neighborhoods.</p>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-3 text-emerald-400">How far are your off campus apartments from Tulane?</h3>
                <p className="text-gray-300">Most of our properties are within 0.5 miles of the Tulane University campus, making them easily walkable or bikeable. This proximity saves you time and money on transportation while keeping you close to campus life.</p>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-3 text-emerald-400">Are your off campus rentals near Tulane furnished?</h3>
                <p className="text-gray-300">Yes! All our off campus housing properties near Tulane come fully furnished with modern furniture, appliances, and everything you need for comfortable student living. Just bring your personal items and move in.</p>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-3 text-emerald-400">Do you offer group housing for students attending Tulane?</h3>
                <p className="text-gray-300">Absolutely! We have spacious houses perfect for groups of friends or roommates. Our group housing options make it easy to live with your friends while attending school in the Tulane area.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Ready to Find Your Tulane Off Campus Housing?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Explore premium off-campus housing near Tulane University. Schedule a tour today and see why we're the best choice for students looking for housing in the Tulane area.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/contact" 
                className="px-8 py-4 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors duration-300 text-lg font-medium"
              >
                Schedule a Tour
              </Link>
              <Link 
                href="/properties" 
                className="px-8 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition-colors duration-300 text-lg font-medium"
              >
                View All Properties
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-gray-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <p className="text-gray-400 mb-2">Premium Tulane Off Campus Housing</p>
              <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Campus Rentals. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
