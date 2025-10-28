'use client';

import React from 'react';
import Link from 'next/link';
import { 
  MapPinIcon, 
  WifiIcon, 
  TruckIcon, 
  ShieldCheckIcon,
  AcademicCapIcon,
  HomeIcon,
  StarIcon
} from '@heroicons/react/24/outline';

export default function TulaneHousingPage() {
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

  const properties = [
    {
      name: '2422 Joseph St.',
      price: '$5,000/month',
      bedrooms: '4 Bedrooms',
      distance: '0.6 miles to Tulane',
      image: '/placeholder.png',
      features: ['Updated Kitchen', 'Washer/Dryer', 'Backyard', 'Parking']
    },
    {
      name: '7506 Zimple St',
      price: '$4,200/month',
      bedrooms: '3 Bedrooms',
      distance: '0.4 miles to Tulane',
      image: '/placeholder.png',
      features: ['Hardwood Floors', 'Porch', 'Central A/C', 'Pet Friendly']
    },
    {
      name: '2424 Joseph St',
      price: '$4,800/month',
      bedrooms: '4 Bedrooms',
      distance: '0.6 miles to Tulane',
      image: '/placeholder.png',
      features: ['Spacious Layout', 'Updated Baths', 'Dishwasher', 'Parking']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 to-blue-900/80 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533750500601-7c30f2298999?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        
        <div className="relative z-20 flex flex-col justify-center items-center py-20 px-4 text-center max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <AcademicCapIcon className="w-12 h-12 text-emerald-400 mr-4" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Housing Near Tulane
            </h1>
          </div>
          <p className="text-2xl text-gray-200 mb-8 max-w-3xl">
            Premium student rentals near Tulane University and Loyola University
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="#properties" 
              className="px-8 py-4 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors duration-300 text-lg font-medium"
            >
              View Properties Near Tulane
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

      {/* Why Choose Section */}
      <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Why Choose Housing Near Tulane?
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
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Properties Near Tulane
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {properties.map((property, index) => (
              <div key={index} className="bg-gray-900/50 rounded-xl overflow-hidden backdrop-blur-sm hover:bg-gray-900/70 transition-colors duration-300">
                <div className="h-48 bg-gray-700 flex items-center justify-center">
                  <img 
                    src={property.image} 
                    alt={property.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.png'; }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-emerald-400">{property.name}</h3>
                  <div className="flex items-center mb-2">
                    <MapPinIcon className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-sm text-gray-300">{property.distance}</span>
                  </div>
                  <div className="flex items-center mb-4">
                    <HomeIcon className="w-4 h-4 text-emerald-400 mr-2" />
                    <span className="text-sm text-gray-300">{property.bedrooms}</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mb-4">{property.price}</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {property.features.map((feature, featureIndex) => (
                      <span key={featureIndex} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <Link 
                    href="/contact" 
                    className="w-full bg-emerald-500 text-black py-2 px-4 rounded-lg hover:bg-emerald-400 transition-colors duration-300 text-center block font-medium"
                  >
                    Schedule Tour
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campus Benefits */}
      <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Tulane Area Benefits
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-emerald-400">Perfect for Uptown Students</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Close to Audubon Park, Freret Street, and Magazine Street</span>
                </li>
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Short commute to classes and campus events</span>
                </li>
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Walkable neighborhoods and local coffee shops</span>
                </li>
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Great options for groups and housemates</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h4 className="text-xl font-bold mb-4 text-blue-400">Student-Friendly Perks</h4>
              <p className="text-gray-300 mb-4">Tailored for Tulane and Loyola students:</p>
              <ul className="space-y-2 text-gray-300">
                <li>• Lease terms aligned to academic calendar</li>
                <li>• Responsive local maintenance</li>
                <li>• Personalized tours and placement</li>
                <li>• Neighborhood guidance for newcomers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Ready to Find Housing Near Tulane?
          </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Explore premium rentals minutes from campus.
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
            <p className="text-gray-400 mb-2">Premium Housing Near Tulane</p>
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Campus Rentals. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
